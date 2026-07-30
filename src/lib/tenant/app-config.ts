import type { Tenant } from '@/lib/supabase/types';

// Ficha do aplicativo nativo de um provedor. Vive em `tenant_apps`, mas todo
// campo tem um padrão derivado da marca — provedor recém-cadastrado já tem
// app configurado sem ninguém preencher nada.

export interface TenantApp {
  tenant_id: string;
  app_name: string;
  package_id: string;
  version_code: number;
  version_name: string;
  icon_url: string | null;
  theme_color: string | null;
  background_color: string | null;
  keystore_data: string | null;
  keystore_password: string | null;
  keystore_alias: string;
  keystore_sha256: string | null;
  play_signing_sha256: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppBuild {
  id: string;
  tenant_id: string;
  platform: string;
  status: 'queued' | 'running' | 'done' | 'error';
  version_code: number | null;
  version_name: string | null;
  artifact_path: string | null;
  artifact_bytes: number | null;
  run_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'linkhub.api.br';

/** O nome na loja tem 30 caracteres na Play — cortamos antes de dar erro lá. */
export function defaultAppName(tenant: Tenant) {
  return tenant.name.trim().slice(0, 30);
}

/**
 * Identificador do pacote. É imutável depois da primeira publicação: a loja
 * trata pacote diferente como app diferente, então mudar aqui é começar do
 * zero na ficha.
 */
export function defaultPackageId(tenant: Tenant) {
  const slug = tenant.slug.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'app';
  // Segmento não pode começar com número — o Java não deixa.
  const safe = /^[0-9]/.test(slug) ? `a${slug}` : slug;
  return `br.api.linkhub.${safe}`;
}

/** Endereço público da central do provedor — é o que o app abre. */
export function tenantOrigin(tenant: Tenant) {
  if (tenant.custom_domain && tenant.custom_domain_verified) {
    return `https://${tenant.custom_domain}`;
  }
  return `https://${tenant.slug}.${ROOT_DOMAIN}`;
}

export function appDefaults(tenant: Tenant): TenantApp {
  const now = new Date().toISOString();
  return {
    tenant_id: tenant.id,
    app_name: defaultAppName(tenant),
    package_id: defaultPackageId(tenant),
    version_code: 1,
    version_name: '1.0.0',
    icon_url: null,
    theme_color: null,
    background_color: null,
    keystore_data: null,
    keystore_password: null,
    keystore_alias: 'linkhub',
    keystore_sha256: null,
    play_signing_sha256: null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * De onde sai o ícone do app, na ordem: a imagem que o painel enviou só para
 * o app, o ícone quadrado do navegador, a logo da central. Se não houver
 * nenhuma, o ícone é desenhado com a inicial do provedor sobre a cor da marca.
 */
export function iconSource(tenant: Tenant, app: TenantApp | null): string | null {
  return app?.icon_url ?? tenant.favicon_url ?? tenant.logo_url ?? null;
}

export function themeColorOf(tenant: Tenant, app: TenantApp | null) {
  return app?.theme_color ?? tenant.primary_color;
}

export function backgroundColorOf(tenant: Tenant, app: TenantApp | null) {
  return app?.background_color ?? (tenant.dark_mode_default ? '#0f1017' : '#ffffff');
}

/** Próxima versão: a Play exige versionCode maior a cada envio. */
export function nextVersion(app: TenantApp) {
  const parts = app.version_name.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const patch = (parts[2] ?? 0) + 1;
  return {
    version_code: app.version_code + 1,
    version_name: `${parts[0] ?? 1}.${parts[1] ?? 0}.${patch}`,
  };
}
