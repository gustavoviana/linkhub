-- Versão por provedor, migração de app já publicado e trava do pacote.
--
-- Pode rodar mais de uma vez: tudo é "if not exists" / "or replace".
-- Cole no SQL Editor do Supabase (ver supabase/README.md).
--
-- Regras que este arquivo garante no banco, e não só na API:
--
--  * O código de versão é reservado dentro de uma transação, com a linha do
--    app travada (`for update`). Dois builds simultâneos do mesmo provedor
--    nunca saem com o mesmo número; o índice único abaixo é a segunda trava.
--  * Build que falhou não consome número: o contador do app só anda quando o
--    build termina "done". O número de um build que falhou pode voltar a ser
--    usado, porque nunca chegou à loja.
--  * Depois do primeiro build marcado como publicado, o pacote só muda pela
--    função app_change_locked_package, que a API chama só para super
--    administrador.

-- ════════════════════════════════════════════════════════════════════
-- 1) Colunas novas
-- ════════════════════════════════════════════════════════════════════

-- version_code / version_name passam a significar "o último que saiu com
-- sucesso". Provedor novo começa em 0, e o primeiro build sai 1.0.0 (1).
alter table tenant_apps alter column version_code set default 0;

alter table tenant_apps
  -- Maior versionCode que a loja já recebeu fora do LinkHub.
  add column if not exists store_version_floor int not null default 0,
  -- versionName que acompanha esse código (Play Console › Pacotes de apps).
  add column if not exists store_version_name text,
  -- Versão escolhida pelo admin para o próximo build. Vazia = automático.
  add column if not exists next_version_name text,
  -- Certificado público da chave de upload (PEM). Não é segredo.
  add column if not exists upload_cert_pem text,

  -- iOS: contadores próprios (CFBundleVersion / CFBundleShortVersionString).
  add column if not exists ios_build_number int not null default 0,
  add column if not exists ios_version_name text not null default '1.0.0',
  add column if not exists ios_next_version_name text,

  -- Migração de um app publicado por outro gerador.
  add column if not exists migration_enabled boolean not null default false,
  add column if not exists migration_pem_downloaded_at timestamptz,
  add column if not exists migration_reset_requested_at timestamptz,
  add column if not exists migration_reset_approved_at timestamptz;

alter table tenant_app_builds
  add column if not exists published_at timestamptz,
  add column if not exists published_by uuid references auth.users(id) on delete set null,
  -- SHA-256 da chave de upload que assinou este pacote.
  add column if not exists upload_sha256 text;

-- Restrições. Em bloco porque "add constraint" não tem "if not exists".
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tenant_apps_store_floor_range') then
    alter table tenant_apps add constraint tenant_apps_store_floor_range
      check (store_version_floor >= 0 and store_version_floor < 2100000000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tenant_apps_package_format') then
    alter table tenant_apps add constraint tenant_apps_package_format
      check (package_id ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$' and length(package_id) <= 150);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tenant_apps_semver') then
    alter table tenant_apps add constraint tenant_apps_semver check (
      version_name ~ '^\d{1,4}\.\d{1,4}\.\d{1,4}$'
      and ios_version_name ~ '^\d{1,4}\.\d{1,4}\.\d{1,4}$'
      and (store_version_name is null or store_version_name ~ '^\d{1,4}\.\d{1,4}\.\d{1,4}$')
      and (next_version_name is null or next_version_name ~ '^\d{1,4}\.\d{1,4}\.\d{1,4}$')
      and (ios_next_version_name is null or ios_next_version_name ~ '^\d{1,4}\.\d{1,4}\.\d{1,4}$')
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tenant_app_builds_status') then
    alter table tenant_app_builds add constraint tenant_app_builds_status
      check (status in ('queued', 'running', 'done', 'error'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tenant_app_builds_platform') then
    alter table tenant_app_builds add constraint tenant_app_builds_platform
      check (platform in ('android', 'ios'));
  end if;
end $$;

-- Nenhum código repetido entre builds vivos ou concluídos do mesmo app.
-- Builds com erro ficam de fora: o número deles pode ser usado de novo.
create unique index if not exists uq_app_builds_code
  on tenant_app_builds (tenant_id, platform, version_code)
  where status in ('queued', 'running', 'done');

-- ════════════════════════════════════════════════════════════════════
-- 2) Reserva e conclusão do build
-- ════════════════════════════════════════════════════════════════════

-- Reserva o próximo código e cria o build na fila, numa transação só.
-- Próximo = max(último que deu certo, piso da loja, builds ainda vivos) + 1.
create or replace function public.app_reserve_build(
  p_tenant uuid,
  p_platform text,
  p_version_name text,
  p_created_by uuid default null
) returns tenant_app_builds
language plpgsql security definer set search_path = public as $$
declare
  v_app tenant_apps;
  v_last int;
  v_live int;
  v_code int;
  v_build tenant_app_builds;
begin
  if p_platform not in ('android', 'ios') then
    raise exception 'invalid_platform' using errcode = '22023';
  end if;
  if p_version_name !~ '^\d{1,4}\.\d{1,4}\.\d{1,4}$' then
    raise exception 'invalid_version_name' using errcode = '22023';
  end if;

  -- A trava que serializa os builds do mesmo provedor.
  select * into v_app from tenant_apps where tenant_id = p_tenant for update;
  if not found then
    raise exception 'app_not_found' using errcode = 'P0002';
  end if;

  -- Build que ficou para trás (runner morreu sem avisar) não segura número
  -- para sempre. O passe dele já expirou em 3 horas.
  update tenant_app_builds
     set status = 'error', error = 'O build não respondeu em 3 horas e foi encerrado.'
   where tenant_id = p_tenant and platform = p_platform
     and status in ('queued', 'running')
     and created_at < now() - interval '3 hours';

  v_last := case p_platform
    when 'android' then greatest(v_app.version_code, v_app.store_version_floor)
    else v_app.ios_build_number
  end;

  select coalesce(max(version_code), 0) into v_live
    from tenant_app_builds
   where tenant_id = p_tenant and platform = p_platform and status in ('queued', 'running');

  v_code := greatest(v_last, v_live) + 1;
  if v_code >= 2100000000 then
    raise exception 'version_code_overflow' using errcode = '22003';
  end if;

  insert into tenant_app_builds (tenant_id, platform, status, version_code, version_name, created_by, upload_sha256)
  values (p_tenant, p_platform, 'queued', v_code, p_version_name, p_created_by,
          case when p_platform = 'android' then v_app.keystore_sha256 end)
  returning * into v_build;

  return v_build;
end $$;

-- Encerra o build. Só "done" faz o contador do app andar.
create or replace function public.app_finish_build(
  p_build uuid,
  p_status text,
  p_error text default null,
  p_run_url text default null,
  p_artifact_path text default null,
  p_artifact_bytes bigint default null
) returns tenant_app_builds
language plpgsql security definer set search_path = public as $$
declare
  v_build tenant_app_builds;
begin
  if p_status not in ('done', 'error') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  select * into v_build from tenant_app_builds where id = p_build;
  if not found then
    raise exception 'build_not_found' using errcode = 'P0002';
  end if;
  -- Mesma ordem de trava da reserva (app, depois build): sem deadlock.
  perform 1 from tenant_apps where tenant_id = v_build.tenant_id for update;
  select * into v_build from tenant_app_builds where id = p_build for update;

  if v_build.status not in ('queued', 'running') then
    raise exception 'build_already_finished' using errcode = '55000';
  end if;

  update tenant_app_builds
     set status = p_status,
         error = case when p_status = 'error' then left(coalesce(p_error, 'Falhou.'), 2000) end,
         run_url = coalesce(p_run_url, run_url),
         artifact_path = coalesce(p_artifact_path, artifact_path),
         artifact_bytes = coalesce(p_artifact_bytes, artifact_bytes),
         upload_sha256 = case when v_build.platform = 'android'
                              then (select keystore_sha256 from tenant_apps where tenant_id = v_build.tenant_id)
                              else upload_sha256 end
   where id = p_build
  returning * into v_build;

  if p_status = 'done' then
    if v_build.platform = 'android' then
      update tenant_apps
         set version_name = case when v_build.version_code >= version_code then v_build.version_name else version_name end,
             version_code = greatest(version_code, v_build.version_code),
             next_version_name = case when next_version_name = v_build.version_name then null else next_version_name end
       where tenant_id = v_build.tenant_id;
    else
      update tenant_apps
         set ios_version_name = case when v_build.version_code >= ios_build_number then v_build.version_name else ios_version_name end,
             ios_build_number = greatest(ios_build_number, v_build.version_code),
             ios_next_version_name = case when ios_next_version_name = v_build.version_name then null else ios_next_version_name end
       where tenant_id = v_build.tenant_id;
    end if;
  end if;

  return v_build;
end $$;

-- ════════════════════════════════════════════════════════════════════
-- 3) Trava do identificador do pacote
-- ════════════════════════════════════════════════════════════════════

create or replace function public.tenant_apps_guard_package() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.package_id is distinct from old.package_id
     and exists (select 1 from tenant_app_builds
                  where tenant_id = old.tenant_id and published_at is not null)
     and coalesce(current_setting('linkhub.allow_package_change', true), '') <> 'on' then
    raise exception 'package_locked' using errcode = 'P0001',
      hint = 'O app já foi publicado. Só super administrador troca o pacote.';
  end if;
  return new;
end $$;

drop trigger if exists trg_tenant_apps_guard_package on tenant_apps;
create trigger trg_tenant_apps_guard_package before update of package_id on tenant_apps
  for each row execute function public.tenant_apps_guard_package();

-- Troca o pacote de um app já publicado. A API só chama isto para super
-- administrador, com confirmação e auditoria.
create or replace function public.app_change_locked_package(p_tenant uuid, p_package text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('linkhub.allow_package_change', 'on', true);
  update tenant_apps set package_id = p_package where tenant_id = p_tenant;
  if not found then
    raise exception 'app_not_found' using errcode = 'P0002';
  end if;
  perform set_config('linkhub.allow_package_change', '', true);
end $$;

-- ════════════════════════════════════════════════════════════════════
-- 4) Backup da recifragem das keystores
-- ════════════════════════════════════════════════════════════════════

-- Guarda os valores cifrados com a chave antiga antes de trocar.
-- scripts/recifrar-keystores.mjs escreve aqui. Sem policy: só service role.
create table if not exists tenant_app_secret_backups (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  keystore_data text,
  keystore_password text,
  keystore_sha256 text,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table tenant_app_secret_backups enable row level security;

-- ════════════════════════════════════════════════════════════════════
-- 5) Acesso
-- ════════════════════════════════════════════════════════════════════

-- tenant_apps continua sem policy (guarda a keystore). Os builds não têm
-- segredo: o admin do provedor lê os do próprio provedor, e nada além disso.
drop policy if exists "app_builds: tenant admins read" on tenant_app_builds;
create policy "app_builds: tenant admins read" on tenant_app_builds
  for select using (tenant_id in (select public.user_managed_tenant_ids()));

-- As funções rodam como dono das tabelas: só o servidor (service role) chama.
revoke all on function public.app_reserve_build(uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.app_finish_build(uuid, text, text, text, text, bigint) from public, anon, authenticated;
revoke all on function public.app_change_locked_package(uuid, text) from public, anon, authenticated;
grant execute on function public.app_reserve_build(uuid, text, text, uuid) to service_role;
grant execute on function public.app_finish_build(uuid, text, text, text, text, bigint) to service_role;
grant execute on function public.app_change_locked_package(uuid, text) to service_role;
