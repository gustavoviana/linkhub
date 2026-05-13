import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { requireTenant } from '@/lib/tenant/resolve';
import { getCurrentCustomer } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { BottomNav } from '@/components/portal/bottom-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatBRL, formatDate } from '@/lib/utils';
import { IconArrow, IconBarcode, IconDownload, IconPix } from '@/components/portal/icons';
import CopyButton from './copy-button';

export const dynamic = 'force-dynamic';

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireTenant();
  const customer = await getCurrentCustomer(tenant.id);
  if (!customer) redirect('/login');

  const { id } = await params;
  const supabase = createAdminClient();
  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', id).single();
  if (!invoice) notFound();

  const { data: contract } = await supabase.from('contracts').select('*').eq('id', invoice.contract_id).single();
  if (!contract || contract.customer_id !== customer.id) notFound();

  return (
    <div className="md:flex">
      <BottomNav />
      <main className="flex-1 min-h-screen pb-24 md:pb-0">
        <div className="max-w-md mx-auto md:max-w-2xl px-4 py-6">
          <Link href="/fatura" className="inline-flex items-center gap-1 text-sm text-fg-2 mb-4">
            <IconArrow size={14} className="rotate-180" /> Voltar
          </Link>

          <div className="bg-bg-2 border border-border rounded-2xl p-6 mb-4 text-center">
            <div className="text-xs uppercase tracking-wider text-fg-2 font-semibold mb-2">
              Total a pagar
            </div>
            <div className="text-4xl font-bold font-mono tabular-nums">
              {formatBRL(invoice.amount_cents)}
            </div>
            <div className="text-sm text-fg-2 mt-2">Vence {formatDate(invoice.due_date)}</div>
            <Badge
              className="mt-3"
              tone={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'danger' : 'warning'}
            >
              {invoice.status === 'paid'
                ? 'Pago'
                : invoice.status === 'overdue'
                ? 'Em atraso'
                : 'Em aberto'}
            </Badge>
          </div>

          {invoice.status !== 'paid' && invoice.pix_copy_paste && (
            <section className="bg-bg-2 border border-border rounded-2xl p-5 mb-4">
              <header className="flex items-center gap-2 mb-3">
                <IconPix size={18} className="text-success" />
                <h3 className="font-semibold">Pague com Pix</h3>
              </header>
              <div className="bg-bg-3 rounded-lg p-3 mb-3 font-mono text-[11px] break-all leading-relaxed">
                {invoice.pix_copy_paste}
              </div>
              <CopyButton text={invoice.pix_copy_paste} label="Copiar código Pix" />
            </section>
          )}

          {invoice.status !== 'paid' && invoice.boleto_line && (
            <section className="bg-bg-2 border border-border rounded-2xl p-5 mb-4">
              <header className="flex items-center gap-2 mb-3">
                <IconBarcode size={18} />
                <h3 className="font-semibold">Boleto bancário</h3>
              </header>
              <div className="bg-bg-3 rounded-lg p-3 mb-3 font-mono text-[11px] text-center tracking-wider">
                {invoice.boleto_line}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <CopyButton text={invoice.boleto_line} label="Copiar linha" />
                {invoice.boleto_pdf_url && (
                  <Link href={invoice.boleto_pdf_url} target="_blank">
                    <Button variant="outline" className="w-full">
                      <IconDownload size={14} /> PDF
                    </Button>
                  </Link>
                )}
              </div>
            </section>
          )}

          {invoice.nfe_url && (
            <Link href={invoice.nfe_url} target="_blank">
              <Button variant="outline" className="w-full">
                <IconDownload size={14} /> Baixar NFSe
              </Button>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
