-- RPC para criar um tenant + vincular o usuário corrente como owner.
-- Chamado pelo signup do provedor depois que o auth.users foi criado.
-- Roda como SECURITY DEFINER (privilégios do owner) porque tenants/insert
-- não tem policy pública (proteção contra spam).

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

  -- normaliza slug e bloqueia reservados
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
