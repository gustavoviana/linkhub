import { redirect } from 'next/navigation';
import { requireTenant } from '@/lib/tenant/resolve';
import { getCurrentCustomer } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdapterForTenant } from '@/lib/erp';
import { BottomNav } from '@/components/portal/bottom-nav';
import { HomeV1 } from '@/components/portal/home-v1';
import { HomeV2 } from '@/components/portal/home-v2';
import { HomeV3 } from '@/components/portal/home-v3';
import type { Contract, Invoice, Plan } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function PortalHome() {
  const tenant = await requireTenant();
  const customer = await getCurrentCustomer(tenant.id);
  if (!customer) redirect('/login');

  const supabase = createAdminClient();
  const adapter = getAdapterForTenant(tenant);

  // 1. Contratos: tenta DB primeiro, cai pro ERP se não tiver.
  let { data: contracts } = await supabase
    .from('contracts')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false });

  if ((!contracts || contracts.length === 0) && customer.external_id) {
    try {
      const fresh = await adapter.listContractsByCustomer(customer.external_id);
      for (const c of fresh) {
        await supabase.from('contracts').upsert(
          {
            tenant_id: tenant.id,
            customer_id: customer.id,
            external_id: c.externalId,
            status: c.status,
            pppoe_user: c.pppoeUser,
            due_day: c.dueDay,
            monthly_price_cents: c.monthlyPriceCents,
            installation_address: c.installationAddress,
            activated_at: c.activatedAt,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,external_id' },
        );
      }
      ({ data: contracts } = await supabase
        .from('contracts').select('*')
        .eq('tenant_id', tenant.id).eq('customer_id', customer.id));
    } catch (e) {
      console.error('[portal] contract sync failed', e);
    }
  }

  const contract: Contract | null = contracts?.[0] ?? null;

  const { data: plan } = contract?.plan_id
    ? await supabase.from('plans').select('*').eq('id', contract.plan_id).single()
    : { data: null as Plan | null };

  // 2. Faturas — sempre busca do ERP para garantir frescor de status/Pix.
  let openInvoice: Invoice | null = null;
  let recentInvoices: Invoice[] = [];
  if (contract?.external_id) {
    try {
      const fresh = await adapter.listInvoicesByContract(contract.external_id);
      for (const inv of fresh) {
        await supabase.from('invoices').upsert(
          {
            tenant_id: tenant.id,
            contract_id: contract.id,
            external_id: inv.externalId,
            reference_month: inv.referenceMonth,
            due_date: inv.dueDate,
            amount_cents: inv.amountCents,
            status: inv.status,
            pix_copy_paste: inv.pixCopyPaste,
            pix_qr_code: inv.pixQrCode,
            boleto_line: inv.boletoLine,
            boleto_pdf_url: inv.boletoPdfUrl,
            nfe_url: inv.nfeUrl,
            paid_at: inv.paidAt,
            paid_amount_cents: inv.paidAmountCents,
            paid_method: inv.paidMethod,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,external_id' },
        );
      }
    } catch (e) {
      console.error('[portal] invoice sync failed', e);
    }

    const { data: openRows } = await supabase
      .from('invoices')
      .select('*')
      .eq('contract_id', contract.id)
      .in('status', ['open', 'overdue', 'partial'])
      .order('due_date', { ascending: true })
      .limit(1);
    openInvoice = openRows?.[0] ?? null;

    const { data: recent } = await supabase
      .from('invoices')
      .select('*')
      .eq('contract_id', contract.id)
      .order('due_date', { ascending: false })
      .limit(5);
    recentInvoices = recent ?? [];
  }

  const props = {
    tenant,
    customer,
    contract,
    plan: plan as Plan | null,
    openInvoice,
    recentInvoices,
  };

  const Layout = tenant.layout === 'v2' ? HomeV2 : tenant.layout === 'v3' ? HomeV3 : HomeV1;

  return (
    <div className="md:flex">
      <BottomNav />
      <main className="flex-1 min-h-screen">
        <Layout {...props} />
      </main>
    </div>
  );
}
