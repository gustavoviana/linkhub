import type { ErpAdapter, ErpCustomer, ErpPlan, ErpContract, ErpInvoice } from './types';

// Adapter de teste — usado pelo tenant 'demo' e quando nenhum ERP foi
// configurado ainda. Dados determinísticos pelo CPF pra facilitar QA.

const PLANS: ErpPlan[] = [
  { externalId: 'PL-100', name: 'Fibra 100', downMbps: 100, upMbps: 50,  priceCents:  8990, fidelityMonths: 12 },
  { externalId: 'PL-300', name: 'Fibra 300', downMbps: 300, upMbps: 150, priceCents: 10990, fidelityMonths: 12 },
  { externalId: 'PL-500', name: 'Fibra 500', downMbps: 500, upMbps: 250, priceCents: 12990, fidelityMonths: 12 },
  { externalId: 'PL-1G',  name: 'Fibra 1G',  downMbps: 1000, upMbps: 500, priceCents: 15990, fidelityMonths: 24 },
];

function cleanCpf(cpf: string) { return cpf.replace(/\D/g, ''); }

export class MockAdapter implements ErpAdapter {
  name = 'mock';

  async testConnection() {
    return { ok: true, message: 'Mock adapter — sempre conectado' };
  }

  async listPlans() {
    return PLANS;
  }

  async findCustomerByCpf(cpf: string): Promise<ErpCustomer | null> {
    const cpfDigits = cleanCpf(cpf);
    if (cpfDigits.length < 11) return null;
    return {
      externalId: `MOCK-${cpfDigits}`,
      cpfCnpj: cpfDigits,
      name: 'Cliente Demo',
      email: 'cliente.demo@exemplo.com',
      phone: '5554998800000',
      whatsapp: '5554998800000',
      address: {
        street: 'Rua das Acácias',
        number: '1234',
        district: 'Centro',
        city: 'Caxias do Sul',
        state: 'RS',
        zip: '95020-000',
      },
    };
  }

  async listContractsByCustomer(customerExternalId: string): Promise<ErpContract[]> {
    return [{
      externalId: `${customerExternalId}-C1`,
      customerExternalId,
      planExternalId: 'PL-500',
      status: 'active',
      pppoeUser: customerExternalId.toLowerCase(),
      dueDay: 10,
      monthlyPriceCents: 12990,
      installationAddress: 'Rua das Acácias, 1234',
      activatedAt: '2024-03-15T00:00:00Z',
    }];
  }

  async listInvoicesByContract(contractExternalId: string, opts?: { onlyOpen?: boolean }): Promise<ErpInvoice[]> {
    const now = new Date();
    const out: ErpInvoice[] = [];

    // Fatura em aberto (vence em 4 dias).
    const due = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4);
    out.push({
      externalId: `${contractExternalId}-INV-${now.getMonth() + 1}`,
      contractExternalId,
      referenceMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
      dueDate: due.toISOString().slice(0, 10),
      amountCents: 12990,
      status: 'open',
      pixCopyPaste: '00020126580014BR.GOV.BCB.PIX0136a1f3...netvale89020410990',
      boletoLine: '34191.79001 01043.510047 91020.150008 4 99820000010990',
    });

    if (opts?.onlyOpen) return out;

    // Últimas 3 pagas.
    for (let i = 1; i <= 3; i++) {
      const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dueDate = new Date(now.getFullYear(), now.getMonth() - i, 10);
      out.push({
        externalId: `${contractExternalId}-INV-PAID-${i}`,
        contractExternalId,
        referenceMonth: `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-01`,
        dueDate: dueDate.toISOString().slice(0, 10),
        amountCents: 12990,
        status: 'paid',
        paidAt: new Date(dueDate.getTime() - 86400000).toISOString(),
        paidAmountCents: 12990,
        paidMethod: 'pix',
      });
    }
    return out;
  }

  async getInvoice(invoiceExternalId: string): Promise<ErpInvoice | null> {
    const [contractId] = invoiceExternalId.split('-INV');
    const list = await this.listInvoicesByContract(contractId);
    return list.find((i) => i.externalId === invoiceExternalId) ?? null;
  }
}
