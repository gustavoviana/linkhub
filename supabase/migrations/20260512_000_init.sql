-- LinkHub schema: multi-tenant ISP customer portal platform.
-- Tenants = provedores (cada um com seu subdomínio, branding e ERP).
-- Customers = clientes finais do provedor (acessam o portal).
-- Tenant admins = usuários do provedor que gerenciam o portal.

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ════════════════════════════════════════════════════════════════════
-- ENUMS
-- ════════════════════════════════════════════════════════════════════

create type tenant_layout as enum ('v1', 'v2', 'v3');
create type tenant_status as enum ('active', 'suspended', 'trial', 'cancelled');
create type erp_type as enum ('mock', 'ixc', 'sgp', 'hubsoft', 'mk_solutions');
create type admin_role as enum ('owner', 'admin', 'support', 'viewer');
create type invoice_status as enum ('open', 'paid', 'overdue', 'cancelled', 'partial');
create type contract_status as enum ('active', 'suspended', 'cancelled', 'pending');

-- ════════════════════════════════════════════════════════════════════
-- TENANTS (provedores)
-- ════════════════════════════════════════════════════════════════════

create table tenants (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'),
  name text not null,
  legal_name text,
  cnpj text,
  status tenant_status not null default 'trial',

  -- branding
  layout tenant_layout not null default 'v1',
  primary_color text not null default '#6d4ae0',
  accent_color text not null default '#0aa5c0',
  dark_mode_default boolean not null default false,
  logo_url text,
  favicon_url text,

  -- support contact (mostrado no portal)
  support_phone text,
  support_whatsapp text,
  support_email text,

  -- ERP
  erp_type erp_type not null default 'mock',
  erp_config jsonb not null default '{}'::jsonb,
  erp_last_sync_at timestamptz,
  erp_last_sync_status text,
  erp_last_sync_error text,

  -- domínio custom opcional
  custom_domain text unique,
  custom_domain_verified boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tenants_slug on tenants(slug);
create index idx_tenants_custom_domain on tenants(custom_domain) where custom_domain is not null;

-- ════════════════════════════════════════════════════════════════════
-- TENANT ADMINS (usuários do provedor)
-- ════════════════════════════════════════════════════════════════════

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

-- ════════════════════════════════════════════════════════════════════
-- CUSTOMERS (clientes finais)
-- ════════════════════════════════════════════════════════════════════

create table customers (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  external_id text,        -- ID do cliente no ERP do provedor
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

-- ════════════════════════════════════════════════════════════════════
-- PLANS (planos comerciais — cache do ERP)
-- ════════════════════════════════════════════════════════════════════

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

-- ════════════════════════════════════════════════════════════════════
-- CONTRACTS (contratos)
-- ════════════════════════════════════════════════════════════════════

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

-- ════════════════════════════════════════════════════════════════════
-- INVOICES (faturas)
-- ════════════════════════════════════════════════════════════════════

create table invoices (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  external_id text,

  reference_month date,        -- mês de referência (yyyy-mm-01)
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

-- ════════════════════════════════════════════════════════════════════
-- SUPPORT TICKETS
-- ════════════════════════════════════════════════════════════════════

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
  channel text,                 -- portal / whatsapp / phone

  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_tickets_tenant on support_tickets(tenant_id);
create index idx_tickets_customer on support_tickets(customer_id);

-- ════════════════════════════════════════════════════════════════════
-- AUDIT LOG
-- ════════════════════════════════════════════════════════════════════

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

-- ════════════════════════════════════════════════════════════════════
-- updated_at triggers
-- ════════════════════════════════════════════════════════════════════

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_tenants_updated  before update on tenants  for each row execute function set_updated_at();
create trigger trg_customers_updated before update on customers for each row execute function set_updated_at();
create trigger trg_contracts_updated before update on contracts for each row execute function set_updated_at();
create trigger trg_invoices_updated  before update on invoices  for each row execute function set_updated_at();
