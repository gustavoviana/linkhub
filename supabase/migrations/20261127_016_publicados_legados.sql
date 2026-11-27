-- Marca como publicados os builds que já estão na Play desde antes de a
-- marcação existir, para o identificador do pacote voltar a ficar travado.
--
--   LM NET     br.api.linkhub.lmnet     1.0.2 (3)  build 55341b5b-…
--   Marau Net  br.api.linkhub.maraunet  1.0.0 (1)  build 29718db5-…
--
-- Mira pelo id do build e confere tenant, versão e status: se qualquer um
-- não bater, a linha não é tocada. Idempotente: build já marcado fica como
-- está e não gera auditoria de novo. Rodar depois da 014.

with alvo (build_id, tenant_id, version_code, version_name) as (
  values
    ('55341b5b-6fdd-4f7a-86c1-84f5fbaa382b'::uuid, 'e8a0980d-f62a-4a31-8622-195894873d9c'::uuid, 3, '1.0.2'),
    ('29718db5-2838-42f7-8b25-85ddf09ad359'::uuid, 'ea08bd44-4987-4c62-9886-5cff35ade81c'::uuid, 1, '1.0.0')
),
marcados as (
  update tenant_app_builds b
     set published_at = now()
    from alvo a
   where b.id = a.build_id
     and b.tenant_id = a.tenant_id
     and b.version_code = a.version_code
     and b.version_name = a.version_name
     and b.platform = 'android'
     and b.status = 'done'
     and b.published_at is null
  returning b.id, b.tenant_id, b.version_code, b.version_name
)
insert into audit_log (tenant_id, actor_user_id, action, resource_type, resource_id, metadata)
select
  m.tenant_id,
  null,
  'app.build_published',
  'tenant_app_build',
  m.id::text,
  jsonb_build_object(
    'version_code', m.version_code,
    'version_name', m.version_name,
    'platform', 'android',
    'source', 'migration 016',
    'reason', 'Já publicado na Play antes de a marcação existir'
  )
from marcados m
returning tenant_id, resource_id, metadata;
