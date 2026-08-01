import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformApi } from '@/lib/auth/platform';

// Situação do provedor e condições da assinatura.
//
// Suspender aqui é o botão que corta o acesso de quem não pagou: o status do
// tenant é o que o portal e o painel consultam.

const BODY = z.object({
  status: z.enum(['active', 'trial', 'suspended', 'cancelled']).optional(),
  billing: z
    .object({
      monthly_amount_cents: z.number().int().min(0).max(100_000_00).optional(),
      billing_day: z.number().int().min(1).max(28).optional(),
      status: z.enum(['trial', 'active', 'past_due', 'cancelled']).optional(),
      trial_ends_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      started_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      notes: z.string().trim().max(1000).nullable().optional(),
    })
    .optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requirePlatformApi();
  if (auth.error) return auth.error;

  const parsed = BODY.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('id', id).maybeSingle();
  if (!tenant) return NextResponse.json({ error: 'Provedor não encontrado' }, { status: 404 });

  if (parsed.data.status) {
    const { error } = await supabase.from('tenants').update({ status: parsed.data.status } as never).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  }

  if (parsed.data.billing) {
    const { error } = await supabase
      .from('tenant_billing')
      .upsert({ tenant_id: id, ...parsed.data.billing } as never, { onConflict: 'tenant_id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  }

  await supabase.from('audit_log').insert({
    tenant_id: id,
    actor_user_id: auth.session.userId,
    action: 'platform.tenant_updated',
    resource_type: 'tenant',
    resource_id: id,
    metadata: parsed.data,
  } as never);

  return NextResponse.json({ ok: true });
}
