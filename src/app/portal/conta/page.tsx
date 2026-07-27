import { redirect } from 'next/navigation';
import { requireTenant } from '@/lib/tenant/resolve';
import { getCurrentCustomer } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { PortalShell } from '@/components/portal/shell';
import { AccountScreen } from './account-screen';
import type { Contract, Plan } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function ContaPage() {
  const tenant = await requireTenant();
  const customer = await getCurrentCustomer(tenant.id);
  if (!customer) redirect('/login');

  const supabase = createAdminClient();
  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: plan } = contract?.plan_id
    ? await supabase.from('plans').select('*').eq('id', contract.plan_id).single()
    : { data: null as Plan | null };

  return (
    <PortalShell tenant={tenant} customer={customer}>
      <AccountScreen
        tenant={tenant}
        customer={customer}
        contract={(contract ?? null) as Contract | null}
        plan={(plan ?? null) as Plan | null}
      />
    </PortalShell>
  );
}
