import type {
  Tenant,
  Customer,
  Contract,
  Plan,
  Invoice,
  SupportTicket,
} from '@/lib/supabase/types';
import type { ErpConnection, ErpUsagePoint, ErpUsageRange } from '@/lib/erp/types';
import { usageSlots } from '@/lib/erp/usage';
import { pixQrDataUrl } from '@/lib/portal/pix-qr';
import { demoLinhaDigitavel, demoPixPayload } from './pix';

// O assinante da demonstração.
//
// Tudo aqui é inventado e vive só em memória — nenhuma consulta a banco,
// nenhuma ida ao ERP. O visitante entra com o número que quiser e cai sempre
// neste cadastro, que é o mesmo em toda visita.
//
// Os números são fixos, e não sorteados: a demonstração precisa mostrar o
// mesmo gráfico para o provedor e para o cliente dele quando os dois abrem o
// link lado a lado. As datas, por outro lado, andam com o calendário — uma
// fatura "vencida em março de 2026" numa demonstração aberta em setembro
// entrega a idade da tela na hora.

const GB = 1_000_000_000;

export const DEMO_CPF = '12345678909';

export interface DemoData {
  customer: Customer;
  contract: Contract;
  plan: Plan;
  /** Todas as faturas, da mais nova para a mais antiga. */
  invoices: Invoice[];
  /** A que a home coloca em destaque: a mais antiga ainda em aberto. */
  openInvoice: Invoice;
  /** O que a home lista abaixo do destaque. */
  recentInvoices: Invoice[];
  connection: ErpConnection;
  usage: ErpUsagePoint[];
  tickets: SupportTicket[];
}

/** Meio-dia local evita que o fuso empurre a data para o dia anterior. */
function isoDay(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Ruído estável a partir de uma semente.
 *
 * O gráfico precisa parecer consumo de casa de família — com pico de fim de
 * semana e noite de série — sem ser sorteado: número sorteado mudaria entre a
 * renderização do servidor e a do navegador, e a cada F5 o provedor veria um
 * gráfico diferente no meio da apresentação.
 */
function ruido(semente: number): number {
  const x = Math.sin(semente * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const MENSALIDADE_CENTS = 12990;
const STAMP_BASE = new Date(2026, 0, 1).toISOString();

function customerDemo(tenant: Tenant): Customer {
  return {
    id: 'demo-customer',
    tenant_id: tenant.id,
    external_id: 'DEMO-1',
    user_id: null,
    cpf_cnpj: DEMO_CPF,
    name: 'Marina Duarte',
    email: 'marina@exemplo.com.br',
    // Telefone sem o código do país, que é como o ERP entrega e como a
    // máscara da tela espera — com o 55 na frente ela desiste e o assinante
    // vê treze dígitos colados. O WhatsApp precisa do 55: vira link wa.me.
    phone: '54998800000',
    whatsapp: '5554998800000',
    address_street: 'Rua das Acácias',
    address_number: '1234',
    address_complement: 'Apto 302',
    address_district: 'Centro',
    address_city: 'Caxias do Sul',
    address_state: 'RS',
    address_zip: '95020-000',
    last_synced_at: STAMP_BASE,
    created_at: STAMP_BASE,
    updated_at: STAMP_BASE,
  };
}

function planDemo(tenant: Tenant): Plan {
  return {
    id: 'demo-plan',
    tenant_id: tenant.id,
    external_id: 'PL-500',
    name: 'Fibra 500',
    description: 'Plano residencial 500 Mbps com Wi-Fi 6',
    down_mbps: 500,
    up_mbps: 250,
    price_cents: MENSALIDADE_CENTS,
    fidelity_months: 12,
    active: true,
    created_at: STAMP_BASE,
  };
}

function contractDemo(tenant: Tenant, customer: Customer, plan: Plan): Contract {
  return {
    id: 'demo-contract',
    tenant_id: tenant.id,
    customer_id: customer.id,
    plan_id: plan.id,
    external_id: 'DEMO-1-C1',
    status: 'active',
    pppoe_user: 'marina.duarte',
    due_day: 10,
    monthly_price_cents: MENSALIDADE_CENTS,
    installation_address: 'Rua das Acácias, 1234 — Centro, Caxias do Sul/RS',
    activated_at: new Date(2024, 2, 14).toISOString(),
    cancelled_at: null,
    last_synced_at: new Date().toISOString(),
    created_at: STAMP_BASE,
    updated_at: STAMP_BASE,
  };
}

/**
 * Uma fatura por mês, contando para trás a partir do mês de referência.
 * `offset` 0 é o mês da fatura em aberto; 1 em diante são as já pagas.
 */
function faturaDemo(
  tenant: Tenant,
  contract: Contract,
  ref: Date,
  offset: number,
  status: Invoice['status'],
): Invoice {
  const mes = new Date(ref.getFullYear(), ref.getMonth() - offset, 1);
  const ano = mes.getFullYear();
  const m = mes.getMonth();
  const id = `${ano}-${String(m + 1).padStart(2, '0')}`;
  const dueDate = isoDay(ano, m, 10);
  const aberta = status !== 'paid' && status !== 'cancelled';

  // Pequena variação no valor das antigas: conta de provedor tem proporcional
  // de mudança de plano e mês com serviço a mais. Tudo igual, mês após mês,
  // tem cara de tela chumbada.
  const extra = offset > 0 && offset % 3 === 0 ? 1500 : 0;
  const amount = MENSALIDADE_CENTS + extra;

  const copiaCola = aberta ? demoPixPayload(amount, `DEMO${id.replace('-', '')}`) : null;
  const pagoEm = status === 'paid' ? isoDay(ano, m, Math.min(10, 3 + (offset % 6))) : null;

  return {
    id: `fatura-${id}`,
    tenant_id: tenant.id,
    contract_id: contract.id,
    external_id: `DEMO-INV-${id}`,
    reference_month: isoDay(ano, m, 1),
    due_date: dueDate,
    amount_cents: amount,
    status,
    pix_qr_code: copiaCola ? pixQrDataUrl(copiaCola) : null,
    pix_copy_paste: copiaCola,
    boleto_line: aberta ? demoLinhaDigitavel(amount, dueDate) : null,
    // O PDF é desenhado na hora por /api/demo/boleto/[id]. Apontar para lá
    // aqui faz a tela de pagamento usar o link direto, sem passar pela rota
    // do portal de verdade — que pediria sessão e devolveria 401.
    boleto_pdf_url: aberta ? `/api/demo/boleto/fatura-${id}` : null,
    nfe_url: null,
    paid_at: pagoEm ? `${pagoEm}T14:12:00.000Z` : null,
    paid_amount_cents: status === 'paid' ? amount : null,
    paid_method: status === 'paid' ? (offset % 2 === 0 ? 'pix' : 'boleto') : null,
    last_synced_at: new Date().toISOString(),
    created_at: isoDay(ano, m, 1),
    updated_at: isoDay(ano, m, 1),
  };
}

function ticketDemo(
  tenant: Tenant,
  customer: Customer,
  contract: Contract,
  diasAtras: number,
  subject: string,
  status: string,
): SupportTicket {
  const abertoEm = new Date(Date.now() - diasAtras * 86_400_000).toISOString();
  return {
    id: `demo-ticket-${diasAtras}`,
    tenant_id: tenant.id,
    customer_id: customer.id,
    contract_id: contract.id,
    external_id: `DEMO-TK-${diasAtras}`,
    protocol: `${new Date().getFullYear()}${String(4200 + diasAtras)}`,
    subject,
    category: 'suporte',
    status,
    priority: 'normal',
    channel: 'app',
    opened_at: abertoEm,
    closed_at: status === 'closed' ? new Date(Date.now() - (diasAtras - 1) * 86_400_000).toISOString() : null,
    created_at: abertoEm,
  };
}

/**
 * Consumo do período pedido pelo gráfico.
 *
 * O desenho segue o que se vê num provedor residencial: fim de semana mais
 * pesado que meio de semana, e, no dia, quase nada de madrugada com a subida
 * do começo da noite. Upload por volta de um décimo do download.
 */
export function demoUsage(range: ErpUsageRange): ErpUsagePoint[] {
  // Os intervalos saem do mesmo lugar que os do portal de verdade, que já
  // resolve o fuso do provedor e corta as horas que ainda não aconteceram.
  // Aqui só preenchemos o volume de cada balde.
  return usageSlots(range).map(({ point }) => {
    if (range === 'today') {
      const hora = Number(point.date.slice(11, 13));
      const perfil =
        hora < 6 ? 0.12 : hora < 11 ? 0.45 : hora < 17 ? 0.62 : hora < 20 ? 1.0 : hora < 23 ? 1.35 : 0.4;
      const down = (0.9 + ruido(hora + 3) * 0.7) * perfil;
      return {
        ...point,
        downloadBytes: Math.round(down * GB),
        uploadBytes: Math.round(down * (0.09 + ruido(hora + 41) * 0.05) * GB),
      };
    }

    const [ano, mes, dia] = point.date.split('-').map(Number);
    const data = new Date(ano ?? 2026, (mes ?? 1) - 1, dia ?? 1);
    const fimDeSemana = data.getDay() === 0 || data.getDay() === 6;
    const semente = (dia ?? 1) + (mes ?? 1) * 31;
    const base = fimDeSemana ? 34 : 19;
    const down = base + ruido(semente) * (fimDeSemana ? 14 : 11);
    return {
      ...point,
      downloadBytes: Math.round(down * GB),
      uploadBytes: Math.round(down * (0.1 + ruido(semente + 17) * 0.05) * GB),
    };
  });
}

export function buildDemoData(tenant: Tenant): DemoData {
  const agora = new Date();
  const customer = customerDemo(tenant);
  const plan = planDemo(tenant);
  const contract = contractDemo(tenant, customer, plan);

  // A fatura em aberto é sempre a próxima a vencer, nunca uma atrasada: quem
  // abre a demonstração está avaliando o produto, e o produto não pode
  // aparecer dando notícia ruim de um cliente que nem existe. Passado o dia
  // 8, a conta em destaque já é a do mês seguinte.
  const ref = agora.getDate() <= 8
    ? new Date(agora.getFullYear(), agora.getMonth(), 1)
    : new Date(agora.getFullYear(), agora.getMonth() + 1, 1);

  const openInvoice = faturaDemo(tenant, contract, ref, 0, 'open');
  const pagas = [1, 2, 3, 4, 5, 6, 7].map((offset) =>
    faturaDemo(tenant, contract, ref, offset, 'paid'),
  );

  const connection: ErpConnection = {
    online: true,
    login: 'marina.duarte',
    ip: '100.64.18.42',
    kind: 'PPPoE',
    concentrator: 'BRAS-CENTRO-01',
    since: new Date(agora.getTime() - (3 * 86400 + 5 * 3600) * 1000).toISOString(),
    uptimeSeconds: 3 * 86400 + 5 * 3600,
    downloadBytes: 214 * GB,
    uploadBytes: 26 * GB,
  };

  return {
    customer,
    contract,
    plan,
    invoices: [openInvoice, ...pagas],
    openInvoice,
    // Igual à central de verdade: sem outra conta em aberto, o que aparece
    // abaixo do destaque é o histórico do que já foi pago.
    recentInvoices: pagas.slice(0, 3),
    connection,
    usage: demoUsage('7d'),
    tickets: [
      ticketDemo(tenant, customer, contract, 4, 'Internet lenta à noite', 'closed'),
      ticketDemo(tenant, customer, contract, 31, 'Troca da senha do Wi-Fi', 'closed'),
    ],
  };
}

/** A fatura pelo id da URL. Fora da lista, não existe — a demonstração é fechada. */
export function demoInvoice(tenant: Tenant, id: string): Invoice | null {
  return buildDemoData(tenant).invoices.find((i) => i.id === id) ?? null;
}
