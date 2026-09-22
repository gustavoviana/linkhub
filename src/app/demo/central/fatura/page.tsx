import { PortalShell } from '@/components/portal/shell';
import { InvoiceList } from '@/app/portal/fatura/invoice-list';
import { demoContexto } from '@/lib/demo/server';

// A mesma lista do portal, com o histórico inteiro do assinante fictício.

export const dynamic = 'force-dynamic';

export default async function DemoFaturas() {
  const { tenant, data } = await demoContexto();

  return (
    <PortalShell tenant={tenant} customer={data.customer}>
      <InvoiceList tenant={tenant} invoices={data.invoices} />
    </PortalShell>
  );
}
