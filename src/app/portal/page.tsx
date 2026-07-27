import { redirect } from 'next/navigation';
import { requireTenant } from '@/lib/tenant/resolve';
import { getCurrentCustomer } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdapterForTenant } from '@/lib/erp';
import { PortalShell } from '@/components/portal/shell';
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
  const tenant = await requireTenant();
  const customer = await getCurrentCustomer(tenant.id);
  if (!customer) redirect('/login');

  const supabase = createAdminClient();
  const adapter = getAdapterForTenant(tenant);

  // 1. Contratos: tenta DB primeiro, cai pro ERP se não tiver.
  let { data: contracts } = await supabase
    .from('contracts')
    .select('*')
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
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,external_id' },
        );
      }
      ({ data: contracts } = await supabase
        .from('contracts').select('*')
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
  let plan: Plan | null = null;
  if (contract?.plan_id) {
    const { data } = await supabase.from('plans').select('*').eq('id', contract.plan_id).single();
    plan = (data ?? null) as Plan | null;
  }
  if (!plan && contract?.external_id && customer.external_id) {
    plan = await ensurePlanFromContract(supabase, tenant, contract, adapter, customer.external_id);
  }

  // 2. Faturas — uma gravação só, com todas de uma vez. Gravar uma a uma
  // custava ~15s de carregamento com 60 faturas, porque cada upsert é uma
  // viagem até o banco.
  let openInvoice: Invoice | null = null;
  let recentInvoices: Invoice[] = [];
  if (contract?.external_id) {
    const syncedAt = contract.last_synced_at ? new Date(contract.last_synced_at).getTime() : 0;
    const stale = Date.now() - syncedAt > 5 * 60_000;

    if (stale) {
      try {
        const fresh = await adapter.listInvoicesByContract(contract.external_id);
        if (fresh.length) {
          const now = new Date().toISOString();
          await supabase.from('invoices').upsert(
            fresh.map((inv) => ({
              tenant_id: tenant.id,
              contract_id: contract.id,
              external_id: inv.externalId,
              reference_month: inv.referenceMonth,
              due_date: inv.dueDate,
              amount_cents: inv.amountCents,
              status: inv.status,
              pix_copy_paste: inv.pixCopyPaste,
              pix_qr_code: inv.pixQrCode,
              boleto_line: inv.boletoLine,
              boleto_pdf_url: inv.boletoPdfUrl,
              nfe_url: inv.nfeUrl,
              paid_at: inv.paidAt,
              paid_amount_cents: inv.paidAmountCents,
              paid_method: inv.paidMethod,
              last_synced_at: now,
            })) as never,
            { onConflict: 'tenant_id,external_id' },
          );
          await supabase.from('contracts').update({ last_synced_at: now } as never).eq('id', contract.id);
        }
      } catch (e) {
        console.error('[portal] invoice sync failed', e);
      }
    }

    // A fatura em destaque é a mais antiga ainda não paga: se há atraso, é a
    // atrasada que precisa aparecer, não a próxima a vencer.
    const { data: openRows } = await supabase
      .from('invoices')
      .select('*')
      .eq('contract_id', contract.id)
      .in('status', ['open', 'overdue', 'partial'])
      .order('due_date', { ascending: true })
      .limit(1);
    openInvoice = openRows?.[0] ?? null;

    // Histórico: as próximas a vencer primeiro (setembro, outubro…), depois
    // as pagas mais recentes. A fatura em destaque não se repete na lista.
    const { data: upcoming } = await supabase
      .from('invoices')
      .select('*')
      .eq('contract_id', contract.id)
      .in('status', ['open', 'overdue', 'partial'])
      .order('due_date', { ascending: true })
      .limit(6);

    const { data: settled } = await supabase
      .from('invoices')
      .select('*')
      .eq('contract_id', contract.id)
      .eq('status', 'paid')
      .order('due_date', { ascending: false })
      .limit(3);

    recentInvoices = [
      ...(upcoming ?? []).filter((i) => i.id !== openInvoice?.id),
      ...(settled ?? []),
    ].slice(0, 5);
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
  };

  const Home = tenant.layout === 'v2' ? HomeV2 : tenant.layout === 'v3' ? HomeV3 : HomeV1;

  return (
    <PortalShell tenant={tenant} customer={customer} wide>
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
