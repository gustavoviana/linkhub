import { NextResponse, type NextRequest } from 'next/server';
import { requireTenant } from '@/lib/tenant/resolve';
import { getCurrentCustomer } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdapterForTenant } from '@/lib/erp';
import { parseUsageRange } from '@/lib/erp/usage';

// Consumo de rede por período, para o seletor do gráfico.
//
// A home já entrega os 7 dias no HTML — só "hoje" e "30 dias" passam por
// aqui, quando o assinante troca o período. Buscar os três de uma vez a cada
// carregamento sairia caro no ERP para um dado que a maioria nem abre.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const tenant = await requireTenant();
  const customer = await getCurrentCustomer(tenant.id);
  if (!customer) return new NextResponse('Sessão expirada', { status: 401 });

  const range = parseUsageRange(req.nextUrl.searchParams.get('range'));

  const admin = createAdminClient();
  const { data: contracts } = await admin
    .from('contracts')
    .select('external_id')
    .eq('tenant_id', tenant.id)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(1);

  const externalId = (contracts?.[0] as { external_id?: string | null } | undefined)?.external_id;
  if (!externalId) return NextResponse.json({ range, usage: [] });

  const adapter = getAdapterForTenant(tenant);
  try {
    const usage = (await adapter.getUsage?.(externalId, range)) ?? [];
    return NextResponse.json(
      { range, usage },
      { headers: { 'Cache-Control': 'private, max-age=60' } },
    );
  } catch (e) {
    console.error('[portal] usage range lookup failed', e);
    return new NextResponse('Não foi possível carregar o consumo agora.', { status: 502 });
  }
}
