import { PortalShell } from '@/components/portal/shell';
import { AccountScreen } from '@/app/portal/conta/account-screen';
import { demoContexto } from '@/lib/demo/server';

export const dynamic = 'force-dynamic';

export default async function DemoConta() {
  const { tenant, data } = await demoContexto();

  return (
    <PortalShell tenant={tenant} customer={data.customer}>
      <AccountScreen
        tenant={tenant}
        customer={data.customer}
        contract={data.contract}
        plan={data.plan}
        mensalidadeCents={data.contract.monthly_price_cents}
      />
    </PortalShell>
  );
}
