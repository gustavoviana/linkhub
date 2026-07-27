import type { Tenant, Customer, Contract, Plan, Invoice } from '@/lib/supabase/types';

// Dados fictícios do preview de marca. Ficam fora do componente porque o
// preview renderiza os MESMOS componentes do portal real (HomeV1/V2/V3) —
// é o que garante que o que o provedor vê no mockup é o que o cliente dele
// vai ver de verdade.

export interface PreviewData {
  customer: Customer;
  contract: Contract;
  plan: Plan;
  openInvoice: Invoice;
  recentInvoices: Invoice[];
}

// Meio-dia evita que o fuso empurre a data pro dia anterior na exibição.
function isoDay(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

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
      pix_qr_code: null,
      pix_copy_paste: '00020126580014br.gov.bcb.pix0136preview-linkhub-chave-pix5204000053039865802BR',
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

  const openInvoice = invoice(0, 'open');

  return {
    customer,
    contract,
    plan,
    openInvoice,
    recentInvoices: [openInvoice, invoice(1, 'paid'), invoice(2, 'paid'), invoice(3, 'paid')],
  };
}
