import { redirect } from 'next/navigation';
import { getPortalSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdapterForTenant } from '@/lib/erp';
import { PortalShell } from '@/components/portal/shell';
import { RefreshOnMount } from '@/components/portal/refresh-on-mount';
import { sincronizarFaturas } from '@/lib/portal/sync-invoices';
import { HomeV1 } from '@/components/portal/home-v1';
import { HomeV2 } from '@/components/portal/home-v2';
import { HomeV3 } from '@/components/portal/home-v3';
import { WebDashboard } from '@/components/portal/web-dashboard';
import type { Contract, Invoice, Plan, Tenant } from '@/lib/supabase/types';
import type { ErpAdapter, ErpConnection, ErpUsagePoint } from '@/lib/erp/types';

export const dynamic = 'force-dynamic';

/**
 * Garante que o plano do contrato exista no catálogo. Tenta casar pelo id do
 * ERP; se o provedor nunca sincronizou planos, cria a partir do que o próprio
 * contrato informa (nome e velocidades) e vincula.
 */
async function ensurePlanFromContract(
  supabase: ReturnType<typeof createAdminClient>,
  tenant: Tenant,
  contract: Contract,
  adapter: ErpAdapter,
  customerExternalId: string,
): Promise<Plan | null> {
  try {
    const source =
      (await adapter.listContractsByCustomer(customerExternalId)).find(
        (c) => c.externalId === contract.external_id,
      ) ?? null;
    const externalId = source?.planExternalId ?? null;
    const name = source?.planName;
    if (!externalId && !name) return null;

    if (externalId) {
      const { data: existing } = await supabase
        .from('plans')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('external_id', externalId)
        .maybeSingle();
      if (existing) {
        await supabase.from('contracts').update({ plan_id: (existing as Plan).id } as never).eq('id', contract.id);
        return existing as Plan;
      }
    }

    const { data: created } = await supabase
      .from('plans')
      .upsert(
        {
          tenant_id: tenant.id,
          external_id: externalId ?? `contrato-${contract.external_id}`,
          name: name ?? 'Plano contratado',
          down_mbps: source?.planDownMbps ?? null,
          up_mbps: source?.planUpMbps ?? null,
          price_cents: contract.monthly_price_cents ?? 0,
          active: true,
        },
        { onConflict: 'tenant_id,external_id' },
      )
      .select('*')
      .single();

    if (created) {
      await supabase.from('contracts').update({ plan_id: (created as Plan).id } as never).eq('id', contract.id);
      return created as Plan;
    }
  } catch (e) {
    console.error('[portal] plan materialization failed', e);
  }
  return null;
}

export default async function PortalHome() {
  const { tenant, customer } = await getPortalSession();
  if (!customer) redirect('/login');

  const supabase = createAdminClient();
  const adapter = getAdapterForTenant(tenant);

  // 1. Contratos: tenta DB primeiro, cai pro ERP se não tiver.
  // O plano vem junto no mesmo pedido (`plans(*)`): buscar depois, pelo
  // plan_id, era mais uma volta de rede inteira só para ler uma linha.
  let { data: contracts } = await supabase
    .from('contracts')
    .select('*, plans(*)')
    .eq('tenant_id', tenant.id)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false });

  if ((!contracts || contracts.length === 0) && customer.external_id) {
    try {
      const fresh = await adapter.listContractsByCustomer(customer.external_id);
      for (const c of fresh) {
        await supabase.from('contracts').upsert(
          {
            tenant_id: tenant.id,
            customer_id: customer.id,
            external_id: c.externalId,
            status: c.status,
            pppoe_user: c.pppoeUser,
            due_day: c.dueDay,
            monthly_price_cents: c.monthlyPriceCents,
            installation_address: c.installationAddress,
            activated_at: c.activatedAt,
            // Sem last_synced_at aqui de propósito: o contrato acabou de ser
            // descoberto, as faturas dele nunca foram buscadas. Marcá-lo como
            // sincronizado no nascimento fazia a atualização de fundo se achar
            // em dia e não rodar pelos 5 minutos seguintes — foi o que deixou
            // a central dizendo "tudo em dia" para quem tinha conta vencida.
          },
          { onConflict: 'tenant_id,external_id' },
        );
      }
      ({ data: contracts } = await supabase
        .from('contracts').select('*, plans(*)')
        .eq('tenant_id', tenant.id).eq('customer_id', customer.id));
    } catch (e) {
      console.error('[portal] contract sync failed', e);
    }
  }

  const contract: Contract | null = contracts?.[0] ?? null;

  // O plano do assinante vem no próprio contrato em vários ERPs (o IXC manda
  // "MARAUNET-PLANO-500X500 2026"). Se ele ainda não existe no catálogo,
  // materializamos aqui — senão a central mostraria "sem plano vinculado"
  // com o plano na cara do cliente lá no sistema do provedor.
  let plan: Plan | null =
    ((contract as (Contract & { plans?: Plan | null }) | null)?.plans as Plan | null) ?? null;
  if (!plan && contract?.external_id && customer.external_id) {
    plan = await ensurePlanFromContract(supabase, tenant, contract, adapter, customer.external_id);
  }

  // 2. Faturas.
  //
  // As duas consultas saem juntas, não em fila: são independentes e cada ida ao
  // banco custa uma volta de rede inteira. A fatura em destaque é a primeira das
  // em aberto — a mais antiga ainda não paga, porque se há atraso é a atrasada
  // que precisa aparecer, e não a próxima a vencer.
  let openInvoice: Invoice | null = null;
  let recentInvoices: Invoice[] = [];
  // Enquanto o contrato nunca sincronizou e não há fatura nenhuma no banco,
  // não sabemos se o assinante deve algo — e a tela não pode dizer que sabe.
  let aguardandoFaturas = false;
  if (contract) {
    const carregarFaturas = async () => {
      const [abertas, pagas] = await Promise.all([
        supabase
          .from('invoices')
          .select('*')
          .eq('contract_id', contract.id)
          .in('status', ['open', 'overdue', 'partial'])
          .order('due_date', { ascending: true })
          // Todas as em aberto: cortar em seis escondia conta a pagar de quem
          // está com o carnê do ano inteiro em atraso.
          .limit(24),
        supabase
          .from('invoices')
          .select('*')
          .eq('contract_id', contract.id)
          .eq('status', 'paid')
          .order('due_date', { ascending: false })
          .limit(3),
      ]);
      return {
        abertas: (abertas.data ?? []) as Invoice[],
        pagas: (pagas.data ?? []) as Invoice[],
      };
    };

    let { abertas, pagas } = await carregarFaturas();

    // Primeira visita do assinante: sem nada no banco a central sairia vazia,
    // então aqui vale esperar o ERP. Nas outras vezes quem atualiza é o
    // <RefreshOnMount/>, depois da tela pintada.
    if (!abertas.length && !pagas.length && contract.external_id) {
      await sincronizarFaturas(supabase, tenant.id, contract, adapter);
      ({ abertas, pagas } = await carregarFaturas());
    }

    openInvoice = abertas[0] ?? null;

    // A lista embaixo do destaque é o que ainda falta pagar — todas elas, sem
    // corte, e sem misturar pagas no meio (era o que fazia a lista de contas a
    // vencer se chamar "últimas faturas"). Só quando não há nada em aberto é
    // que ela vira histórico; o resto está em "Ver todas".
    const restantes = abertas.slice(1);
    recentInvoices = restantes.length ? restantes : pagas;
    aguardandoFaturas = !abertas.length && !pagas.length && !contract.last_synced_at;
  }

  // Conexão e consumo são ao vivo: nada disso fica no nosso banco, é sempre
  // o que o ERP responde agora. Falha aqui não pode derrubar a central.
  let connection: ErpConnection | null = null;
  let usage: ErpUsagePoint[] = [];
  if (contract?.external_id) {
    try {
      connection = (await adapter.getConnection?.(contract.external_id)) ?? null;
    } catch (e) {
      console.error('[portal] connection lookup failed', e);
    }
    try {
      // Reaproveita o login que já veio da conexão — sem isso o adapter
      // consultaria o ERP de novo só para descobrir o mesmo usuário.
      // Só o período padrão vem no HTML; "hoje" e "30 dias" são buscados
      // pelo gráfico quando o assinante troca, em /api/portal/consumo.
      usage = (await adapter.getUsage?.(contract.external_id, '7d', connection?.login)) ?? [];
    } catch (e) {
      console.error('[portal] usage lookup failed', e);
    }
  }

  const props = {
    tenant,
    customer,
    contract,
    plan: plan as Plan | null,
    openInvoice,
    recentInvoices,
    connection,
    usage,
    aguardandoFaturas,
  };

  const Home = tenant.layout === 'v2' ? HomeV2 : tenant.layout === 'v3' ? HomeV3 : HomeV1;

  return (
    <PortalShell tenant={tenant} customer={customer} wide>
      <RefreshOnMount />
      {/* Celular: um dos três layouts escolhidos pelo provedor. */}
      <div className="lg:hidden">
        <Home {...props} />
      </div>
      {/* Desktop: painel completo, com KPIs e histórico lado a lado. */}
      <div className="hidden lg:block">
        <WebDashboard {...props} />
      </div>
    </PortalShell>
  );
}
