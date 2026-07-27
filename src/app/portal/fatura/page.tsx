import { redirect } from 'next/navigation';
import { requireTenant } from '@/lib/tenant/resolve';
import { getCurrentCustomer } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { PortalShell } from '@/components/portal/shell';
import { InvoiceList } from './invoice-list';
import type { Invoice } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function FaturasList() {
  const tenant = await requireTenant();
  const customer = await getCurrentCustomer(tenant.id);
  if (!customer) redirect('/login');

  const supabase = createAdminClient();
  const { data: contracts } = await supabase
    .from('contracts').select('id').eq('customer_id', customer.id);
  const contractIds = (contracts ?? []).map((c) => c.id);

  const { data: invoices } = contractIds.length
    ? await supabase
        .from('invoices')
        .select('*')
        .in('contract_id', contractIds)
        .order('due_date', { ascending: false })
        .limit(36)
    : { data: [] as Invoice[] };

  return (
    <PortalShell tenant={tenant} customer={customer}>
      <InvoiceList tenant={tenant} invoices={(invoices ?? []) as Invoice[]} />
    </PortalShell>
  );
}
