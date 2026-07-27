import type { ErpAdapter, ErpCustomer, ErpPlan, ErpContract, ErpInvoice, ErpConfig } from './types';
import { documentVariants } from '@/lib/documento';

// Adapter SGP (sgp.net.br) — Central do Assinante API.
// Endpoints usados:
//   POST /api/ura/consultacliente/      → busca por CPF
//   POST /api/ura/titulos/              → faturas em aberto
//   GET  /api/cliente/segundavia/?token → linha digitável + pix

interface SgpConfig {
  baseUrl: string;
  app: string;
  token: string;
}

export class SgpAdapter implements ErpAdapter {
  name = 'sgp';
  private baseUrl: string;
  private app: string;
  private token: string;

  constructor(cfg: NonNullable<ErpConfig['sgp']>) {
    this.baseUrl = cfg.baseUrl.replace(/\/+$/, '');
    this.app = cfg.app;
    this.token = cfg.token;
  }

  private async post(path: string, body: Record<string, unknown>): Promise<any> {
    const r = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app: this.app, token: this.token, ...body }),
      cache: 'no-store',
    });
    if (!r.ok) throw new Error(`SGP ${path} ${r.status}: ${await r.text()}`);
    return r.json();
  }

  async testConnection() {
    try {
      await this.post('/api/ura/consultacliente/', { cpfcnpj: '00000000000' });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? String(e) };
    }
  }

  async listPlans(): Promise<ErpPlan[]> {
    // SGP não tem endpoint público listável de planos; o catálogo vem nos
    // contratos. Mantemos vazio aqui — o admin pode cadastrar manual.
    return [];
  }

  async findCustomerByCpf(cpf: string): Promise<ErpCustomer | null> {
    // Mesma história do IXC: a instalação pode guardar formatado ou só dígitos.
    let cli: any = null;
    for (const variant of documentVariants(cpf)) {
      const data = await this.post('/api/ura/consultacliente/', { cpfcnpj: variant });
      cli = data?.clientes?.[0];
      if (cli) break;
    }
    if (!cli) return null;
    return {
      externalId: String(cli.id),
      cpfCnpj: cli.cpfcnpj,
      name: cli.nome,
      email: cli.email,
      phone: cli.fone,
      whatsapp: cli.celular,
    };
  }

  async listContractsByCustomer(customerExternalId: string): Promise<ErpContract[]> {
    const data = await this.post('/api/ura/contratos/', { cliente: customerExternalId });
    return (data?.contratos ?? []).map((c: any) => ({
      externalId: String(c.contrato),
      customerExternalId,
      planExternalId: c.plano_id ? String(c.plano_id) : undefined,
      status: c.status === 'A' ? 'active' : c.status === 'S' ? 'suspended' : 'cancelled',
      pppoeUser: c.usuario,
      monthlyPriceCents: c.valor ? Math.round(Number(c.valor) * 100) : undefined,
    }));
  }

  async listInvoicesByContract(contractExternalId: string, opts?: { onlyOpen?: boolean }): Promise<ErpInvoice[]> {
    const data = await this.post('/api/ura/titulos/', {
      contrato: contractExternalId,
      ...(opts?.onlyOpen ? { situacao: 'A' } : {}),
    });
    return (data?.titulos ?? []).map((t: any) => ({
      externalId: String(t.id),
      contractExternalId,
      dueDate: t.vencimento,
      amountCents: Math.round(Number(t.valor) * 100),
      status: t.situacao === 'P' ? 'paid' : t.situacao === 'C' ? 'cancelled' : 'open',
      pixCopyPaste: t.pix_copiaecola,
      boletoLine: t.linha_digitavel,
      boletoPdfUrl: t.url_boleto,
      nfeUrl: t.url_nfsa,
    }));
  }

  async getInvoice(invoiceExternalId: string): Promise<ErpInvoice | null> {
    const data = await this.post('/api/ura/titulo/', { id: invoiceExternalId });
    const t = data?.titulo;
    if (!t) return null;
    return {
      externalId: String(t.id),
      contractExternalId: String(t.contrato),
      dueDate: t.vencimento,
      amountCents: Math.round(Number(t.valor) * 100),
      status: t.situacao === 'P' ? 'paid' : 'open',
      pixCopyPaste: t.pix_copiaecola,
      boletoLine: t.linha_digitavel,
      boletoPdfUrl: t.url_boleto,
    };
  }
}
