-- Painel da plataforma: o super administrador do LinkHub.
--
-- É outro produto dentro do mesmo código. O painel do provedor (/admin) cuida
-- de UM provedor, e quem entra lá é o cliente. Este cuida de TODOS: cria
-- provedor, gera senha, suspende acesso e cobra a mensalidade. Por isso a
-- permissão não é papel dentro de tenant_admins — é uma tabela à parte, para
-- que nenhum caminho de escrita do painel do provedor consiga chegar aqui.
--
-- Nenhuma das três tabelas tem policy: acesso só pela service role, no
-- servidor. Chave anônima no navegador não lê nem escreve nada disto.

create table if not exists platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now()
);

alter table platform_admins enable row level security;

-- Assinatura do provedor com a plataforma. Uma linha por provedor.
create table if not exists tenant_billing (
  tenant_id uuid primary key references tenants(id) on delete cascade,

  -- Quanto o provedor paga por mês e em que dia vence. Em centavos, como
  -- `invoices.amount_cents`: dinheiro em float é erro de arredondamento
  -- esperando o momento certo.
  monthly_amount_cents integer not null default 0 check (monthly_amount_cents >= 0),
  billing_day smallint not null default 10 check (billing_day between 1 and 28),

  -- 'trial' não cobra; 'past_due' é quem tem cobrança vencida.
  status text not null default 'trial'
    check (status in ('trial', 'active', 'past_due', 'cancelled')),

  trial_ends_at date,
  started_at date,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tenant_billing enable row level security;

-- Mensalidades emitidas para o provedor. Uma por mês de referência, e é o
-- unique que garante isso: gerar as cobranças do mês duas vezes não duplica.
create table if not exists tenant_charges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,

  -- Sempre o dia 1 do mês cobrado.
  reference_month date not null,
  amount_cents integer not null check (amount_cents >= 0),
  due_date date not null,

  status text not null default 'open'
    check (status in ('open', 'paid', 'overdue', 'cancelled')),
  paid_at timestamptz,
  method text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (tenant_id, reference_month)
);

alter table tenant_charges enable row level security;

create index if not exists idx_tenant_charges_tenant on tenant_charges (tenant_id, reference_month desc);
create index if not exists idx_tenant_charges_cobranca on tenant_charges (status, due_date);

create trigger trg_tenant_billing_updated before update on tenant_billing
  for each row execute function set_updated_at();
create trigger trg_tenant_charges_updated before update on tenant_charges
  for each row execute function set_updated_at();

-- Toda assinatura que já existe começa em trial, para o painel não abrir
-- vazio nem inventar cobrança de quem nunca combinou preço.
insert into tenant_billing (tenant_id, status, monthly_amount_cents)
select id, case when status = 'active' then 'active' else 'trial' end, 0
from tenants
on conflict (tenant_id) do nothing;

-- O primeiro super administrador. O usuário precisa existir em auth.users
-- antes; se ainda não existir, esta linha não faz nada e o acesso é
-- concedido rodando `node scripts/super-admin.mjs <e-mail>`.
insert into platform_admins (user_id, email)
select id, email from auth.users where lower(email) = 'gustavo@iconestudio.com.br'
on conflict (user_id) do nothing;
