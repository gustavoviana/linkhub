import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdapterForTenant } from '@/lib/erp';

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const admin = createAdminClient();
  const { data: isAdmin } = await admin
    .from('tenant_admins')
    .select('id')
    .eq('tenant_id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!isAdmin) return new NextResponse('Forbidden', { status: 403 });

  const { data: tenant } = await admin.from('tenants').select('*').eq('id', id).single();
  if (!tenant) return new NextResponse('Tenant not found', { status: 404 });

  try {
    const adapter = getAdapterForTenant(tenant);
    const plans = await adapter.listPlans();

    let count = 0;
    for (const p of plans) {
      const { error } = await admin.from('plans').upsert(
        {
          tenant_id: id,
          external_id: p.externalId,
          name: p.name,
          description: p.description ?? null,
          down_mbps: p.downMbps ?? null,
          up_mbps: p.upMbps ?? null,
          price_cents: p.priceCents,
          fidelity_months: p.fidelityMonths ?? null,
          active: true,
        },
        { onConflict: 'tenant_id,external_id' },
      );
      if (!error) count++;
    }

    await admin.from('tenants').update({
      erp_last_sync_at: new Date().toISOString(),
      erp_last_sync_status: 'success',
      erp_last_sync_error: null,
    }).eq('id', id);

    return NextResponse.json({ count });
  } catch (e: any) {
    await admin.from('tenants').update({
      erp_last_sync_at: new Date().toISOString(),
      erp_last_sync_status: 'error',
      erp_last_sync_error: e?.message ?? String(e),
    }).eq('id', id);
    return new NextResponse(e?.message ?? 'Sync failed', { status: 500 });
  }
}
