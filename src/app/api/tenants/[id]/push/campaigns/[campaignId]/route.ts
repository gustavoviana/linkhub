import { NextResponse, type NextRequest } from 'next/server';
import { requireTenantApi } from '@/lib/auth/api-guard';

// Cancela uma mensagem agendada. Só enquanto ainda está na fila: depois que
// o cron a pegou, já saiu.

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; campaignId: string }> },
) {
  const { id, campaignId } = await ctx.params;
  const auth = await requireTenantApi(id, 'admin');
  if (auth.error) return auth.error;

  const { data } = await auth.admin
    .from('push_campaigns')
    .update({ status: 'cancelled' } as never)
    .eq('id', campaignId)
    .eq('tenant_id', id)
    .eq('kind', 'manual')
    .eq('status', 'scheduled')
    .select('id')
    .maybeSingle();

  if (!data) return NextResponse.json({ error: 'Essa mensagem já foi enviada ou cancelada.' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
