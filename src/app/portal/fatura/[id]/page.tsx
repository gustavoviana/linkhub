import { notFound, redirect } from 'next/navigation';
import { requireTenant } from '@/lib/tenant/resolve';
import { getCurrentCustomer } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
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

  return (
    <PortalShell tenant={tenant} customer={customer}>
      <InvoiceHeader tenant={tenant} />
      <InvoiceScreen tenant={tenant} invoice={invoice as Invoice} plan={plan as Plan | null} />
    </PortalShell>
  );
}
