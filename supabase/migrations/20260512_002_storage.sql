-- Storage buckets para logos / favicons dos provedores.
-- Public read (logo aparece no portal sem login); upload restrito a admins.

insert into storage.buckets (id, name, public)
values ('tenant-assets', 'tenant-assets', true)
on conflict (id) do nothing;

create policy "tenant-assets: public read"
on storage.objects for select
using (bucket_id = 'tenant-assets');

-- Path convention: tenants/{tenant_id}/{filename}
-- Permite upload/update/delete só pra admins do tenant.
create policy "tenant-assets: admins write"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'tenant-assets'
  and (storage.foldername(name))[1] = 'tenants'
  and (storage.foldername(name))[2]::uuid in (select auth.user_tenant_ids())
);

create policy "tenant-assets: admins update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'tenant-assets'
  and (storage.foldername(name))[1] = 'tenants'
  and (storage.foldername(name))[2]::uuid in (select auth.user_tenant_ids())
);

create policy "tenant-assets: admins delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'tenant-assets'
  and (storage.foldername(name))[1] = 'tenants'
  and (storage.foldername(name))[2]::uuid in (select auth.user_tenant_ids())
);
