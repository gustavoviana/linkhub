-- Correções de RLS e exposição de dados — 27/07/2026.
--
-- ATENÇÃO: o que está no banco de produção veio do `all_in_one.sql`
-- (helpers no schema `public`), não dos arquivos 000..003 deste diretório,
-- que ainda usam a variante `auth.*` e estão desatualizados. Este arquivo
-- assume os helpers em `public` e pode ser colado direto no SQL Editor.
--
-- Corrige três problemas confirmados no projeto restaurado:
--
--  1. tenant_admins: a policy "owners manage" consultava a própria tabela
--     dentro da própria policy. O Postgres aborta com 42P17 (infinite
--     recursion) em QUALQUER select autenticado na tabela — o que fazia
--     getUserTenants() devolver vazio e o /admin exibir "nenhum provedor
--     cadastrado" mesmo com o tenant criado.
--
--  2. tenants: o select era `using (true)`. Como a anon key é pública (vai
--     no bundle do browser), qualquer pessoa lia a linha inteira de todos
--     os provedores — incluindo `erp_config` com token do IXC, senha do
--     Hubsoft etc. O branding público passa a sair pela view tenants_public,
--     que expõe só as colunas de aparência/contato.
--
--  3. tenants: a policy de update não limitava colunas, então um admin de
--     tenant conseguia alterar slug, status e custom_domain_verified direto
--     do navegador (auto-ativar assinatura, sequestrar domínio). Um trigger
--     passa a reverter essas colunas para quem não é service_role.

-- ════════════════════════════════════════════════════════════════════
-- 1) Recursão infinita em tenant_admins
-- ════════════════════════════════════════════════════════════════════

-- security definer = roda como owner das tabelas, então NÃO reaplica RLS
-- em tenant_admins — é isso que quebra o ciclo.
create or replace function public.user_managed_tenant_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from public.tenant_admins
  where user_id = auth.uid() and role in ('owner', 'admin');
$$;

drop policy if exists "tenant_admins: owners manage" on tenant_admins;

create policy "tenant_admins: owners manage" on tenant_admins
  for all to authenticated
  using (tenant_id in (select public.user_managed_tenant_ids()))
  with check (tenant_id in (select public.user_managed_tenant_ids()));

-- ════════════════════════════════════════════════════════════════════
-- 2) erp_config exposto pela anon key
-- ════════════════════════════════════════════════════════════════════

create or replace function public.user_customer_tenant_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from public.customers where user_id = auth.uid();
$$;

drop policy if exists "tenants: public read branding" on tenants;

-- Só quem tem vínculo com o provedor lê a tabela crua. Todo o resto do app
-- (resolve.ts, layouts do portal, rotas de API) lê via service role, que
-- ignora RLS — nada quebra aqui.
create policy "tenants: members read" on tenants
  for select to authenticated
  using (
    id in (select public.user_tenant_ids())
    or id in (select public.user_customer_tenant_ids())
  );

-- Branding público, sem credencial nenhuma. View sem security_invoker
-- (roda como owner) justamente para que visitante anônimo enxergue o tema
-- do provedor antes do login. O linter do Supabase sinaliza "security
-- definer view" — aqui é intencional.
create or replace view public.tenants_public as
  select id, slug, name, status, layout,
         primary_color, accent_color, dark_mode_default,
         logo_url, favicon_url,
         support_phone, support_whatsapp, support_email,
         custom_domain, custom_domain_verified
  from public.tenants;

grant select on public.tenants_public to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════
-- 3) Colunas sensíveis alteráveis pelo browser
-- ════════════════════════════════════════════════════════════════════

-- SEM security definer de propósito: precisamos que current_user seja o
-- papel de quem chamou (anon / authenticated / service_role), e não o dono
-- da função.
create or replace function public.protect_tenant_columns() returns trigger
language plpgsql set search_path = public as $$
begin
  -- Route handlers, jobs e SQL direto continuam podendo tudo.
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  -- Reverte silenciosamente em vez de dar erro: o form de branding manda só
  -- as colunas dele, então um PATCH legítimo nunca é afetado.
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

-- Nome com "protect" vem antes de "updated" na ordem alfabética, que é a
-- ordem de execução dos triggers BEFORE — o set_updated_at continua valendo.
drop trigger if exists trg_tenants_protect on tenants;
create trigger trg_tenants_protect before update on tenants
  for each row execute function public.protect_tenant_columns();
