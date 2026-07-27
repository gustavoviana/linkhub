import type { ErpAdapter, ErpCustomer, ErpPlan, ErpContract, ErpInvoice, ErpConnection, ErpUsagePoint, ErpUsageRange, ErpPix } from './types';
import { usageSlots } from './usage';

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
      planName: 'Fibra 500',
      planDownMbps: 500,
      planUpMbps: 250,
      status: 'active',
      pppoeUser: customerExternalId.toLowerCase(),
      dueDay: 10,
      monthlyPriceCents: 12990,
      installationAddress: 'Rua das Acácias, 1234',
      activatedAt: '2024-03-15T00:00:00Z',
    }];
  }

  async getConnection(contractExternalId: string): Promise<ErpConnection> {
    return {
      online: true,
      login: contractExternalId.toLowerCase().replace(/-c1$/, ''),
      ip: '100.64.10.42',
      mac: 'B4:0F:3B:11:22:33',
      kind: 'PPPoEoVLAN',
      concentrator: '172.16.0.1',
      since: new Date(Date.now() - 26 * 3600_000).toISOString().slice(0, 19),
      uptimeSeconds: 26 * 3600,
      downloadBytes: 41_200_000_000,
      uploadBytes: 3_100_000_000,
      quotaBytes: 0,
    };
  }

  async getUsage(_contractExternalId: string, range: ErpUsageRange = '7d'): Promise<ErpUsagePoint[]> {
    const slots = usageSlots(range);
    // Hora rende bem menos que dia — a onda acompanha para o gráfico do
    // período "hoje" não sair na mesma escala do de 30 dias.
    const scale = range === 'today' ? 260_000_000 : 5_600_000_000;
    return slots.map((slot, i) => {
      const wave = 1 + Math.sin(i * 1.1) * 0.45;
      return {
        ...slot.point,
        downloadBytes: Math.round(scale * wave),
        uploadBytes: Math.round(scale * 0.075 * wave),
      };
    });
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

  async getInvoicePix(invoiceExternalId: string): Promise<ErpPix | null> {
    const inv = await this.getInvoice(invoiceExternalId);
    if (!inv?.pixCopyPaste) return null;
    return { copyPaste: inv.pixCopyPaste, status: 'ATIVA' };
  }

  async getInvoice(invoiceExternalId: string): Promise<ErpInvoice | null> {
    const [contractId] = invoiceExternalId.split('-INV');
    const list = await this.listInvoicesByContract(contractId);
    return list.find((i) => i.externalId === invoiceExternalId) ?? null;
  }
}
