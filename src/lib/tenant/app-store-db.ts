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

/** Builds mais recentes. `null` quando a leitura falhou (a tela mostra o erro). */
export async function listBuilds(tenantId: string, limit = 10): Promise<AppBuild[] | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('tenant_app_builds')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return null;
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

/** Algum build deste provedor já foi marcado como publicado na loja? */
export async function hasPublishedBuild(tenantId: string): Promise<boolean> {
  const { count } = await createAdminClient()
    .from('tenant_app_builds')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .not('published_at', 'is', null);
  return (count ?? 0) > 0;
}

export type ReserveResult =
  | { ok: true; build: AppBuild }
  | { ok: false; status: number; error: string };

/**
 * Reserva o próximo código e cria o build na fila (função app_reserve_build,
 * migração 014). A reserva é atômica no banco: dois pedidos simultâneos
 * saem com códigos diferentes.
 */
export async function reserveBuild(input: {
  tenantId: string;
  platform: 'android' | 'ios';
  versionName: string;
  createdBy: string | null;
  /** Para a mensagem de conflito: o menor código que ainda serve. */
  expectedCode: number;
}): Promise<ReserveResult> {
  const { data, error } = await createAdminClient().rpc('app_reserve_build' as never, {
    p_tenant: input.tenantId,
    p_platform: input.platform,
    p_version_name: input.versionName,
    p_created_by: input.createdBy,
  } as never);

  if (error) {
    if (error.code === '23505') {
      return {
        ok: false,
        status: 409,
        error: `Esse código de versão já foi usado. Use ${input.expectedCode} ou maior.`,
      };
    }
    if (error.code === 'PGRST202' || error.code === '42883') {
      return { ok: false, status: 503, error: 'Rode a migração 014 no banco antes.' };
    }
    return { ok: false, status: 500, error: 'Não foi possível reservar a versão do build.' };
  }
  return { ok: true, build: data as unknown as AppBuild };
}

/** Encerra o build. Só "done" faz o contador de versão andar. */
export async function finishBuild(input: {
  buildId: string;
  status: 'done' | 'error';
  error?: string | null;
  runUrl?: string | null;
  artifactPath?: string | null;
  artifactBytes?: number | null;
}): Promise<AppBuild | null> {
  const { data, error } = await createAdminClient().rpc('app_finish_build' as never, {
    p_build: input.buildId,
    p_status: input.status,
    p_error: input.error ?? null,
    p_run_url: input.runUrl ?? null,
    p_artifact_path: input.artifactPath ?? null,
    p_artifact_bytes: input.artifactBytes ?? null,
  } as never);
  if (error) {
    console.error(`[app-build] finish ${input.buildId} falhou: ${error.code ?? ''}`);
    return null;
  }
  return data as unknown as AppBuild;
}
