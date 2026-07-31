import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant/resolve';
import { getCurrentCustomer } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdapterForTenant } from '@/lib/erp';
import { precisaAtualizar, sincronizarFaturas } from '@/lib/portal/sync-invoices';

// Atualiza as faturas do assinante depois que a tela já apareceu.
//
// A central chama isto do navegador, uma vez por visita. Se o ERP demorar, quem
// espera é este pedido em segundo plano — não o assinante olhando para uma tela
// em branco.

export const dynamic = 'force-dynamic';

export async function POST() {
  const tenant = await requireTenant().catch(() => null);
  if (!tenant) return new NextResponse('Not found', { status: 404 });

  const customer = await getCurrentCustomer(tenant.id);
  if (!customer) return new NextResponse('Unauthorized', { status: 401 });

  const admin = createAdminClient();
  const { data: contract } = await admin
    .from('contracts')
    .select('id, external_id, last_synced_at, monthly_price_cents')
    .eq('tenant_id', tenant.id)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const alvo = contract as {
    id: string;
    external_id: string | null;
    last_synced_at: string | null;
    monthly_price_cents: number | null;
  } | null;
  if (!alvo?.external_id) return NextResponse.json({ atualizado: false });

  if (!precisaAtualizar(alvo.last_synced_at)) {
    return NextResponse.json({ atualizado: false });
  }

  const quantas = await sincronizarFaturas(admin, tenant.id, alvo, getAdapterForTenant(tenant));
  return NextResponse.json({ atualizado: quantas > 0, faturas: quantas });
}
