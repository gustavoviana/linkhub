import { redirect } from 'next/navigation';
import { getPortalSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { PortalShell } from '@/components/portal/shell';
import { mensalidadeDeFaturas } from '@/lib/portal/mensalidade';
import { AccountScreen } from './account-screen';
import type { Contract, Plan } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function ContaPage() {
  const { tenant, customer } = await getPortalSession();
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

  // Mensalidade: o ERP nem sempre manda (o SGP não manda). Quando falta, o
  // valor sai do histórico de faturas — ver mensalidadeDeFaturas. A consulta
  // extra só acontece nesse caso; quem tem o valor no contrato nem passa aqui.
  let mensalidadeCents = contract?.monthly_price_cents || plan?.price_cents || null;
  if (!mensalidadeCents && contract) {
    const { data: ultimas } = await supabase
      .from('invoices')
      .select('amount_cents')
      .eq('contract_id', contract.id)
      .neq('status', 'cancelled')
      .order('due_date', { ascending: false })
      .limit(6);
    mensalidadeCents = mensalidadeDeFaturas(
      ((ultimas ?? []) as { amount_cents: number | null }[]).map((i) => i.amount_cents),
    );
  }

  return (
    <PortalShell tenant={tenant} customer={customer}>
      <AccountScreen
        tenant={tenant}
        customer={customer}
        contract={contract as Contract | null}
        plan={plan as Plan | null}
        mensalidadeCents={mensalidadeCents}
      />
    </PortalShell>
  );
}
