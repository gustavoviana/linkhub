import 'server-only';
import type { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { getAdapterForTenant } from '@/lib/erp';
import { precisaAtualizar, sincronizarFaturas } from '@/lib/portal/sync-invoices';
import { enviar, emParalelo, pushConfigurado } from './send';
import { HORA_MAX, HORA_MIN, agoraEmBrasilia, preencher, somarDias } from './text';

// Quem decide o que sai e quando.
//
// Chamado a cada 15 minutos pelo /api/cron/push. Cada rodada faz duas coisas:
// manda as mensagens manuais cujo horário chegou, e roda as regras de fatura
// cuja hora já passou hoje. As duas terminam no mesmo lugar — linhas em
// push_deliveries com dedupe_key —, e é essa chave que impede aviso repetido
// quando duas rodadas se cruzam ou uma rodada cai no meio.

type Admin = ReturnType<typeof createAdminClient>;

const ABERTAS = ['open', 'overdue', 'partial'];
/** Envio preso em 'sending' há mais que isso caiu no meio: volta para a fila. */
const PRESO_MS = 10 * 60_000;
/** Aviso de fatura vencida só sai com status conferido no ERP há menos que isso. */
const CONFERIDO_MS = 26 * 3600_000;
const PARALELO = 20;

interface Campanha {
  id: string;
  tenant_id: string;
  kind: 'manual' | 'rule';
  title: string;
  body: string;
  url: string;
}

interface Pendente {
  id: string;
  invoice: { id: string; amount_cents: number; due_date: string; status: string } | null;
  subscription: {
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    customer: { name: string | null } | null;
  } | null;
}

/**
 * Entrega tudo o que está pendente num envio. Também recolhe o que uma
 * rodada anterior deixou pela metade — a linha existe, mas nunca saiu.
 */
async function entregarPendentes(admin: Admin, campanha: Campanha) {
  const { data } = await admin
    .from('push_deliveries')
    .select(
      'id, invoice:invoices(id, amount_cents, due_date, status), subscription:push_subscriptions(id, endpoint, p256dh, auth, customer:customers(name))',
    )
    .eq('campaign_id', campanha.id)
    .eq('status', 'pending')
    .limit(5000);

  let enviados = 0;
  let falhas = 0;

  await emParalelo((data ?? []) as unknown as Pendente[], PARALELO, async (p) => {
    // Aparelho saiu da lista, ou fatura paga entre a regra e o envio: não é
    // falha, é aviso que não precisa mais existir.
    const fatura = p.invoice;
    if (!p.subscription || (campanha.kind === 'rule' && (!fatura || !ABERTAS.includes(fatura.status)))) {
      await admin.from('push_deliveries').delete().eq('id', p.id);
      return;
    }

    const dados = {
      nome: p.subscription.customer?.name,
      valorCents: fatura?.amount_cents,
      vencimento: fatura?.due_date,
    };
    const { resultado, erro } = await enviar(admin, p.subscription, {
      title: preencher(campanha.title, dados),
      body: preencher(campanha.body, dados),
      url: campanha.kind === 'rule' && fatura ? `/fatura/${fatura.id}` : campanha.url,
      d: p.id,
    });

    if (resultado === 'sent') enviados++;
    else falhas++;
    await admin
      .from('push_deliveries')
      .update({ status: resultado === 'sent' ? 'sent' : 'failed', error: erro ?? null } as never)
      .eq('id', p.id);
  });

  return { enviados, falhas };
}

/**
 * Manda uma mensagem manual para todos os aparelhos do provedor. Só quem
 * consegue passar a mensagem de 'scheduled' para 'sending' envia: duas
 * rodadas ao mesmo tempo não mandam duas vezes.
 */
export async function enviarCampanha(admin: Admin, campanhaId: string) {
  const { data } = await admin
    .from('push_campaigns')
    .update({ status: 'sending' } as never)
    .eq('id', campanhaId)
    .eq('status', 'scheduled')
    .select('id, tenant_id, kind, title, body, url')
    .maybeSingle();
  const campanha = data as Campanha | null;
  if (!campanha) return null;

  const { data: aparelhos } = await admin
    .from('push_subscriptions')
    .select('id')
    .eq('tenant_id', campanha.tenant_id)
    .limit(20000);

  const linhas = ((aparelhos ?? []) as { id: string }[]).map((a) => ({
    campaign_id: campanha.id,
    subscription_id: a.id,
    dedupe_key: `c:${campanha.id}:${a.id}`,
  }));
  for (let i = 0; i < linhas.length; i += 1000) {
    await admin
      .from('push_deliveries')
      .upsert(linhas.slice(i, i + 1000) as never, { onConflict: 'dedupe_key', ignoreDuplicates: true });
  }

  const r = await entregarPendentes(admin, campanha);
  await admin
    .from('push_campaigns')
    .update({ status: 'sent', sent_at: new Date().toISOString() } as never)
    .eq('id', campanha.id);
  return r;
}

/** Mensagens manuais cujo horário chegou — e as que caíram no meio. */
async function processarAgendadas(admin: Admin, agora: Date) {
  await admin
    .from('push_campaigns')
    .update({ status: 'scheduled' } as never)
    .eq('kind', 'manual')
    .eq('status', 'sending')
    .lt('scheduled_at', new Date(agora.getTime() - PRESO_MS).toISOString());

  const { data } = await admin
    .from('push_campaigns')
    .select('id')
    .eq('kind', 'manual')
    .eq('status', 'scheduled')
    .lte('scheduled_at', agora.toISOString())
    .order('scheduled_at')
    .limit(20);

  let enviadas = 0;
  for (const { id } of (data ?? []) as { id: string }[]) {
    if (await enviarCampanha(admin, id)) enviadas++;
  }
  return enviadas;
}

interface Regra {
  id: string;
  tenant_id: string;
  days_offset: number;
  send_hour: number;
  title: string;
  body: string;
}

/**
 * Uma regra, uma rodada: acha as faturas abertas com o vencimento certo,
 * confere no ERP as de quem tem aparelho e entrega.
 */
async function rodarRegra(admin: Admin, regra: Regra, hoje: string) {
  const vencimento = somarDias(hoje, -regra.days_offset);
  let enviados = 0;

  // A regra roda a cada 15 minutos depois da hora marcada. O que uma rodada
  // anterior de hoje já avisou fica de fora — sem isso, cada rodada voltaria
  // a consultar o ERP pelas mesmas faturas até as 21h. E o que ela deixou
  // pela metade sai agora.
  const { data: rodadaDeHoje } = await admin
    .from('push_campaigns')
    .select('id, tenant_id, kind, title, body, url')
    .eq('rule_id', regra.id)
    .eq('run_date', hoje)
    .maybeSingle();
  const jaAvisadas = new Set<string>();
  if (rodadaDeHoje) {
    enviados += (await entregarPendentes(admin, rodadaDeHoje as Campanha)).enviados;
    const { data: feitas } = await admin
      .from('push_deliveries')
      .select('invoice_id')
      .eq('campaign_id', (rodadaDeHoje as Campanha).id);
    for (const f of (feitas ?? []) as { invoice_id: string | null }[]) if (f.invoice_id) jaAvisadas.add(f.invoice_id);
  }

  const { data: todas } = await admin
    .from('invoices')
    .select('id, contract_id')
    .eq('tenant_id', regra.tenant_id)
    .eq('due_date', vencimento)
    .in('status', ABERTAS)
    .limit(5000);
  const faturas = ((todas ?? []) as { id: string; contract_id: string }[]).filter((f) => !jaAvisadas.has(f.id));
  if (!faturas.length) return enviados;

  const contratoIds = [...new Set(faturas.map((f) => f.contract_id))];
  const { data: contratos } = await admin
    .from('contracts')
    .select('id, customer_id, external_id, monthly_price_cents')
    .in('id', contratoIds);
  const contratoPorId = new Map(
    ((contratos ?? []) as { id: string; customer_id: string; external_id: string | null; monthly_price_cents: number | null }[]).map(
      (c) => [c.id, c],
    ),
  );

  const clientes = [...new Set([...contratoPorId.values()].map((c) => c.customer_id))];
  const { data: aparelhos } = await admin
    .from('push_subscriptions')
    .select('id, customer_id')
    .in('customer_id', clientes);
  if (!aparelhos?.length) return enviados;
  const aparelhosPorCliente = new Map<string, string[]>();
  for (const a of aparelhos as { id: string; customer_id: string }[]) {
    aparelhosPorCliente.set(a.customer_id, [...(aparelhosPorCliente.get(a.customer_id) ?? []), a.id]);
  }

  // Só quem vai receber passa pelo ERP: a sincronização de 6 em 6 horas pode
  // não ter visto o Pix de ontem à noite, e cobrar fatura paga é o pior aviso
  // possível. Erro do ERP não para nada — sincronizarFaturas engole.
  const comAparelho = [...contratoPorId.values()].filter((c) => aparelhosPorCliente.has(c.customer_id));
  const { data: tenantRow } = await admin.from('tenants').select('*').eq('id', regra.tenant_id).single();
  const tenant = asTenantOrNull(tenantRow);
  if (tenant) {
    const adapter = getAdapterForTenant(tenant);
    const { data: frescor } = await admin
      .from('invoices')
      .select('id, contract_id, last_synced_at')
      .in('contract_id', comAparelho.map((c) => c.id))
      .eq('due_date', vencimento);
    const velhos = new Set(
      ((frescor ?? []) as { id: string; contract_id: string; last_synced_at: string | null }[])
        .filter((f) => !jaAvisadas.has(f.id) && precisaAtualizar(f.last_synced_at))
        .map((f) => f.contract_id),
    );
    await emParalelo(
      comAparelho.filter((c) => velhos.has(c.id)).slice(0, 60),
      5,
      async (c) => void (await sincronizarFaturas(admin, regra.tenant_id, c, adapter)),
    );
  }

  // Depois da conferência, a lista de verdade.
  const { data: conferidas } = await admin
    .from('invoices')
    .select('id, contract_id, last_synced_at')
    .eq('tenant_id', regra.tenant_id)
    .eq('due_date', vencimento)
    .in('status', ABERTAS)
    .in('contract_id', comAparelho.map((c) => c.id));

  const limite = Date.now() - CONFERIDO_MS;
  const alvo = ((conferidas ?? []) as { id: string; contract_id: string; last_synced_at: string | null }[]).filter(
    // Antes do vencimento, o risco é pequeno e o lembrete vale mesmo com dado
    // de algumas horas. Depois, só com o ERP confirmando que segue em aberto.
    (f) =>
      !jaAvisadas.has(f.id) &&
      (regra.days_offset <= 0 || (f.last_synced_at && new Date(f.last_synced_at).getTime() > limite)),
  );
  if (!alvo.length) return enviados;

  const { data: campanhaRow } = await admin
    .from('push_campaigns')
    .upsert(
      {
        tenant_id: regra.tenant_id,
        kind: 'rule',
        rule_id: regra.id,
        run_date: hoje,
        title: regra.title,
        body: regra.body,
        url: '/fatura',
        status: 'sending',
        scheduled_at: new Date().toISOString(),
      } as never,
      { onConflict: 'rule_id,run_date' },
    )
    .select('id, tenant_id, kind, title, body, url')
    .single();
  const campanha = campanhaRow as Campanha | null;
  if (!campanha) return enviados;

  const linhas = alvo.flatMap((f) => {
    const cliente = contratoPorId.get(f.contract_id)?.customer_id ?? '';
    return (aparelhosPorCliente.get(cliente) ?? []).map((sub) => ({
      campaign_id: campanha.id,
      subscription_id: sub,
      invoice_id: f.id,
      dedupe_key: `r:${regra.id}:${f.id}:${sub}`,
    }));
  });
  await admin.from('push_deliveries').upsert(linhas as never, { onConflict: 'dedupe_key', ignoreDuplicates: true });

  enviados += (await entregarPendentes(admin, campanha)).enviados;
  await admin
    .from('push_campaigns')
    .update({ status: 'sent', sent_at: new Date().toISOString() } as never)
    .eq('id', campanha.id);
  return enviados;
}

/** Regras cuja hora já chegou hoje. Rodada perdida às 9h ainda sai às 9h15. */
async function processarRegras(admin: Admin, agora: Date) {
  const { data: hoje, hora } = agoraEmBrasilia(agora);
  // Até uma hora depois do último horário permitido, para a rodada das 20h
  // que atrasou. Depois disso, fica para amanhã — e amanhã a data já é outra.
  if (hora < HORA_MIN || hora > HORA_MAX + 1) return 0;

  const { data } = await admin
    .from('push_rules')
    .select('id, tenant_id, days_offset, send_hour, title, body')
    .eq('enabled', true)
    .lte('send_hour', hora);

  let enviados = 0;
  for (const regra of (data ?? []) as Regra[]) {
    try {
      enviados += await rodarRegra(admin, regra, hoje);
    } catch (e) {
      console.error('[push] regra falhou', regra.id, e);
    }
  }
  return enviados;
}

export async function processarFila(admin: Admin, agora = new Date()) {
  if (!pushConfigurado()) return { configurado: false as const };
  const manuais = await processarAgendadas(admin, agora);
  const deRegra = await processarRegras(admin, agora);
  return { configurado: true as const, manuais, deRegra };
}
