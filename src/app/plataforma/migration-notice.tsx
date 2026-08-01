import { CopySql } from '@/app/admin/tenants/[id]/aplicativo/copy-sql';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';

// Mesmo padrão da aba Aplicativo: quando a migração não rodou, a própria tela
// entrega o SQL. Melhor do que um erro que só quem escreveu o código entende.

const SQL = `-- Painel da plataforma: super administrador e faturamento dos provedores.

create table if not exists platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now()
);
alter table platform_admins enable row level security;

create table if not exists tenant_billing (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  monthly_amount_cents integer not null default 0 check (monthly_amount_cents >= 0),
  billing_day smallint not null default 10 check (billing_day between 1 and 28),
  status text not null default 'trial'
    check (status in ('trial', 'active', 'past_due', 'cancelled')),
  trial_ends_at date,
  started_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table tenant_billing enable row level security;

create table if not exists tenant_charges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
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

insert into tenant_billing (tenant_id, status, monthly_amount_cents)
select id, case when status = 'active' then 'active' else 'trial' end, 0
from tenants
on conflict (tenant_id) do nothing;

-- Troque o e-mail se o super administrador for outro.
insert into platform_admins (user_id, email)
select id, email from auth.users where lower(email) = 'gustavo@iconestudio.com.br'
on conflict (user_id) do nothing;`;

export function MigrationNotice() {
  return (
    <div className="p-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Falta rodar a migração do painel</CardTitle>
          <CardSubtitle>
            As tabelas de super administrador e faturamento ainda não existem neste banco
          </CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-fg-2 leading-relaxed">
            Copie o SQL abaixo, cole no SQL Editor do Supabase e rode. Depois recarregue esta
            página. O arquivo também está versionado em{' '}
            <code className="font-mono text-xs">
              supabase/migrations/20260801_009_platform_admin.sql
            </code>
            .
          </p>
          <CopySql sql={SQL} />
        </CardBody>
      </Card>
    </div>
  );
}
