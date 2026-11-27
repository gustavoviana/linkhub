import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTenantApi } from '@/lib/auth/api-guard';
import { auditApp } from '@/lib/tenant/app-audit';

// Estado do fluxo "Migrar app já publicado".
//
//   enable / disable      liga ou desliga o fluxo para o provedor
//   reset_requested       passo 3: o pedido de redefinição foi feito hoje
//   reset_approved        passo 3 concluído: o Google aprovou a chave nova
//   undo_reset            desfaz o passo 3 (marcado por engano)

export const runtime = 'nodejs';

const schema = z
  .object({ action: z.enum(['enable', 'disable', 'reset_requested', 'reset_approved', 'undo_reset']) })
  .strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTenantApi(id, 'admin');
  if (auth.error) return auth.error;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  const { action } = parsed.data;

  const { data } = await auth.admin
    .from('tenant_apps')
    .select('migration_enabled, migration_reset_requested_at')
    .eq('tenant_id', id)
    .maybeSingle();
  const app = data as { migration_enabled: boolean; migration_reset_requested_at: string | null } | null;
  if (!app) return NextResponse.json({ error: 'Salve a ficha do app antes.' }, { status: 404 });

  const now = new Date().toISOString();
  let patch: Record<string, string | boolean | null>;
  switch (action) {
    case 'enable':
      patch = { migration_enabled: true };
      break;
    case 'disable':
      patch = {
        migration_enabled: false,
        migration_pem_downloaded_at: null,
        migration_reset_requested_at: null,
        migration_reset_approved_at: null,
      };
      break;
    case 'reset_requested':
      if (!app.migration_enabled) return NextResponse.json({ error: 'Ligue a migração antes.' }, { status: 409 });
      patch = { migration_reset_requested_at: now, migration_reset_approved_at: null };
      break;
    case 'reset_approved':
      if (!app.migration_reset_requested_at) {
        return NextResponse.json({ error: 'Marque primeiro que o pedido foi feito.' }, { status: 409 });
      }
      patch = { migration_reset_approved_at: now };
      break;
    case 'undo_reset':
      patch = { migration_reset_requested_at: null, migration_reset_approved_at: null };
      break;
  }

  const { error } = await auth.admin.from('tenant_apps').update(patch as never).eq('tenant_id', id);
  if (error) return NextResponse.json({ error: 'Não foi possível salvar o passo.' }, { status: 500 });

  await auditApp({
    tenantId: id,
    actorUserId: auth.userId,
    action: 'app.migration_changed',
    metadata: { step: action },
  });
  return NextResponse.json({ ok: true });
}
