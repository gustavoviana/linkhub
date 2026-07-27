import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Configurações gerais do provedor. Passa pelo servidor porque mexe em como
// o cliente final entra na central — não é coisa para o navegador gravar
// direto.

const BODY = z.object({
  portal_require_password: z.boolean().optional(),
  legal_name: z.string().trim().max(160).nullable().optional(),
  cnpj: z.string().trim().max(20).nullable().optional(),
});

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from('tenant_admins')
    .select('role')
    .eq('tenant_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  const role = (membership as { role?: string } | null)?.role;
  if (role !== 'owner' && role !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const parsed = BODY.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return new NextResponse(parsed.error.issues[0]?.message ?? 'Dados inválidos', { status: 400 });
  }

  const { error } = await admin.from('tenants').update(parsed.data as never).eq('id', id);
  if (error) {
    // Coluna ausente = migração 005 ainda não aplicada. Vale dizer isso em
    // vez de devolver o erro cru do Postgres.
    if (/portal_require_password/.test(error.message)) {
      return new NextResponse(
        'O banco ainda não tem a coluna portal_require_password. Rode a migração 20260727_005 no SQL Editor.',
        { status: 409 },
      );
    }
    return new NextResponse(error.message, { status: 500 });
  }

  await admin.from('audit_log').insert({
    tenant_id: id,
    actor_user_id: user.id,
    action: 'tenant.settings_updated',
    resource_type: 'tenant',
    resource_id: id,
    metadata: parsed.data,
  } as never);

  return NextResponse.json({ ok: true });
}
