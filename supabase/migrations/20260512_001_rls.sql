-- Row-Level Security: isolamento entre tenants.
--
-- Modelo:
--  • Tenant admins (linha em tenant_admins) acessam dados do seu tenant.
--  • Clientes finais (customers.user_id) acessam apenas o próprio registro
--    e filhos (contracts, invoices, tickets).
--  • Service role bypassa tudo (usado pelos sync workers).

-- ════════════════════════════════════════════════════════════════════
-- Helpers
-- ════════════════════════════════════════════════════════════════════

-- Retorna o conjunto de tenant_ids que o usuário corrente administra.
create or replace function auth.user_tenant_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from public.tenant_admins where user_id = auth.uid();
$$;

-- Retorna o customer_id do usuário corrente para um tenant.
create or replace function auth.user_customer_id(p_tenant uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.customers
  where tenant_id = p_tenant and user_id = auth.uid()
  limit 1;
$$;

-- Tem qualquer vínculo (admin ou customer) com o tenant?
create or replace function auth.has_tenant_access(p_tenant uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tenant_admins where user_id = auth.uid() and tenant_id = p_tenant
    union all
    select 1 from public.customers where user_id = auth.uid() and tenant_id = p_tenant
  );
$$;

-- ════════════════════════════════════════════════════════════════════
-- Enable RLS
-- ════════════════════════════════════════════════════════════════════

alter table tenants            enable row level security;
alter table tenant_admins      enable row level security;
alter table customers          enable row level security;
alter table plans              enable row level security;
alter table contracts          enable row level security;
alter table invoices           enable row level security;
alter table support_tickets    enable row level security;
alter table audit_log          enable row level security;

-- ════════════════════════════════════════════════════════════════════
-- TENANTS
-- Leitura pública: anônimos podem ler dados de branding pelo slug
-- (necessário para o portal carregar o tema antes do login).
-- Apenas admins do tenant podem atualizar.
-- ════════════════════════════════════════════════════════════════════

create policy "tenants: public read branding" on tenants
  for select using (true);

create policy "tenants: admins can update" on tenants
  for update to authenticated
  using (id in (select auth.user_tenant_ids()))
  with check (id in (select auth.user_tenant_ids()));

-- Insert é feito pelo signup (route handler com service role) — sem policy
-- pública. Delete idem.

-- ════════════════════════════════════════════════════════════════════
-- TENANT_ADMINS
-- ════════════════════════════════════════════════════════════════════

create policy "tenant_admins: owners/admins read" on tenant_admins
  for select to authenticated
  using (
    tenant_id in (select auth.user_tenant_ids())
  );

create policy "tenant_admins: owners manage" on tenant_admins
  for all to authenticated
  using (
    tenant_id in (
      select tenant_id from tenant_admins
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  )
  with check (
    tenant_id in (
      select tenant_id from tenant_admins
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ════════════════════════════════════════════════════════════════════
-- CUSTOMERS
-- Admins do tenant: tudo.
-- Cliente: apenas o próprio registro.
-- ════════════════════════════════════════════════════════════════════

create policy "customers: tenant admins all" on customers
  for all to authenticated
  using (tenant_id in (select auth.user_tenant_ids()))
  with check (tenant_id in (select auth.user_tenant_ids()));

create policy "customers: self read" on customers
  for select to authenticated
  using (user_id = auth.uid());

create policy "customers: self update limited" on customers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════
-- PLANS — leitura pública por tenant (catálogo), escrita só admin
-- ════════════════════════════════════════════════════════════════════

create policy "plans: public read active" on plans
  for select using (active = true);

create policy "plans: tenant admins manage" on plans
  for all to authenticated
  using (tenant_id in (select auth.user_tenant_ids()))
  with check (tenant_id in (select auth.user_tenant_ids()));

-- ════════════════════════════════════════════════════════════════════
-- CONTRACTS
-- ════════════════════════════════════════════════════════════════════

create policy "contracts: tenant admins all" on contracts
  for all to authenticated
  using (tenant_id in (select auth.user_tenant_ids()))
  with check (tenant_id in (select auth.user_tenant_ids()));

create policy "contracts: customer own" on contracts
  for select to authenticated
  using (
    customer_id in (
      select id from customers where user_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════════
-- INVOICES
-- ════════════════════════════════════════════════════════════════════

create policy "invoices: tenant admins all" on invoices
  for all to authenticated
  using (tenant_id in (select auth.user_tenant_ids()))
  with check (tenant_id in (select auth.user_tenant_ids()));

create policy "invoices: customer own" on invoices
  for select to authenticated
  using (
    contract_id in (
      select c.id from contracts c
      join customers cu on cu.id = c.customer_id
      where cu.user_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════════
-- SUPPORT TICKETS
-- ════════════════════════════════════════════════════════════════════

create policy "tickets: tenant admins all" on support_tickets
  for all to authenticated
  using (tenant_id in (select auth.user_tenant_ids()))
  with check (tenant_id in (select auth.user_tenant_ids()));

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

-- ════════════════════════════════════════════════════════════════════
-- AUDIT LOG — só admin lê
-- ════════════════════════════════════════════════════════════════════

create policy "audit: tenant admins read" on audit_log
  for select to authenticated
  using (tenant_id in (select auth.user_tenant_ids()));
