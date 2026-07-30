import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Tenant } from '@/lib/supabase/types';
import { appDefaults, type AppBuild, type TenantApp } from './app-config';

// Leitura e escrita de `tenant_apps` / `tenant_app_builds`.
//
// Tudo tolera a tabela não existir: enquanto a migração 006 não roda, o
// painel mostra o aviso em vez de estourar uma tela de erro.

export const APP_TABLE_MISSING = 'tenant_apps_missing';

function isMissingTable(error: { code?: string; message?: string } | null) {
  return error?.code === '42P01' || /relation .*tenant_apps.* does not exist/i.test(error?.message ?? '');
}

export async function getTenantApp(
  tenant: Tenant,
): Promise<{ app: TenantApp | null; missingTable: boolean }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('tenant_apps')
    .select('*')
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (error && isMissingTable(error)) return { app: null, missingTable: true };
  return { app: (data ?? null) as TenantApp | null, missingTable: false };
}

/** Lê a ficha do app criando-a com os padrões da marca na primeira vez. */
export async function ensureTenantApp(tenant: Tenant): Promise<TenantApp> {
  const { app, missingTable } = await getTenantApp(tenant);
  if (missingTable) throw new Error(APP_TABLE_MISSING);
  if (app) return app;

  const supabase = createAdminClient();
  const defaults = appDefaults(tenant);
  const { data, error } = await supabase
    .from('tenant_apps')
    .insert({
      tenant_id: defaults.tenant_id,
      app_name: defaults.app_name,
      package_id: defaults.package_id,
      version_code: defaults.version_code,
      version_name: defaults.version_name,
      keystore_alias: defaults.keystore_alias,
    } as never)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as TenantApp;
}

export async function listBuilds(tenantId: string, limit = 10): Promise<AppBuild[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('tenant_app_builds')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as AppBuild[];
}

export async function getBuild(buildId: string): Promise<AppBuild | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('tenant_app_builds')
    .select('*')
    .eq('id', buildId)
    .maybeSingle();
  return (data ?? null) as AppBuild | null;
}

export const ARTIFACT_BUCKET = 'tenant-apps';
