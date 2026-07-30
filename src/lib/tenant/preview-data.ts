import type {
  Tenant,
  Customer,
  Contract,
  Plan,
  Invoice,
  SupportTicket,
} from '@/lib/supabase/types';
import type { ErpConnection, ErpUsagePoint } from '@/lib/erp/types';
import qrcode from 'qrcode-generator';

// Assinante de vitrine. É o que aparece no mockup da página de marca e nos
// screenshots que o provedor exporta para a Play Store e a App Store.
//
// Fictício de propósito: a loja é uma vitrine pública, e mandar para lá o
// nome, o CPF ou a fatura de um assinante de verdade seria vazamento (LGPD).
// O que é real na tela é o que identifica o provedor — logo, cores, layout e
// contatos de suporte.
//
// Renderiza os MESMOS componentes do portal (HomeV1/V2/V3, faturas, suporte),
// então o que o provedor vê no mockup é o que o cliente dele vê no app.

export interface PreviewData {
  customer: Customer;
  contract: Contract;
  plan: Plan;
  openInvoice: Invoice;
  recentInvoices: Invoice[];
  connection: ErpConnection;
  usage: ErpUsagePoint[];
  tickets: SupportTicket[];
}

// Meio-dia evita que o fuso empurre a data pro dia anterior na exibição.
function isoDay(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const GB = 1_000_000_000;

const PIX_DEMO =
  '00020126580014br.gov.bcb.pix0136preview-linkhub-chave-pix5204000053039865802BR';

/**
 * QR do Pix da fatura de exemplo. Desenhado aqui porque a tela de pagamento
 * não inventa QR: sem imagem ela mostra um aviso, e um aviso é o que sairia
 * no screenshot que o provedor manda pra loja. O código é o copia-e-cola
 * fictício — escaneia, mas não é chave de ninguém.
 */
function demoPixQr(): string {
  const qr = qrcode(0, 'M');
  qr.addData(PIX_DEMO);
  qr.make();
  const svg = qr.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Uma semana de consumo com cara de casa de família: fim de semana pesado,
// terça fraca. Fixo, e não aleatório, porque o mesmo número precisa sair no
// servidor e no cliente — e porque dois screenshots seguidos têm que bater.
const WEEK_DOWN_GB = [18.4, 24.1, 12.7, 31.5, 27.8, 42.3, 38.6];
const WEEK_UP_GB = [2.1, 3.4, 1.6, 4.2, 3.1, 5.8, 4.9];

export function buildPreviewData(tenant: Tenant): PreviewData {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const stamp = new Date(year, month, 1).toISOString();

  const customer: Customer = {
    id: 'preview-customer',
    tenant_id: tenant.id,
    external_id: 'PREVIEW-1',
    user_id: null,
    cpf_cnpj: '12345678909',
    name: 'Marina Duarte',
    email: 'marina@exemplo.com.br',
    phone: '5554998800000',
    whatsapp: '5554998800000',
    address_street: 'Rua das Acácias',
    address_number: '1234',
    address_complement: null,
    address_district: 'Centro',
    address_city: 'Caxias do Sul',
    address_state: 'RS',
    address_zip: '95020-000',
    last_synced_at: stamp,
    created_at: stamp,
    updated_at: stamp,
  };

  const plan: Plan = {
    id: 'preview-plan',
    tenant_id: tenant.id,
    external_id: 'PL-500',
    name: 'Fibra 500',
    description: 'Plano residencial 500 Mbps',
    down_mbps: 500,
    up_mbps: 250,
    price_cents: 12990,
    fidelity_months: 12,
    active: true,
    created_at: stamp,
  };

  const contract: Contract = {
    id: 'preview-contract',
    tenant_id: tenant.id,
    customer_id: customer.id,
    plan_id: plan.id,
    external_id: 'PREVIEW-1-C1',
    status: 'active',
    pppoe_user: 'marina.duarte',
    due_day: 10,
    monthly_price_cents: 12990,
    installation_address: 'Rua das Acácias, 1234',
    activated_at: stamp,
    cancelled_at: null,
    last_synced_at: stamp,
    created_at: stamp,
    updated_at: stamp,
  };

  const invoice = (offset: number, status: Invoice['status']): Invoice => {
    const ref = new Date(year, month - offset, 1);
    return {
      id: `preview-invoice-${offset}`,
      tenant_id: tenant.id,
      contract_id: contract.id,
      external_id: `PREVIEW-INV-${offset}`,
      reference_month: isoDay(ref.getFullYear(), ref.getMonth(), 1),
      due_date: isoDay(ref.getFullYear(), ref.getMonth(), 10),
      amount_cents: 12990,
      status,
      pix_qr_code: status === 'paid' ? null : demoPixQr(),
      pix_copy_paste: PIX_DEMO,
      boleto_line: '34191.79001 01043.510047 91020.150008 1 98770000012990',
      boleto_pdf_url: null,
      nfe_url: null,
      paid_at: status === 'paid' ? stamp : null,
      paid_amount_cents: status === 'paid' ? 12990 : null,
      paid_method: status === 'paid' ? 'pix' : null,
      last_synced_at: stamp,
      created_at: stamp,
      updated_at: stamp,
    };
  };

  // O assinante da vitrine está em dia: a fatura em destaque é a próxima a
  // vencer, nunca uma atrasada. Perto do dia 10 usa a deste mês; passou,
  // pula pra do mês que vem — assim nunca sai "vencida há 19 dias" numa
  // imagem que vai ficar meses na loja.
  const upcoming = now.getDate() <= 8 ? 0 : -1;
  const openInvoice = invoice(upcoming, 'open');

  // Conexão ativa há três dias, com consumo da sessão — o card fica com todos
  // os campos preenchidos, que é como ele aparece num ERP bem integrado.
  const connection: ErpConnection = {
    online: true,
    login: 'marina.duarte',
    ip: '100.64.18.42',
    kind: 'PPPoE',
    since: new Date(now.getTime() - 3 * 86400_000).toISOString(),
    uptimeSeconds: 3 * 86400 + 5 * 3600,
    downloadBytes: 214 * GB,
    uploadBytes: 26 * GB,
  };

  const usage: ErpUsagePoint[] = WEEK_DOWN_GB.map((down, i) => {
    const day = new Date(year, month, now.getDate() - (WEEK_DOWN_GB.length - 1 - i));
    const date = isoDay(day.getFullYear(), day.getMonth(), day.getDate());
    return {
      date,
      label: `${date.slice(8, 10)}/${date.slice(5, 7)}`,
      downloadBytes: Math.round(down * GB),
      uploadBytes: Math.round((WEEK_UP_GB[i] ?? 2) * GB),
    };
  });

  const ticket = (offset: number, subject: string, status: string): SupportTicket => {
    const opened = new Date(now.getTime() - offset * 86400_000).toISOString();
    return {
      id: `preview-ticket-${offset}`,
      tenant_id: tenant.id,
      customer_id: customer.id,
      contract_id: contract.id,
      external_id: `PREVIEW-TK-${offset}`,
      protocol: `2026${String(1000 + offset)}`,
      subject,
      category: 'suporte',
      status,
      priority: 'normal',
      channel: 'app',
      opened_at: opened,
      closed_at: status === 'closed' ? opened : null,
      created_at: opened,
    };
  };

  return {
    customer,
    contract,
    plan,
    openInvoice,
    // Como na central de verdade: a fatura em destaque não se repete na
    // lista de baixo, que fica com as pagas.
    recentInvoices: [
      invoice(upcoming + 1, 'paid'),
      invoice(upcoming + 2, 'paid'),
      invoice(upcoming + 3, 'paid'),
    ],
    connection,
    usage,
    tickets: [
      ticket(4, 'Internet lenta à noite', 'closed'),
      ticket(31, 'Troca da senha do Wi-Fi', 'closed'),
    ],
  };
}
