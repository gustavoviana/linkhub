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

  // Contrato e plano na mesma ida ao banco — ler o plano depois, pelo plan_id,
  // era uma volta de rede a mais para uma linha só.
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('contracts')
    .select('*, plans(*)')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const contract = (data ?? null) as (Contract & { plans?: Plan | null }) | null;
  const plan = contract?.plans ?? null;

  return (
    <PortalShell tenant={tenant} customer={customer}>
      <AccountScreen
        tenant={tenant}
        customer={customer}
        contract={contract as Contract | null}
        plan={plan as Plan | null}
      />
    </PortalShell>
  );
}
