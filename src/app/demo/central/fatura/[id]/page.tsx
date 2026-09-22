import { notFound } from 'next/navigation';
import { PortalShell } from '@/components/portal/shell';
import { InvoiceScreen } from '@/components/portal/invoice-screen';
import { InvoiceHeader } from '@/app/portal/fatura/[id]/invoice-header';
import { demoContexto } from '@/lib/demo/server';

// A tela de pagamento — a que o provedor mais quer mostrar. Pix com QR e
// copia-e-cola, boleto com linha digitável e PDF, detalhes da cobrança.
// Tudo o que o portal de verdade mostra, com uma fatura que não existe.

export const dynamic = 'force-dynamic';

export default async function DemoFatura({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant, data } = await demoContexto();

  const invoice = data.invoices.find((i) => i.id === id);
  if (!invoice) notFound();

  return (
    <PortalShell tenant={tenant} customer={data.customer}>
      <InvoiceHeader tenant={tenant} />
      <InvoiceScreen tenant={tenant} invoice={invoice} plan={data.plan} />
    </PortalShell>
  );
}
