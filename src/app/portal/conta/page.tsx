import { redirect } from 'next/navigation';
import { requireTenant } from '@/lib/tenant/resolve';
import { getCurrentCustomer } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { BottomNav } from '@/components/portal/bottom-nav';
import { Button } from '@/components/ui/button';
import { maskCpfCnpj, maskPhone } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ContaPage() {
  const tenant = await requireTenant();
  const customer = await getCurrentCustomer(tenant.id);
  if (!customer) redirect('/login');

  const supabase = createAdminClient();
  const { data: contract } = await supabase
    .from('contracts').select('*')
    .eq('customer_id', customer.id).order('created_at', { ascending: false }).limit(1).single();
  const { data: plan } = contract?.plan_id
    ? await supabase.from('plans').select('*').eq('id', contract.plan_id).single()
    : { data: null };

  return (
    <div className="md:flex">
      <BottomNav />
      <main className="flex-1 min-h-screen pb-24 md:pb-0">
        <div className="max-w-md mx-auto md:max-w-2xl px-4 py-6">
          <h1 className="text-2xl font-bold mb-6">Minha conta</h1>

          <section className="bg-bg-2 border border-border rounded-2xl p-5 mb-4">
            <div className="text-xs uppercase tracking-wider text-fg-2 font-semibold mb-3">
              Dados pessoais
            </div>
            <DL label="Nome" value={customer.name} />
            <DL label="CPF/CNPJ" value={maskCpfCnpj(customer.cpf_cnpj)} />
            <DL label="E-mail" value={customer.email ?? '—'} />
            <DL label="Telefone" value={maskPhone(customer.phone)} />
          </section>

          {customer.address_city && (
            <section className="bg-bg-2 border border-border rounded-2xl p-5 mb-4">
              <div className="text-xs uppercase tracking-wider text-fg-2 font-semibold mb-3">
                Endereço de instalação
              </div>
              <p className="text-sm leading-relaxed">
                {customer.address_street}, {customer.address_number}
                {customer.address_complement && ` — ${customer.address_complement}`}
                <br />
                {customer.address_district} · {customer.address_city}/{customer.address_state}
                <br />
                CEP {customer.address_zip}
              </p>
            </section>
          )}

          {contract && plan && (
            <section className="bg-bg-2 border border-border rounded-2xl p-5 mb-4">
              <div className="text-xs uppercase tracking-wider text-fg-2 font-semibold mb-3">
                Meu plano
              </div>
              <div className="font-semibold text-base">{plan.name}</div>
              <div className="text-sm text-fg-2 mb-3">
                {plan.down_mbps} / {plan.up_mbps} Mbps
              </div>
              <DL label="Status" value={contract.status} />
              <DL label="Vencimento" value={contract.due_day ? `dia ${contract.due_day}` : '—'} />
              <DL label="Usuário PPPoE" value={contract.pppoe_user ?? '—'} />
            </section>
          )}

          <form action="/auth/logout" method="post">
            <Button type="submit" variant="outline" className="w-full">
              Sair
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}

function DL({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-2 text-sm border-b border-border last:border-0">
      <span className="text-fg-2">{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
