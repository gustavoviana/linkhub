-- Notificações push da central — 03/10/2026.
--
-- O assinante autoriza no aparelho (app Android ou navegador), e o provedor
-- manda avisos de fatura por regra ("3 dias antes", "no dia", "2 dias
-- depois") ou mensagens avulsas, agora ou agendadas. Quem envia é o
-- /api/cron/push, chamado a cada 15 minutos pelo pg_cron (fim do arquivo).
--
-- Nenhuma tabela tem policy: tudo passa pelo servidor com service role,
-- como tenant_billing. O endpoint de push de um aparelho é credencial —
-- quem o tem manda notificação para aquela pessoa — e não pode ser lido
-- pela chave anônima do navegador.
--
-- Pode ser colado direto no SQL Editor. Idempotente.

-- ════════════════════════════════════════════════════════════════════
-- Aparelhos que aceitaram receber avisos
-- ════════════════════════════════════════════════════════════════════

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,

  -- O endereço do serviço de push (FCM, Mozilla, Apple). Único no mundo:
  -- outro assinante que entre no mesmo aparelho assume a linha.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,

  created_at timestamptz not null default now(),
  last_sent_at timestamptz
);

create index if not exists idx_push_subs_customer on push_subscriptions (customer_id);
create index if not exists idx_push_subs_tenant on push_subscriptions (tenant_id);
alter table push_subscriptions enable row level security;

-- ════════════════════════════════════════════════════════════════════
-- Regras de aviso de fatura
-- ════════════════════════════════════════════════════════════════════

create table if not exists push_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,

  -- Dias em relação ao vencimento: -3 = três dias antes, 0 = no dia,
  -- 2 = dois dias depois.
  days_offset smallint not null check (days_offset between -30 and 60),
  -- Hora cheia, horário de Brasília. Nada de cobrança de madrugada.
  send_hour smallint not null default 9 check (send_hour between 8 and 20),

  title text not null check (char_length(title) between 1 and 50),
  body text not null check (char_length(body) between 1 and 150),
  enabled boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_rules_tenant on push_rules (tenant_id);
alter table push_rules enable row level security;

drop trigger if exists trg_push_rules_updated on push_rules;
create trigger trg_push_rules_updated before update on push_rules
  for each row execute function set_updated_at();

-- ════════════════════════════════════════════════════════════════════
-- Envios: uma linha por mensagem manual, e uma por regra por dia
-- ════════════════════════════════════════════════════════════════════

create table if not exists push_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,

  kind text not null check (kind in ('manual', 'rule')),
  rule_id uuid references push_rules(id) on delete set null,
  -- Dia (Brasília) da rodada de uma regra. Junta no histórico todos os avisos
  -- que a regra mandou naquele dia, em vez de uma linha por fatura.
  run_date date,

  title text not null,
  body text not null,
  -- Para onde o toque leva, no caso manual: '/', '/fatura', '/suporte'.
  url text not null default '/',

  status text not null default 'scheduled'
    check (status in ('scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),

  unique (rule_id, run_date)
);

create index if not exists idx_push_campaigns_tenant on push_campaigns (tenant_id, created_at desc);
create index if not exists idx_push_campaigns_fila on push_campaigns (status, scheduled_at)
  where status = 'scheduled';
alter table push_campaigns enable row level security;

-- ════════════════════════════════════════════════════════════════════
-- Entregas: uma linha por aparelho que recebeu
-- ════════════════════════════════════════════════════════════════════

create table if not exists push_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references push_campaigns(id) on delete cascade,
  subscription_id uuid references push_subscriptions(id) on delete set null,
  invoice_id uuid references invoices(id) on delete set null,

  -- A trava contra aviso repetido. "r:<regra>:<fatura>:<aparelho>" garante
  -- um aviso por fatura por regra, por mais que o cron rode; "c:<envio>:
  -- <aparelho>", um por mensagem manual. Coluna e não índice parcial porque
  -- o upsert do PostgREST só sabe usar constraint inteira.
  dedupe_key text not null unique,

  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  clicked_at timestamptz
);

create index if not exists idx_push_deliveries_campaign on push_deliveries (campaign_id);
alter table push_deliveries enable row level security;

-- Números do histórico, contados na hora em vez de mantidos em contador:
-- duas rodadas do cron ao mesmo tempo nunca desencontram a soma.
create or replace view push_campaign_stats as
  select
    campaign_id,
    count(*) filter (where status = 'sent') as sent,
    count(*) filter (where status = 'failed') as failed,
    count(*) filter (where clicked_at is not null) as clicked
  from push_deliveries
  group by campaign_id;

revoke all on push_campaign_stats from anon, authenticated;

-- ════════════════════════════════════════════════════════════════════
-- Agendador: chama o LinkHub a cada 15 minutos
-- ════════════════════════════════════════════════════════════════════
--
-- ANTES de rodar este bloco, guarde no Vault o mesmo valor que está em
-- CRON_SECRET na Vercel (uma vez só):
--
--   select vault.create_secret('<o CRON_SECRET>', 'linkhub_cron_secret');

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('linkhub-push')
where exists (select 1 from cron.job where jobname = 'linkhub-push');

select cron.schedule(
  'linkhub-push',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://app.linkhub.api.br/api/cron/push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'linkhub_cron_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);
