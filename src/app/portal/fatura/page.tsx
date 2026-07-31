import { redirect } from 'next/navigation';
import { requireTenant } from '@/lib/tenant/resolve';
import { getCurrentCustomer } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { PortalShell } from '@/components/portal/shell';
import { RefreshOnMount } from '@/components/portal/refresh-on-mount';
import { InvoiceList } from './invoice-list';
import type { Invoice } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function FaturasList() {
  const tenant = await requireTenant();
  const customer = await getCurrentCustomer(tenant.id);
  if (!customer) redirect('/login');

  // Uma consulta só: antes buscávamos os contratos e depois as faturas, duas
  // voltas de rede em fila. O `contracts!inner` filtra pelo dono direto no
  // banco — o vínculo continua sendo o mesmo, só não volta pela metade do
  // caminho para perguntar.
  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from('invoices')
    .select('*, contracts!inner(customer_id)')
    .eq('contracts.customer_id', customer.id)
    .order('due_date', { ascending: false })
    .limit(36);

  const invoices = ((rows ?? []) as (Invoice & { contracts?: unknown })[]).map(
    ({ contracts: _vinculo, ...invoice }) => invoice as Invoice,
  );

  return (
    <PortalShell tenant={tenant} customer={customer}>
      <RefreshOnMount />
      <InvoiceList tenant={tenant} invoices={invoices} />
    </PortalShell>
  );
}
