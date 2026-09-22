-- Reserva o slug "demo".
--
-- `demo.linkhub.api.br` é o endereço da central de demonstração: o
-- middleware serve a demonstração nesse subdomínio antes de procurar qualquer
-- provedor. Um provedor que se cadastrasse com esse slug ficaria com a
-- central inacessível pelo próprio endereço, e sem nenhuma pista do porquê.
--
-- A lista continua sendo a mesma da 003, com "demo" a mais. O resto do corpo
-- é idêntico ao de lá — `create or replace` exige a função inteira.

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
  if p_slug = any(array['www','admin','app','portal','api','auth','login','signup','dashboard','assets','static','demo']) then
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
