import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireTenant } from '@/lib/tenant/resolve';
import { getCurrentCustomer } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { BottomNav } from '@/components/portal/bottom-nav';
import { Badge } from '@/components/ui/badge';
import { formatBRL, formatDate } from '@/lib/utils';

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
    : { data: [] };

  return (
    <div className="md:flex">
      <BottomNav />
      <main className="flex-1 min-h-screen pb-24 md:pb-0">
        <div className="max-w-md mx-auto md:max-w-3xl px-4 py-6">
          <h1 className="text-2xl font-bold mb-1">Suas faturas</h1>
          <p className="text-sm text-fg-2 mb-6">Pague com Pix, baixe boleto ou veja NFSe</p>

          <div className="space-y-2">
            {!invoices?.length ? (
              <div className="text-center text-fg-2 py-10">Nenhuma fatura encontrada.</div>
            ) : (
              invoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/fatura/${inv.id}`}
                  className="flex items-center gap-3 bg-bg-2 border border-border rounded-xl p-4 hover:border-brand transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      {inv.reference_month
                        ? new Date(inv.reference_month).toLocaleDateString('pt-BR', {
                            month: 'long',
                            year: 'numeric',
                          })
                        : formatDate(inv.due_date)}
                    </div>
                    <div className="text-xs text-fg-2 mt-0.5">
                      Vence {formatDate(inv.due_date)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold tabular-nums">
                      {formatBRL(inv.amount_cents)}
                    </div>
                    <Badge
                      className="mt-1"
                      tone={
                        inv.status === 'paid'
                          ? 'success'
                          : inv.status === 'overdue'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {inv.status}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
