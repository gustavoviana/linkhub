-- ════════════════════════════════════════════════════════════════════
-- LinkHub — script consolidado (init + RLS + storage + RPC + seed)
-- Versão para Supabase CLOUD (helpers RLS no schema public, não auth).
-- Idempotente: pode rodar quantas vezes quiser.
-- ════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════
-- 0) CLEANUP (remove qualquer execução parcial anterior)
-- ════════════════════════════════════════════════════════════════════

drop table if exists audit_log        cascade;
drop table if exists support_tickets  cascade;
drop table if exists invoices         cascade;
drop table if exists contracts        cascade;
drop table if exists plans            cascade;
drop table if exists customers        cascade;
drop table if exists tenant_admins    cascade;
drop table if exists tenants          cascade;

drop type if exists tenant_layout   cascade;
drop type if exists tenant_status   cascade;
drop type if exists erp_type        cascade;
drop type if exists admin_role      cascade;
drop type if exists invoice_status  cascade;
drop type if exists contract_status cascade;

drop function if exists public.user_tenant_ids()             cascade;
drop function if exists public.user_customer_id(uuid)        cascade;
drop function if exists public.has_tenant_access(uuid)       cascade;
drop function if exists public.create_tenant_with_owner(text, text, text, text) cascade;
drop function if exists public.set_updated_at()              cascade;

-- policies de storage podem ter sido criadas em rodada anterior
drop policy if exists "tenant-assets: public read"   on storage.objects;
drop policy if exists "tenant-assets: admins write"  on storage.objects;
drop policy if exists "tenant-assets: admins update" on storage.objects;
drop policy if exists "tenant-assets: admins delete" on storage.objects;


-- ════════════════════════════════════════════════════════════════════
-- 1) SCHEMA (tenants, customers, contracts, invoices, ...)
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create type tenant_layout as enum ('v1', 'v2', 'v3');
create type tenant_status as enum ('active', 'suspended', 'trial', 'cancelled');
create type erp_type as enum ('mock', 'ixc', 'sgp', 'hubsoft', 'mk_solutions');
create type admin_role as enum ('owner', 'admin', 'support', 'viewer');
create type invoice_status as enum ('open', 'paid', 'overdue', 'cancelled', 'partial');
create type contract_status as enum ('active', 'suspended', 'cancelled', 'pending');

create table tenants (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'),
  name text not null,
  legal_name text,
  cnpj text,
  status tenant_status not null default 'trial',
  layout tenant_layout not null default 'v1',
  primary_color text not null default '#6d4ae0',
  accent_color text not null default '#0aa5c0',
  dark_mode_default boolean not null default false,
  -- Central exige senha além do CPF? Padrão do mercado é só CPF.
  portal_require_password boolean not null default false,
  logo_url text,
  favicon_url text,
  support_phone text,
  support_whatsapp text,
  support_email text,
  erp_type erp_type not null default 'mock',
  erp_config jsonb not null default '{}'::jsonb,
  erp_last_sync_at timestamptz,
  erp_last_sync_status text,
  erp_last_sync_error text,
  custom_domain text unique,
  custom_domain_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tenants_slug on tenants(slug);
create index idx_tenants_custom_domain on tenants(custom_domain) where custom_domain is not null;

create table tenant_admins (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role admin_role not null default 'admin',
  invited_by uuid references auth.users(id),
  invited_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(tenant_id, user_id)
);
create index idx_tenant_admins_user on tenant_admins(user_id);
create index idx_tenant_admins_tenant on tenant_admins(tenant_id);

create table customers (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  external_id text,
  user_id uuid references auth.users(id) on delete set null,
  cpf_cnpj text,
  name text not null,
  email text,
  phone text,
  whatsapp text,
  address_street text,
  address_number text,
  address_complement text,
  address_district text,
  address_city text,
  address_state text,
  address_zip text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, cpf_cnpj),
  unique(tenant_id, external_id)
);
create index idx_customers_tenant on customers(tenant_id);
create index idx_customers_user on customers(user_id) where user_id is not null;
create index idx_customers_cpf on customers(tenant_id, cpf_cnpj);

create table plans (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  external_id text,
  name text not null,
  description text,
  down_mbps integer,
  up_mbps integer,
  price_cents integer not null default 0,
  fidelity_months integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(tenant_id, external_id)
);
create index idx_plans_tenant on plans(tenant_id);

create table contracts (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  plan_id uuid references plans(id) on delete set null,
  external_id text,
  status contract_status not null default 'active',
  pppoe_user text,
  due_day integer check (due_day between 1 and 31),
  monthly_price_cents integer,
  installation_address text,
  activated_at timestamptz,
  cancelled_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, external_id)
);
create index idx_contracts_tenant on contracts(tenant_id);
create index idx_contracts_customer on contracts(customer_id);

create table invoices (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  external_id text,
  reference_month date,
  due_date date not null,
  amount_cents integer not null,
  status invoice_status not null default 'open',
  pix_qr_code text,
  pix_copy_paste text,
  boleto_line text,
  boleto_pdf_url text,
  nfe_url text,
  paid_at timestamptz,
  paid_amount_cents integer,
  paid_method text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, external_id)
);
create index idx_invoices_tenant on invoices(tenant_id);
create index idx_invoices_contract on invoices(contract_id);
create index idx_invoices_status on invoices(tenant_id, status);
create index idx_invoices_due on invoices(tenant_id, due_date);

create table support_tickets (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  contract_id uuid references contracts(id) on delete set null,
  external_id text,
  protocol text,
  subject text not null,
  category text,
  status text not null default 'open',
  priority text not null default 'normal',
  channel text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_tickets_tenant on support_tickets(tenant_id);
create index idx_tickets_customer on support_tickets(customer_id);

create table audit_log (
  id bigint generated always as identity primary key,
  tenant_id uuid references tenants(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_tenant_time on audit_log(tenant_id, created_at desc);

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_tenants_updated  before update on tenants  for each row execute function public.set_updated_at();
create trigger trg_customers_updated before update on customers for each row execute function public.set_updated_at();
create trigger trg_contracts_updated before update on contracts for each row execute function public.set_updated_at();
create trigger trg_invoices_updated  before update on invoices  for each row execute function public.set_updated_at();


-- ════════════════════════════════════════════════════════════════════
-- 2) RLS (Row-Level Security)
-- Helpers no schema PUBLIC (Supabase cloud não permite criar em auth).
-- ════════════════════════════════════════════════════════════════════

create or replace function public.user_tenant_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from public.tenant_admins where user_id = auth.uid();
$$;

create or replace function public.user_customer_id(p_tenant uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.customers
  where tenant_id = p_tenant and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.has_tenant_access(p_tenant uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tenant_admins where user_id = auth.uid() and tenant_id = p_tenant
    union all
    select 1 from public.customers where user_id = auth.uid() and tenant_id = p_tenant
  );
$$;

-- Tenants onde o usuário pode gerenciar a equipe. Existe como função
-- security definer (e não como subquery dentro da policy) porque uma policy
-- de tenant_admins que consulta tenant_admins faz o Postgres abortar com
-- 42P17 (infinite recursion).
create or replace function public.user_managed_tenant_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from public.tenant_admins
  where user_id = auth.uid() and role in ('owner', 'admin');
$$;

create or replace function public.user_customer_tenant_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from public.customers where user_id = auth.uid();
$$;

alter table tenants            enable row level security;
alter table tenant_admins      enable row level security;
alter table customers          enable row level security;
alter table plans              enable row level security;
alter table contracts          enable row level security;
alter table invoices           enable row level security;
alter table support_tickets    enable row level security;
alter table audit_log          enable row level security;

-- A tabela crua guarda erp_config (credenciais do ERP), então só quem tem
-- vínculo com o provedor lê. O app resolve tenant por service role; o
-- branding público sai pela view tenants_public, mais abaixo.
create policy "tenants: members read" on tenants
  for select to authenticated
  using (
    id in (select public.user_tenant_ids())
    or id in (select public.user_customer_tenant_ids())
  );

create policy "tenants: admins can update" on tenants
  for update to authenticated
  using (id in (select public.user_tenant_ids()))
  with check (id in (select public.user_tenant_ids()));

-- Branding visível sem login (o portal aplica o tema antes do cliente
-- autenticar). View sem security_invoker de propósito: roda como owner e
-- por isso enxerga a tabela apesar da policy acima.
create or replace view public.tenants_public as
  select id, slug, name, status, layout,
         primary_color, accent_color, dark_mode_default,
         logo_url, favicon_url,
         support_phone, support_whatsapp, support_email,
         custom_domain, custom_domain_verified
  from public.tenants;

grant select on public.tenants_public to anon, authenticated;

-- Um admin de tenant só edita aparência e contato. slug, status, domínio e
-- credenciais de ERP mudam apenas por service role (route handlers/jobs) —
-- sem isso, o navegador consegue se auto-ativar e marcar domínio como
-- verificado. Sem security definer: current_user precisa ser quem chamou.
create or replace function public.protect_tenant_columns() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  new.slug                   := old.slug;
  new.status                 := old.status;
  new.custom_domain          := old.custom_domain;
  new.custom_domain_verified := old.custom_domain_verified;
  new.erp_type               := old.erp_type;
  new.erp_config             := old.erp_config;
  new.created_at             := old.created_at;
  return new;
end;
$$;

-- "protect" antes de "updated": triggers BEFORE rodam em ordem alfabética.
create trigger trg_tenants_protect before update on tenants
  for each row execute function public.protect_tenant_columns();

create policy "tenant_admins: owners/admins read" on tenant_admins
  for select to authenticated
  using (tenant_id in (select public.user_tenant_ids()));

create policy "tenant_admins: owners manage" on tenant_admins
  for all to authenticated
  using (tenant_id in (select public.user_managed_tenant_ids()))
  with check (tenant_id in (select public.user_managed_tenant_ids()));

create policy "customers: tenant admins all" on customers
  for all to authenticated
  using (tenant_id in (select public.user_tenant_ids()))
  with check (tenant_id in (select public.user_tenant_ids()));

create policy "customers: self read" on customers
  for select to authenticated
  using (user_id = auth.uid());

create policy "customers: self update limited" on customers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "plans: public read active" on plans
  for select using (active = true);

create policy "plans: tenant admins manage" on plans
  for all to authenticated
  using (tenant_id in (select public.user_tenant_ids()))
  with check (tenant_id in (select public.user_tenant_ids()));

create policy "contracts: tenant admins all" on contracts
  for all to authenticated
  using (tenant_id in (select public.user_tenant_ids()))
  with check (tenant_id in (select public.user_tenant_ids()));

create policy "contracts: customer own" on contracts
  for select to authenticated
  using (
    customer_id in (
      select id from customers where user_id = auth.uid()
    )
  );

create policy "invoices: tenant admins all" on invoices
  for all to authenticated
  using (tenant_id in (select public.user_tenant_ids()))
  with check (tenant_id in (select public.user_tenant_ids()));

create policy "invoices: customer own" on invoices
  for select to authenticated
  using (
    contract_id in (
      select c.id from contracts c
      join customers cu on cu.id = c.customer_id
      where cu.user_id = auth.uid()
    )
  );

create policy "tickets: tenant admins all" on support_tickets
  for all to authenticated
  using (tenant_id in (select public.user_tenant_ids()))
  with check (tenant_id in (select public.user_tenant_ids()));

create policy "tickets: customer own" on support_tickets
  for select to authenticated
  using (
    customer_id in (select id from customers where user_id = auth.uid())
  );

create policy "tickets: customer create own" on support_tickets
  for insert to authenticated
  with check (
    customer_id in (select id from customers where user_id = auth.uid())
  );

create policy "audit: tenant admins read" on audit_log
  for select to authenticated
  using (tenant_id in (select public.user_tenant_ids()));


-- ════════════════════════════════════════════════════════════════════
-- 3) STORAGE (bucket de logos / favicons dos provedores)
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('tenant-assets', 'tenant-assets', true)
on conflict (id) do nothing;

create policy "tenant-assets: public read"
on storage.objects for select
using (bucket_id = 'tenant-assets');

create policy "tenant-assets: admins write"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'tenant-assets'
  and (storage.foldername(name))[1] = 'tenants'
  and (storage.foldername(name))[2]::uuid in (select public.user_tenant_ids())
);

create policy "tenant-assets: admins update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'tenant-assets'
  and (storage.foldername(name))[1] = 'tenants'
  and (storage.foldername(name))[2]::uuid in (select public.user_tenant_ids())
);

create policy "tenant-assets: admins delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'tenant-assets'
  and (storage.foldername(name))[1] = 'tenants'
  and (storage.foldername(name))[2]::uuid in (select public.user_tenant_ids())
);


-- ════════════════════════════════════════════════════════════════════
-- 4) RPC: create_tenant_with_owner (usado no signup)
-- ════════════════════════════════════════════════════════════════════

create or replace function public.create_tenant_with_owner(
  p_slug text,
  p_name text,
  p_legal_name text default null,
  p_cnpj text default null
)
returns tenants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant tenants;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  p_slug := lower(trim(p_slug));
  if p_slug = any(array['www','admin','app','portal','api','auth','login','signup','dashboard','assets','static']) then
    raise exception 'slug % is reserved', p_slug using errcode = '22023';
  end if;

  insert into tenants (slug, name, legal_name, cnpj, status)
  values (p_slug, p_name, p_legal_name, p_cnpj, 'trial')
  returning * into v_tenant;

  insert into tenant_admins (tenant_id, user_id, role, accepted_at)
  values (v_tenant.id, auth.uid(), 'owner', now());

  insert into audit_log (tenant_id, actor_user_id, action, resource_type, resource_id)
  values (v_tenant.id, auth.uid(), 'tenant.created', 'tenant', v_tenant.id::text);

  return v_tenant;
end;
$$;

grant execute on function public.create_tenant_with_owner(text, text, text, text) to authenticated;


-- ════════════════════════════════════════════════════════════════════
-- 5) SEED: tenant demo + planos
-- ════════════════════════════════════════════════════════════════════

insert into tenants (slug, name, legal_name, status, layout, primary_color, accent_color, erp_type, support_phone, support_whatsapp, support_email)
values (
  'demo', 'NetVale Telecom Demo', 'NetVale Telecom Comunicações LTDA',
  'active', 'v1', '#6d4ae0', '#0aa5c0', 'mock',
  '(54) 3220-0000', '5554998800000', 'contato@netvale.com.br'
)
on conflict (slug) do nothing;

with t as (select id from tenants where slug = 'demo')
insert into plans (tenant_id, external_id, name, description, down_mbps, up_mbps, price_cents, fidelity_months)
select t.id, p.external_id, p.name, p.description, p.down, p.up, p.price, p.fid from t,
(values
  ('PL-100', 'Fibra 100', 'Plano residencial 100 Mbps', 100, 50,  8990, 12),
  ('PL-300', 'Fibra 300', 'Plano residencial 300 Mbps', 300, 150, 10990, 12),
  ('PL-500', 'Fibra 500', 'Plano residencial 500 Mbps', 500, 250, 12990, 12),
  ('PL-1G',  'Fibra 1G',  'Plano residencial 1 Gbps',  1000, 500, 15990, 24),
  ('PL-EMP', 'Empresarial', 'Plano dedicado empresarial', 500, 500, 39900, 0)
) as p(external_id, name, description, down, up, price, fid)
on conflict do nothing;
