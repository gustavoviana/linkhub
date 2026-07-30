import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { CopySql } from './copy-sql';

// A aba depende de duas tabelas novas. Enquanto elas não existirem, mostrar
// o SQL pronto para colar é mais útil que uma tela de erro.

const SQL = `create table if not exists tenant_apps (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  app_name text not null,
  package_id text not null,
  version_code int not null default 1,
  version_name text not null default '1.0.0',
  icon_url text,
  theme_color text,
  background_color text,
  keystore_data text,
  keystore_password text,
  keystore_alias text not null default 'linkhub',
  keystore_sha256 text,
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
  artifact_path text,
  artifact_bytes bigint,
  run_url text,
  error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_builds_tenant
  on tenant_app_builds(tenant_id, created_at desc);

alter table tenant_apps enable row level security;
alter table tenant_app_builds enable row level security;

drop trigger if exists trg_tenant_apps_updated on tenant_apps;
create trigger trg_tenant_apps_updated before update on tenant_apps
  for each row execute function set_updated_at();

drop trigger if exists trg_app_builds_updated on tenant_app_builds;
create trigger trg_app_builds_updated before update on tenant_app_builds
  for each row execute function set_updated_at();`;

export function MigrationNotice() {
  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Falta rodar a migração</CardTitle>
          <CardSubtitle>As tabelas do aplicativo ainda não existem neste banco</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-fg-2 leading-relaxed">
            Copie o SQL abaixo, cole no <strong>SQL Editor</strong> do Supabase e rode uma vez. É o
            mesmo arquivo que está no repositório em{' '}
            <code className="font-mono text-xs bg-bg-3 px-1.5 py-0.5 rounded">
              supabase/migrations/20260729_006_tenant_apps.sql
            </code>
            . Sem senha nenhuma para digitar — depois é só recarregar esta página.
          </p>
          <CopySql sql={SQL} />
          <p className="text-xs text-fg-2">
            As duas tabelas ficam sem policy de leitura de propósito: elas guardam a chave que
            assina os aplicativos, então só o servidor enxerga.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
