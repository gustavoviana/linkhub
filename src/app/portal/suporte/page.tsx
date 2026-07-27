import { redirect } from 'next/navigation';
import { requireTenant } from '@/lib/tenant/resolve';
import { getCurrentCustomer } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { PortalShell } from '@/components/portal/shell';
import { SupportScreen } from './support-screen';
import type { SupportTicket } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function SuportePage() {
  const tenant = await requireTenant();
  const customer = await getCurrentCustomer(tenant.id);
  if (!customer) redirect('/login');

  const supabase = createAdminClient();
  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('customer_id', customer.id)
    .order('opened_at', { ascending: false })
    .limit(20);

  return (
    <PortalShell tenant={tenant} customer={customer}>
      <SupportScreen tenant={tenant} tickets={(tickets ?? []) as SupportTicket[]} />
    </PortalShell>
  );
}
