import { notFound, redirect } from 'next/navigation';
import { requireTenant } from '@/lib/tenant/resolve';
import { getCurrentCustomer } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdapterForTenant } from '@/lib/erp';
import { PortalShell } from '@/components/portal/shell';
import { InvoiceScreen } from '@/components/portal/invoice-screen';
import { InvoiceHeader } from './invoice-header';
import type { Invoice, Plan } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireTenant();
  const customer = await getCurrentCustomer(tenant.id);
  if (!customer) redirect('/login');

  const { id } = await params;
  const supabase = createAdminClient();
  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', id).single();
  if (!invoice) notFound();

  const { data: contract } = await supabase
    .from('contracts').select('*').eq('id', invoice.contract_id).single();
  if (!contract || contract.customer_id !== customer.id) notFound();

  const { data: plan } = contract.plan_id
    ? await supabase.from('plans').select('*').eq('id', contract.plan_id).single()
    : { data: null as Plan | null };

  // O Pix é gerado pelo ERP na hora — o campo da fatura vem vazio em quem usa
  // gateway. Busca aqui, na abertura da tela, e guarda para a próxima visita.
  let record = invoice as Invoice;
  if (record.status !== 'paid' && record.status !== 'cancelled' && !record.pix_copy_paste && record.external_id) {
    try {
      const adapter = getAdapterForTenant(tenant);
      const pix = await adapter.getInvoicePix?.(record.external_id);
      if (pix?.copyPaste) {
        const qr = pix.qrImageBase64 ? `data:image/png;base64,${pix.qrImageBase64}` : null;
        record = { ...record, pix_copy_paste: pix.copyPaste, pix_qr_code: qr };
        await supabase
          .from('invoices')
          .update({ pix_copy_paste: pix.copyPaste, pix_qr_code: qr } as never)
          .eq('id', record.id);
      }
    } catch (e) {
      console.error('[portal] pix lookup failed', e);
    }
  }

  return (
    <PortalShell tenant={tenant} customer={customer}>
      <InvoiceHeader tenant={tenant} />
      <InvoiceScreen tenant={tenant} invoice={record} plan={plan as Plan | null} />
    </PortalShell>
  );
}
