import type { ErpAdapter, ErpCustomer, ErpPlan, ErpContract, ErpInvoice, ErpConfig } from './types';

// Adapter IXC Soft.
// Doc: https://wiki.ixcsoft.com.br/ — endpoint /webservice/v1/<recurso>
// Auth: HTTP Basic com Base64("usuario:apiKey")
//
// Os endpoints aceitam POST com `qtype`/`query`/`oper` (filtros).
// Mapeamos só o que o portal precisa: cliente por CNPJ/CPF, contratos,
// faturas e planos.

interface IxcConfig {
  baseUrl: string;
  token: string;
}

interface IxcListResponse<T> {
  page: string;
  total: string;
  registros: T[];
}

export class IxcAdapter implements ErpAdapter {
  name = 'ixc';
  private baseUrl: string;
  private auth: string;

  constructor(cfg: NonNullable<ErpConfig['ixc']>) {
    this.baseUrl = cfg.baseUrl.replace(/\/+$/, '');
    // O IXC já espera o token como Base64(user:apiKey) — passamos direto.
    this.auth = `Basic ${cfg.token}`;
  }

  private async req<T = unknown>(resource: string, body: Record<string, unknown>): Promise<T> {
    const url = `${this.baseUrl}/webservice/v1/${resource}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: this.auth,
        ixcsoft: 'listar',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!r.ok) throw new Error(`IXC ${resource} ${r.status}: ${await r.text()}`);
    return r.json();
  }

  async testConnection() {
    try {
      await this.req('cliente', { qtype: 'cliente.id', query: '0', oper: '=', page: '1', rp: '1' });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? String(e) };
    }
  }

  async listPlans(): Promise<ErpPlan[]> {
    const data = await this.req<IxcListResponse<any>>('plano_acesso', {
      qtype: 'plano_acesso.ativo', query: 'S', oper: '=',
      page: '1', rp: '500', sortname: 'plano_acesso.id', sortorder: 'asc',
    });
    return (data.registros ?? []).map((p) => ({
      externalId: String(p.id),
      name: p.nome ?? 'Plano',
      description: p.descricao ?? undefined,
      downMbps: p.velocidade_down ? Number(p.velocidade_down) : undefined,
      upMbps: p.velocidade_up ? Number(p.velocidade_up) : undefined,
      priceCents: Math.round(Number(p.valor ?? 0) * 100),
      fidelityMonths: p.fidelidade ? Number(p.fidelidade) : undefined,
    }));
  }

  async findCustomerByCpf(cpf: string): Promise<ErpCustomer | null> {
    const cpfClean = cpf.replace(/\D/g, '');
    const data = await this.req<IxcListResponse<any>>('cliente', {
      qtype: 'cliente.cnpj_cpf', query: cpfClean, oper: '=',
      page: '1', rp: '1',
    });
    const c = data.registros?.[0];
    if (!c) return null;
    return {
      externalId: String(c.id),
      cpfCnpj: c.cnpj_cpf,
      name: c.razao,
      email: c.email,
      phone: c.telefone_celular ?? c.telefone,
      whatsapp: c.whatsapp ?? c.telefone_celular,
      address: {
        street: c.endereco,
        number: c.numero,
        complement: c.complemento,
        district: c.bairro,
        city: c.cidade_nome,
        state: c.uf,
        zip: c.cep,
      },
    };
  }

  async listContractsByCustomer(customerExternalId: string): Promise<ErpContract[]> {
    const data = await this.req<IxcListResponse<any>>('cliente_contrato', {
      qtype: 'cliente_contrato.id_cliente', query: customerExternalId, oper: '=',
      page: '1', rp: '50',
    });
    return (data.registros ?? []).map((c) => ({
      externalId: String(c.id),
      customerExternalId,
      planExternalId: c.id_vd_contrato ? String(c.id_vd_contrato) : undefined,
      status: this.mapContractStatus(c.status),
      pppoeUser: c.login,
      dueDay: c.dia_vencimento ? Number(c.dia_vencimento) : undefined,
      monthlyPriceCents: c.mensalidade ? Math.round(Number(c.mensalidade) * 100) : undefined,
      installationAddress: c.endereco_inst,
      activatedAt: c.data_ativacao,
    }));
  }

  async listInvoicesByContract(contractExternalId: string, opts?: { onlyOpen?: boolean }): Promise<ErpInvoice[]> {
    const filters: any = {
      qtype: 'fn.id_contrato', query: contractExternalId, oper: '=',
      page: '1', rp: '60', sortname: 'fn.data_vencimento', sortorder: 'desc',
    };
    if (opts?.onlyOpen) {
      filters.grid_param = JSON.stringify([{ TB: 'fn.status', OP: '=', P: 'A' }]);
    }
    const data = await this.req<IxcListResponse<any>>('fn_areceber', filters);
    return (data.registros ?? []).map((f) => ({
      externalId: String(f.id),
      contractExternalId,
      dueDate: f.data_vencimento,
      referenceMonth: f.data_emissao,
      amountCents: Math.round(Number(f.valor ?? 0) * 100),
      status: this.mapInvoiceStatus(f.status),
      pixCopyPaste: f.pix_copia_cola ?? undefined,
      boletoLine: f.linha_digitavel ?? undefined,
      boletoPdfUrl: f.url_boleto ?? undefined,
      nfeUrl: f.url_nfse ?? undefined,
      paidAt: f.data_pagamento ?? undefined,
      paidAmountCents: f.valor_recebido ? Math.round(Number(f.valor_recebido) * 100) : undefined,
    }));
  }

  async getInvoice(invoiceExternalId: string): Promise<ErpInvoice | null> {
    const data = await this.req<IxcListResponse<any>>('fn_areceber', {
      qtype: 'fn.id', query: invoiceExternalId, oper: '=', page: '1', rp: '1',
    });
    const f = data.registros?.[0];
    if (!f) return null;
    return {
      externalId: String(f.id),
      contractExternalId: String(f.id_contrato),
      dueDate: f.data_vencimento,
      amountCents: Math.round(Number(f.valor ?? 0) * 100),
      status: this.mapInvoiceStatus(f.status),
      pixCopyPaste: f.pix_copia_cola ?? undefined,
      boletoLine: f.linha_digitavel ?? undefined,
      boletoPdfUrl: f.url_boleto ?? undefined,
    };
  }

  private mapContractStatus(s: string): ErpContract['status'] {
    // IXC: A=Ativo, I=Inativo, B=Bloqueado, C=Cancelado, S=Suspenso
    switch (s) {
      case 'A': return 'active';
      case 'B': case 'S': return 'suspended';
      case 'C': return 'cancelled';
      default: return 'pending';
    }
  }

  private mapInvoiceStatus(s: string): ErpInvoice['status'] {
    // IXC: A=Aberta, R=Recebida, C=Cancelada
    switch (s) {
      case 'R': return 'paid';
      case 'C': return 'cancelled';
      default: return 'open';
    }
  }
}
