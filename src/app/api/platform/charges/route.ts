import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformApi } from '@/lib/auth/platform';
import { monthStart, today } from '@/lib/platform/data';
import type { TenantBilling } from '@/lib/supabase/types';

// Emissão das mensalidades do mês.
//
// Rodar duas vezes no mesmo mês não duplica nada: o unique (tenant_id,
// reference_month) segura, e a inserção ignora o que já existe. É de propósito
// que a emissão seja um botão e não um cron — o dono da plataforma quer olhar
// a lista antes de cobrar.

const BODY = z.object({
  /** 'YYYY-MM'. Ausente = mês corrente. */
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requirePlatformApi();
  if (auth.error) return auth.error;

  const parsed = BODY.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Mês inválido' }, { status: 400 });

  const referencia = parsed.data.month ? `${parsed.data.month}-01` : monthStart();
  const supabase = createAdminClient();

  const { data: billingRows, error } = await supabase
    .from('tenant_billing')
    .select('*')
    .in('status', ['active', 'past_due']);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  const cobraveis = ((billingRows ?? []) as unknown as TenantBilling[]).filter(
    (b) => b.monthly_amount_cents > 0,
  );

  if (cobraveis.length === 0) {
    return NextResponse.json({ criadas: 0, message: 'Nenhum provedor ativo com mensalidade definida.' });
  }

  const [ano, mes] = referencia.split('-').map(Number);
  const linhas = cobraveis.map((b) => {
    // Fevereiro não tem dia 30: o vencimento cai no último dia do mês.
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dia = Math.min(b.billing_day, ultimoDia);
    return {
      tenant_id: b.tenant_id,
      reference_month: referencia,
      amount_cents: b.monthly_amount_cents,
      due_date: `${referencia.slice(0, 7)}-${String(dia).padStart(2, '0')}`,
      status: 'open',
    };
  });

  const { data: inseridas, error: erroInsert } = await supabase
    .from('tenant_charges')
    .upsert(linhas as never, { onConflict: 'tenant_id,reference_month', ignoreDuplicates: true })
    .select('id');
  if (erroInsert) return NextResponse.json({ error: erroInsert.message }, { status: 502 });

  await supabase.from('audit_log').insert({
    actor_user_id: auth.session.userId,
    action: 'platform.charges_generated',
    resource_type: 'charge',
    resource_id: referencia,
    metadata: { referencia, criadas: inseridas?.length ?? 0, elegiveis: cobraveis.length },
  } as never);

  return NextResponse.json({
    criadas: inseridas?.length ?? 0,
    elegiveis: cobraveis.length,
    referencia,
  });
}

/** Marca como vencida toda cobrança em aberto que passou do vencimento. */
export async function PATCH() {
  const auth = await requirePlatformApi();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('tenant_charges')
    .update({ status: 'overdue' } as never)
    .eq('status', 'open')
    .lt('due_date', today())
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ atualizadas: data?.length ?? 0 });
}
