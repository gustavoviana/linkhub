import type { ErpAdapter, ErpCustomer, ErpPlan, ErpContract, ErpInvoice, ErpConfig, ErpConnection, ErpUsagePoint } from './types';
import { documentVariants } from '@/lib/documento';

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

/** Aceita `https://host`, `host` ou `https://host/webservice/v1` e normaliza. */
function normalizeBaseUrl(raw: string): string {
  let url = (raw ?? '').trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  // O provedor costuma colar a URL já com o caminho do webservice.
  url = url.replace(/\/+$/, '').replace(/\/webservice(\/v1)?$/i, '');
  return url;
}

/**
 * O IXC autentica com Basic Base64("usuario:apiKey"). O erro mais comum é
 * colar a apiKey crua, ou o par `usuario:apiKey` sem codificar — nos dois
 * casos o nginx devolve 401 antes de chegar no IXC. Aceitamos as três formas
 * e normalizamos para o que o servidor espera.
 */
function normalizeToken(raw: string): string {
  const token = (raw ?? '').trim().replace(/\s+/g, '');
  if (!token) return '';

  // Já é Base64 de algo com ":"? Então está no formato certo.
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    if (decoded.includes(':') && /^[\x20-\x7e]+$/.test(decoded)) return token;
  } catch {
    // segue para as heurísticas abaixo
  }

  // Veio como "usuario:apiKey" em texto puro — codifica.
  if (token.includes(':')) return Buffer.from(token, 'utf8').toString('base64');

  // Veio só a apiKey. Não dá pra adivinhar o usuário; manda como está para o
  // servidor decidir, e a mensagem de erro orienta o provedor.
  return token;
}

/** O IXC mistura formatos: "2026-12-10" nas faturas, "26/07/2026" no RADIUS. */
function toIsoDate(value: unknown): string {
  const v = String(value ?? '').trim();
  if (!v || v.startsWith('0000')) return '';
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(v);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(v);
  return iso ? iso[1]! : '';
}

function toIsoDateTime(value: unknown): string | undefined {
  const v = String(value ?? '').trim();
  if (!v || v.startsWith('0000')) return undefined;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}:\d{2}:\d{2})/.exec(v);
  if (br) return `${br[3]}-${br[2]}-${br[1]}T${br[4]}`;
  const iso = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(v);
  if (iso) return `${iso[1]}T${iso[2]}`;
  return toIsoDate(v) || undefined;
}

/** "MARAUNET-PLANO-500X500 2026" → 500 / 500. */
function parseSpeeds(name?: string): { down: number; up: number } | null {
  if (!name) return null;
  const m = /(\d{1,5})\s*[xX]\s*(\d{1,5})/.exec(name);
  if (m) return { down: Number(m[1]), up: Number(m[2]) };
  const single = /(\d{2,5})\s*(?:MEGA|MB|MBPS)/i.exec(name);
  if (single) return { down: Number(single[1]), up: Number(single[1]) };
  return null;
}

/** Traduz o erro do IXC para algo acionável — e sem HTML cru na tela. */
function explainIxcError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);

  if (/\b401\b/.test(raw)) {
    return (
      'O IXC recusou a credencial (401). Confira, nesta ordem: ' +
      '1) o token precisa ser o Base64 de "usuario:chave" — se você tem os dois separados, ' +
      'pode colar no formato usuario:chave que o LinkHub codifica; ' +
      '2) no IXC, em Configurações → Integrações → Webservice, confirme se o usuário da API está ativo; ' +
      '3) se houver restrição de IP no webservice, o IP do servidor precisa estar liberado.'
    );
  }
  if (/\b403\b/.test(raw)) {
    return 'O IXC aceitou a credencial mas bloqueou o acesso (403). Normalmente é restrição de IP ou permissão do usuário da API.';
  }
  if (/\b404\b/.test(raw)) {
    return 'Endereço não encontrado (404). Confira a Base URL — deve ser o host da central, sem /webservice no final.';
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(raw)) {
    return 'Não encontramos esse endereço. Confira o domínio da central do IXC.';
  }
  if (/ECONNREFUSED|ETIMEDOUT|timeout|fetch failed/i.test(raw)) {
    return 'Não conseguimos conectar no servidor do IXC. Ele pode estar fora do ar ou bloqueando conexões externas.';
  }
  if (/certificate|SSL|TLS/i.test(raw)) {
    return 'O certificado HTTPS da central do IXC não foi aceito. Confira se ele está válido.';
  }

  // Resposta em HTML (página de erro do nginx) vira texto legível.
  const stripped = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return stripped.length > 220 ? `${stripped.slice(0, 220)}…` : stripped;
}

export class IxcAdapter implements ErpAdapter {
  name = 'ixc';
  private baseUrl: string;
  private auth: string;

  constructor(cfg: NonNullable<ErpConfig['ixc']>) {
    this.baseUrl = normalizeBaseUrl(cfg.baseUrl);
    this.auth = `Basic ${normalizeToken(cfg.token)}`;
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
    } catch (e: unknown) {
      return { ok: false, message: explainIxcError(e) };
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
    // O IXC guarda cnpj_cpf do jeito que foi digitado no cadastro — na maioria
    // das instalações, formatado. Buscar só pelos dígitos não encontra
    // ninguém, então tentamos as duas escritas antes de desistir.
    let c: any = null;
    for (const variant of documentVariants(cpf)) {
      const data = await this.req<IxcListResponse<any>>('cliente', {
        qtype: 'cliente.cnpj_cpf', query: variant, oper: '=',
        page: '1', rp: '1',
      });
      c = data.registros?.[0];
      if (c) break;
    }
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

    // O contrato do IXC não guarda login, mensalidade nem dia de vencimento —
    // isso vive no radusuarios e nas faturas. O nome do plano vem no campo
    // `contrato` ("MARAUNET-PLANO-500X500 2026"), que é o que o assinante
    // reconhece, então é dele que tiramos também as velocidades.
    return (data.registros ?? []).map((c) => {
      const planName = c.contrato || undefined;
      const speeds = parseSpeeds(planName);
      return {
        externalId: String(c.id),
        customerExternalId,
        planExternalId: c.id_vd_contrato ? String(c.id_vd_contrato) : undefined,
        planName,
        planDownMbps: speeds?.down,
        planUpMbps: speeds?.up,
        // status_internet reflete bloqueio por falta de pagamento; o status
        // do contrato sozinho diria "ativo" com a internet cortada.
        status: this.mapContractStatus(c.status_internet || c.status),
        installationAddress: [c.endereco, c.numero].filter(Boolean).join(', ') || undefined,
        activatedAt: toIsoDate(c.data_ativacao),
      };
    });
  }

  async listInvoicesByContract(contractExternalId: string, opts?: { onlyOpen?: boolean }): Promise<ErpInvoice[]> {
    const filters: Record<string, unknown> = {
      // O prefixo do qtype precisa ser o nome da tabela. Com "fn." o IXC
      // devolve erro e a central ficava sem nenhuma fatura.
      qtype: 'fn_areceber.id_contrato', query: contractExternalId, oper: '=',
      page: '1', rp: '60',
      sortname: 'fn_areceber.data_vencimento', sortorder: 'desc',
    };
    if (opts?.onlyOpen) {
      filters.grid_param = JSON.stringify([{ TB: 'fn_areceber.status', OP: '=', P: 'A' }]);
    }
    const data = await this.req<IxcListResponse<any>>('fn_areceber', filters);
    return (data.registros ?? []).map((f) => {
      const due = toIsoDate(f.data_vencimento);
      const emitted = toIsoDate(f.data_emissao);
      return {
        externalId: String(f.id),
        contractExternalId,
        dueDate: due,
        // Mês de referência é o do vencimento: é como o assinante lê a conta.
        referenceMonth: due ? `${due.slice(0, 7)}-01` : emitted,
        amountCents: Math.round(Number(f.valor ?? 0) * 100),
        status: this.mapInvoiceStatus(f.status, due),
        pixCopyPaste: f.pix_copia_cola || undefined,
        boletoLine: f.linha_digitavel || undefined,
        boletoPdfUrl: f.url_boleto || undefined,
        nfeUrl: f.url_nfse || undefined,
        paidAt: toIsoDate(f.data_pagamento) || undefined,
        paidAmountCents: f.valor_recebido ? Math.round(Number(f.valor_recebido) * 100) : undefined,
      };
    });
  }

  /** Conexão atual do assinante — vem do radusuarios, ligado ao contrato. */
  async getConnection(contractExternalId: string): Promise<ErpConnection | null> {
    const data = await this.req<IxcListResponse<any>>('radusuarios', {
      qtype: 'radusuarios.id_contrato', query: contractExternalId, oper: '=',
      page: '1', rp: '1',
    });
    const r = data.registros?.[0];
    if (!r) return null;

    return {
      online: r.online === 'S',
      login: r.login || undefined,
      ip: r.ip || undefined,
      mac: r.mac || undefined,
      kind: r.tipo_conexao || undefined,
      concentrator: r.concentrador || undefined,
      since: toIsoDateTime(r.ultima_conexao_inicial),
      uptimeSeconds: r.tempo_conectado ? Number(r.tempo_conectado) : undefined,
      downloadBytes: r.download_atual ? Number(r.download_atual) : undefined,
      uploadBytes: r.upload_atual ? Number(r.upload_atual) : undefined,
      quotaBytes: r.franquia_maximo ? Number(r.franquia_maximo) : 0,
      onu: r.onu_mac || undefined,
      disconnectReason: r.motivo_desconexao || undefined,
    };
  }

  /**
   * Consumo por dia, a partir da contabilidade do RADIUS.
   *
   * O RADIUS conta por sessão, não por dia, e uma sessão PPPoE pode durar
   * semanas. Creditar o total no dia em que a sessão começou produz um pico
   * absurdo num dia e zero nos outros — e sessão sem registro de encerramento
   * (queda do concentrador) jogaria tudo em cima de hoje. Por isso o consumo
   * é distribuído proporcionalmente ao tempo que a sessão passou em cada dia,
   * e o fim da sessão vem de acctsessiontime quando não há acctstoptime.
   *
   * É uma estimativa diária sobre um total exato — a central diz isso ao
   * cliente em vez de fingir medição por dia.
   */
  async getUsage(contractExternalId: string, days = 7): Promise<ErpUsagePoint[]> {
    const conn = await this.getConnection(contractExternalId);
    if (!conn?.login) return [];

    const data = await this.req<IxcListResponse<any>>('radacct', {
      qtype: 'radacct.username', query: conn.login, oper: '=',
      page: '1', rp: '400',
      sortname: 'radacct.acctstarttime', sortorder: 'desc',
    });

    const dayKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets = new Map<string, ErpUsagePoint>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      buckets.set(dayKey(d), { date: dayKey(d), downloadBytes: 0, uploadBytes: 0 });
    }

    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() - (days - 1));
    const now = Date.now();

    for (const s of data.registros ?? []) {
      const startIso = toIsoDateTime(s.acctstarttime);
      if (!startIso) continue;
      const start = new Date(startIso);
      if (Number.isNaN(start.getTime())) continue;

      const stopIso = toIsoDateTime(s.acctstoptime);
      const sessionSeconds = Number(s.acctsessiontime ?? 0);
      const stop = stopIso
        ? new Date(stopIso)
        : new Date(Math.min(now, start.getTime() + sessionSeconds * 1000));

      const spanMs = Math.max(stop.getTime() - start.getTime(), 1);
      if (stop.getTime() < windowStart.getTime()) continue;

      const down = Number(s.acctoutputoctets ?? 0);
      const up = Number(s.acctinputoctets ?? 0);
      if (!down && !up) continue;

      // Fatia a sessão dia a dia e credita a parte proporcional em cada um.
      for (const [key, bucket] of buckets) {
        const [y, m, d] = key.split('-').map(Number);
        const dayStart = new Date(y!, m! - 1, d!).getTime();
        const dayEnd = dayStart + 86_400_000;
        const overlap = Math.min(stop.getTime(), dayEnd) - Math.max(start.getTime(), dayStart);
        if (overlap <= 0) continue;
        const share = overlap / spanMs;
        bucket.downloadBytes += down * share;
        bucket.uploadBytes += up * share;
      }
    }

    for (const bucket of buckets.values()) {
      bucket.downloadBytes = Math.round(bucket.downloadBytes);
      bucket.uploadBytes = Math.round(bucket.uploadBytes);
    }

    return [...buckets.values()];
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

  private mapInvoiceStatus(s: string, dueDate?: string): ErpInvoice['status'] {
    // IXC: A=Aberta, R=Recebida, C=Cancelada. O IXC não marca "vencida" —
    // quem decide é a data, e é essa distinção que a central mostra.
    switch (s) {
      case 'R': return 'paid';
      case 'C': return 'cancelled';
      default: {
        if (!dueDate) return 'open';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [y, m, d] = dueDate.split('-').map(Number);
        const due = new Date(y!, (m ?? 1) - 1, d ?? 1);
        return due < today ? 'overdue' : 'open';
      }
    }
  }
}
