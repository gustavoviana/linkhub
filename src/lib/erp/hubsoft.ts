import type { ErpAdapter, ErpCustomer, ErpPlan, ErpContract, ErpInvoice, ErpConfig } from './types';

// Adapter Hubsoft. Auth OAuth2 password grant. Token deve ser cacheado —
// aqui mantemos em memória do processo. Em produção, mover pra Redis ou
// pra coluna na tabela tenants.

interface HsConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

interface CachedToken { token: string; exp: number; }
const tokenCache = new Map<string, CachedToken>();

export class HubsoftAdapter implements ErpAdapter {
  name = 'hubsoft';
  private baseUrl: string;
  private cfg: HsConfig;

  constructor(cfg: NonNullable<ErpConfig['hubsoft']>) {
    this.baseUrl = cfg.baseUrl.replace(/\/+$/, '');
    this.cfg = cfg;
  }

  private cacheKey() {
    return `${this.baseUrl}|${this.cfg.clientId}|${this.cfg.username}`;
  }

  private async getToken(): Promise<string> {
    const cached = tokenCache.get(this.cacheKey());
    if (cached && cached.exp > Date.now() + 60_000) return cached.token;

    const r = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'password',
        client_id: this.cfg.clientId,
        client_secret: this.cfg.clientSecret,
        username: this.cfg.username,
        password: this.cfg.password,
      }),
      cache: 'no-store',
    });
    if (!r.ok) throw new Error(`Hubsoft auth ${r.status}: ${await r.text()}`);
    const json = await r.json();
    const token = json.access_token as string;
    const expSec = (json.expires_in as number) ?? 3600;
    tokenCache.set(this.cacheKey(), { token, exp: Date.now() + expSec * 1000 });
    return token;
  }

  private async req<T = any>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.getToken();
    const r = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
      cache: 'no-store',
    });
    if (!r.ok) throw new Error(`Hubsoft ${path} ${r.status}: ${await r.text()}`);
    return r.json();
  }

  async testConnection() {
    try {
      await this.getToken();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? String(e) };
    }
  }

  async listPlans(): Promise<ErpPlan[]> {
    const data = await this.req<any>('/api/v1/integracao/plano');
    return (data?.planos ?? []).map((p: any) => ({
      externalId: String(p.id),
      name: p.nome,
      description: p.descricao,
      downMbps: p.download,
      upMbps: p.upload,
      priceCents: Math.round(Number(p.valor ?? 0) * 100),
    }));
  }

  async findCustomerByCpf(cpf: string): Promise<ErpCustomer | null> {
    const cpfClean = cpf.replace(/\D/g, '');
    const data = await this.req<any>(`/api/v1/integracao/cliente?busca=cpf_cnpj&termo_busca=${cpfClean}`);
    const c = data?.clientes?.[0];
    if (!c) return null;
    return {
      externalId: String(c.id_cliente),
      cpfCnpj: c.cpf_cnpj,
      name: c.nome_razaosocial,
      email: c.email,
      phone: c.telefone_primario,
      whatsapp: c.telefone_celular,
    };
  }

  async listContractsByCustomer(customerExternalId: string): Promise<ErpContract[]> {
    const data = await this.req<any>(`/api/v1/integracao/cliente/servicos?id_cliente=${customerExternalId}`);
    return (data?.servicos ?? []).map((s: any) => ({
      externalId: String(s.id_servico),
      customerExternalId,
      planExternalId: s.id_plano ? String(s.id_plano) : undefined,
      status: s.status === 'Habilitado' ? 'active' : s.status === 'Suspenso' ? 'suspended' : 'cancelled',
      monthlyPriceCents: s.valor ? Math.round(Number(s.valor) * 100) : undefined,
    }));
  }

  async listInvoicesByContract(contractExternalId: string, opts?: { onlyOpen?: boolean }): Promise<ErpInvoice[]> {
    const path = opts?.onlyOpen
      ? `/api/v1/integracao/cliente/fatura?status=pendente&id_servico=${contractExternalId}`
      : `/api/v1/integracao/cliente/fatura?id_servico=${contractExternalId}`;
    const data = await this.req<any>(path);
    return (data?.faturas ?? []).map((f: any) => ({
      externalId: String(f.id_fatura),
      contractExternalId,
      dueDate: f.data_vencimento,
      amountCents: Math.round(Number(f.valor ?? 0) * 100),
      status: f.status === 'pago' ? 'paid' : f.status === 'cancelado' ? 'cancelled' : 'open',
      pixCopyPaste: f.codigo_pix,
      boletoLine: f.linha_digitavel,
      boletoPdfUrl: f.link_boleto,
    }));
  }

  async getInvoice(invoiceExternalId: string): Promise<ErpInvoice | null> {
    const data = await this.req<any>(`/api/v1/integracao/cliente/fatura/${invoiceExternalId}`);
    const f = data?.fatura;
    if (!f) return null;
    return {
      externalId: String(f.id_fatura),
      contractExternalId: String(f.id_servico),
      dueDate: f.data_vencimento,
      amountCents: Math.round(Number(f.valor ?? 0) * 100),
      status: f.status === 'pago' ? 'paid' : 'open',
      pixCopyPaste: f.codigo_pix,
      boletoLine: f.linha_digitavel,
      boletoPdfUrl: f.link_boleto,
    };
  }
}
