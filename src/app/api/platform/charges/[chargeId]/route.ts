import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformApi } from '@/lib/auth/platform';
import type { TenantCharge } from '@/lib/supabase/types';

// Baixa manual de uma mensalidade: paga, cancelada, ou de volta para aberta.

const BODY = z.object({
  status: z.enum(['open', 'paid', 'overdue', 'cancelled']),
  method: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ chargeId: string }> }) {
  const { chargeId } = await ctx.params;
  const auth = await requirePlatformApi();
  if (auth.error) return auth.error;

  const parsed = BODY.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: atual } = await supabase
    .from('tenant_charges')
    .select('*')
    .eq('id', chargeId)
    .maybeSingle();
  if (!atual) return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 });
  const charge = atual as unknown as TenantCharge;

  const paga = parsed.data.status === 'paid';
  const { error } = await supabase
    .from('tenant_charges')
    .update({
      status: parsed.data.status,
      // Reabrir apaga a data do pagamento: baixa errada corrigida não pode
      // deixar rastro de "pago em" numa cobrança que voltou a ser devida.
      paid_at: paga ? (charge.paid_at ?? new Date().toISOString()) : null,
      method: parsed.data.method ?? (paga ? charge.method : null),
      notes: parsed.data.notes ?? charge.notes,
    } as never)
    .eq('id', chargeId);

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  // Provedor sem nenhuma cobrança vencida volta de 'past_due' para 'active'.
  if (paga) {
    const { data: pendentes } = await supabase
      .from('tenant_charges')
      .select('id')
      .eq('tenant_id', charge.tenant_id)
      .eq('status', 'overdue');
    if ((pendentes?.length ?? 0) === 0) {
      await supabase
        .from('tenant_billing')
        .update({ status: 'active' } as never)
        .eq('tenant_id', charge.tenant_id)
        .eq('status', 'past_due');
    }
  }

  await supabase.from('audit_log').insert({
    tenant_id: charge.tenant_id,
    actor_user_id: auth.session.userId,
    action: 'platform.charge_updated',
    resource_type: 'charge',
    resource_id: chargeId,
    metadata: { de: charge.status, para: parsed.data.status },
  } as never);

  return NextResponse.json({ ok: true });
}
