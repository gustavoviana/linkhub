-- Aplicativo nativo de cada provedor: configuração, chave de assinatura e
-- histórico de builds.
--
-- Sem policy de leitura: a tabela guarda a keystore de upload e as senhas
-- dela. Só a service role (painel e API, no servidor) enxerga.

create table if not exists tenant_apps (
  tenant_id uuid primary key references tenants(id) on delete cascade,

  -- Ficha do app
  app_name text not null,
  package_id text not null,
  version_code int not null default 1,
  version_name text not null default '1.0.0',

  -- Ícone quadrado do app. Nulo = usa o ícone do navegador, depois a logo.
  icon_url text,
  -- Cor da barra do sistema e do splash. Nulo = cores da marca.
  theme_color text,
  background_color text,

  -- Assinatura. A keystore é gerada no primeiro build e volta cifrada.
  keystore_data text,
  keystore_password text,
  keystore_alias text not null default 'linkhub',
  keystore_sha256 text,
  -- Impressão digital que o Play App Signing mostra no console. Entra no
  -- assetlinks.json — sem ela o app abre com barra de endereço.
  play_signing_sha256 text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (package_id)
);

create table if not exists tenant_app_builds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  platform text not null default 'android',
  status text not null default 'queued',
  version_code int,
  version_name text,
  -- Caminho no bucket tenant-apps.
  artifact_path text,
  artifact_bytes bigint,
  run_url text,
  error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_builds_tenant on tenant_app_builds(tenant_id, created_at desc);

alter table tenant_apps enable row level security;
alter table tenant_app_builds enable row level security;

drop trigger if exists trg_tenant_apps_updated on tenant_apps;
create trigger trg_tenant_apps_updated before update on tenant_apps
  for each row execute function set_updated_at();

drop trigger if exists trg_app_builds_updated on tenant_app_builds;
create trigger trg_app_builds_updated before update on tenant_app_builds
  for each row execute function set_updated_at();
