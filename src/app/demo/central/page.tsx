import { PortalShell } from '@/components/portal/shell';
import { HomeV1 } from '@/components/portal/home-v1';
import { HomeV2 } from '@/components/portal/home-v2';
import { HomeV3 } from '@/components/portal/home-v3';
import { WebDashboard } from '@/components/portal/web-dashboard';
import { demoContexto } from '@/lib/demo/server';

// A visão geral, igual à do portal: no celular um dos três layouts, no
// desktop o painel completo. Sem <RefreshOnMount/> — não há ERP para
// consultar atrás desta tela, e a chamada só voltaria 401.

export const dynamic = 'force-dynamic';

export default async function DemoHome() {
  const { tenant, data } = await demoContexto();

  const props = {
    tenant,
    customer: data.customer,
    contract: data.contract,
    plan: data.plan,
    openInvoice: data.openInvoice,
    recentInvoices: data.recentInvoices,
    connection: data.connection,
    usage: data.usage,
  };

  const Home = tenant.layout === 'v2' ? HomeV2 : tenant.layout === 'v3' ? HomeV3 : HomeV1;

  return (
    <PortalShell tenant={tenant} customer={data.customer} wide>
      <div className="lg:hidden">
        <Home {...props} />
      </div>
      <div className="hidden lg:block">
        <WebDashboard {...props} />
      </div>
    </PortalShell>
  );
}
