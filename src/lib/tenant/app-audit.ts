import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

// Auditoria do módulo de aplicativo. Tudo vai para audit_log, que o admin do
// provedor já lê pela policy "audit: tenant admins read".
//
// Nunca passe segredo em `metadata`: nem senha, nem keystore, nem passe de
// build. O tipo aceita só valores simples para ninguém mandar um objeto
// inteiro do app por engano.

export type AppAuditAction =
  | 'app.version_changed'
  | 'app.package_changed'
  | 'app.package_override'
  | 'app.upload_cert_downloaded'
  | 'app.keystore_created'
  | 'app.build_started'
  | 'app.build_done'
  | 'app.build_failed'
  | 'app.build_published'
  | 'app.migration_changed';

type Scalar = string | number | boolean | null;

export async function auditApp(entry: {
  tenantId: string;
  actorUserId: string | null;
  action: AppAuditAction;
  resourceType?: 'tenant_app' | 'tenant_app_build';
  resourceId?: string;
  metadata?: Record<string, Scalar>;
}): Promise<void> {
  const { error } = await createAdminClient()
    .from('audit_log')
    .insert({
      tenant_id: entry.tenantId,
      actor_user_id: entry.actorUserId,
      action: entry.action,
      resource_type: entry.resourceType ?? 'tenant_app',
      resource_id: entry.resourceId ?? entry.tenantId,
      metadata: entry.metadata ?? null,
    } as never);
  // Auditoria que falha não derruba a ação, mas também não some calada.
  if (error) console.error(`[audit] ${entry.action} não gravou: ${error.code ?? ''} ${error.message}`);
}
