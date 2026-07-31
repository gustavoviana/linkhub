import type { ErpAdapter, ErpCustomer, ErpPlan, ErpContract, ErpInvoice, ErpConfig } from './types';
import { documentVariants, onlyDigits } from '@/lib/documento';

// Adapter SGP (sgp.net.br) — API da URA / Central do Assinante.
//
// Endpoints que existem de verdade nesta API (os demais respondem 404):
//   POST /api/ura/consultacliente/  → contratos do assinante (é aqui que vem o
//                                     cadastro; não existe endpoint de cliente)
//   POST /api/ura/titulos/          → faturas, por contrato ou por CPF
//
// A consulta aceita `cpfcnpj`, `contrato` ou `login` — **não** aceita o id do
// cliente. Por isso `ErpCustomer.externalId` aqui é o CPF/CNPJ em dígitos: é a
// única chave que o resto do app consegue usar depois para pedir os contratos.
//
// A resposta vem em `contratos`, uma linha por contrato, com o cadastro do
// assinante repetido em cada uma (razaoSocial, cpfCnpj, emails, telefones,
// endereco_*). Não há `clientes` na resposta.

/** Um item de `contratos` — os campos que usamos. */
interface SgpContrato {
  clienteId?: number;
  contratoId?: number;
  cpfCnpj?: string;
  razaoSocial?: string;
  emails?: { tipoContato?: string; contato?: string }[];
  telefones?: { tipoContato?: string; contato?: string }[];
  contratoStatus?: number;
  contratoStatusDisplay?: string;
  planointernet?: string;
  servico_plano?: string;
  servico_login?: string;
  cobVencimento?: number;
  dataCadastro?: string;
  endereco_logradouro?: string | null;
  endereco_numero?: string | null;
  endereco_complemento?: string | null;
  endereco_bairro?: string | null;
  endereco_cidade?: string | null;
  endereco_uf?: string | null;
  endereco_cep?: string | null;
}

/** Um item de `titulos`. */
interface SgpTitulo {
  id?: number;
  clienteContrato?: number;
  status?: string;
  valor?: number;
  valorCorrigido?: number;
  valorPago?: number;
  valorPagoParcial?: number;
  dataVencimento?: string;
  dataPagamento?: string;
  linhaDigitavel?: string;
  codigoPix?: string;
  link?: string;
  formaPagamento?: string;
}

/** "12/01/2023 09:05:22" ou "2023-01-12" → "2023-01-12". O SGP usa os dois. */
function toIsoDate(value?: string | null): string | undefined {
  const raw = (value ?? '').trim();
  if (!raw) return undefined;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(raw);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  return iso ? iso[1] : undefined;
}

function contatoDe(lista: { tipoContato?: string; contato?: string }[] | undefined, filtro?: RegExp) {
  const item = (lista ?? []).find((c) => c.contato && (!filtro || filtro.test(c.tipoContato ?? '')));
  return item?.contato ?? null;
}

/** O status vem como texto ("Ativo", "Suspenso") — mais confiável que o código. */
function mapContractStatus(c: SgpContrato): ErpContract['status'] {
  const label = (c.contratoStatusDisplay ?? '').toLowerCase();
  if (label.includes('ativ')) return 'active';
  if (label.includes('suspens') || label.includes('bloquead')) return 'suspended';
  if (label.includes('cancel') || label.includes('desativ') || label.includes('encerrad')) return 'cancelled';
  if (label) return 'pending';
  return c.contratoStatus === 1 ? 'active' : 'pending';
}

function enderecoDe(c: SgpContrato): string | undefined {
  const linha = [c.endereco_logradouro, c.endereco_numero, c.endereco_complemento]
    .filter(Boolean)
    .join(', ');
  const cidade = [c.endereco_bairro, c.endereco_cidade && `${c.endereco_cidade}${c.endereco_uf ? `/${c.endereco_uf}` : ''}`]
    .filter(Boolean)
    .join(' - ');
  const completo = [linha, cidade, c.endereco_cep].filter(Boolean).join(' — ');
  return completo || undefined;
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

  private async post(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const r = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app: this.app, token: this.token, ...body }),
      cache: 'no-store',
    });

    if (!r.ok) {
      // O SGP devolve o motivo em `detail` (403 de credencial) ou `erro` (400).
      const texto = await r.text();
      let motivo = texto.slice(0, 200);
      try {
        const j = JSON.parse(texto);
        motivo = j.detail ?? j.erro ?? motivo;
      } catch {
        /* corpo não-JSON: fica o texto cru mesmo */
      }
      throw new Error(`SGP ${path} ${r.status}: ${motivo}`);
    }
    return r.json();
  }

  /** Contratos do assinante. Aceita CPF/CNPJ, id do contrato ou login PPPoE. */
  private async consultarContratos(chave: Record<string, unknown>): Promise<SgpContrato[]> {
    const data = await this.post('/api/ura/consultacliente/', chave);
    return (data?.contratos as SgpContrato[]) ?? [];
  }

  async testConnection() {
    try {
      // CPF inexistente responde 200 com lista vazia; credencial errada, 403.
      await this.consultarContratos({ cpfcnpj: '00000000000' });
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        message: msg.includes('403')
          ? 'O SGP recusou as credenciais. Confira o nome do app e o token da integração.'
          : msg,
      };
    }
  }

  async listPlans(): Promise<ErpPlan[]> {
    // A API da URA não expõe catálogo de planos — o plano vem escrito no
    // contrato. O portal materializa a partir dele.
    return [];
  }

  async findCustomerByCpf(cpf: string): Promise<ErpCustomer | null> {
    // Esta instalação aceita as duas escritas, mas nem toda instalação aceita.
    let contratos: SgpContrato[] = [];
    for (const variant of documentVariants(cpf)) {
      contratos = await this.consultarContratos({ cpfcnpj: variant });
      if (contratos.length) break;
    }

    const c = contratos[0];
    if (!c) return null;

    return {
      // Ver o comentário do topo: a chave do assinante no SGP é o documento.
      externalId: onlyDigits(c.cpfCnpj) || onlyDigits(cpf),
      cpfCnpj: c.cpfCnpj ?? cpf,
      name: c.razaoSocial ?? '',
      email: contatoDe(c.emails),
      phone: contatoDe(c.telefones),
      whatsapp: contatoDe(c.telefones, /celular|whats/i),
      address: {
        street: c.endereco_logradouro ?? undefined,
        number: c.endereco_numero ?? undefined,
        complement: c.endereco_complemento ?? undefined,
        district: c.endereco_bairro ?? undefined,
        city: c.endereco_cidade ?? undefined,
        state: c.endereco_uf ?? undefined,
        zip: c.endereco_cep ?? undefined,
      },
    };
  }

  async listContractsByCustomer(customerExternalId: string): Promise<ErpContract[]> {
    const documento = onlyDigits(customerExternalId);
    // Cadastros antigos podem ter guardado o id do cliente do SGP em vez do
    // documento; sem CPF não há como consultar, então devolvemos vazio em vez
    // de estourar erro na cara do assinante.
    if (documento.length !== 11 && documento.length !== 14) return [];

    const contratos = await this.consultarContratos({ cpfcnpj: documento });
    return contratos
      .filter((c) => c.contratoId != null)
      .map((c) => ({
        externalId: String(c.contratoId),
        customerExternalId,
        planName: c.planointernet ?? c.servico_plano,
        status: mapContractStatus(c),
        pppoeUser: c.servico_login ?? undefined,
        dueDay: Number.isFinite(Number(c.cobVencimento)) ? Number(c.cobVencimento) : undefined,
        installationAddress: enderecoDe(c),
        activatedAt: toIsoDate(c.dataCadastro),
      }));
  }

  async listInvoicesByContract(
    contractExternalId: string,
    opts?: { onlyOpen?: boolean },
  ): Promise<ErpInvoice[]> {
    // `limit` cobre o histórico inteiro de um assinante comum (o padrão da API
    // é 250, e a paginação vem em `paginacao`).
    const data = await this.post('/api/ura/titulos/', {
      contrato: Number(contractExternalId) || contractExternalId,
      limit: 250,
    });

    const titulos = ((data?.titulos as SgpTitulo[]) ?? []).filter((t) => t.id != null);
    const hoje = new Date().toISOString().slice(0, 10);

    const invoices = titulos.map((t): ErpInvoice => {
      const dueDate = toIsoDate(t.dataVencimento) ?? '';
      const situacao = (t.status ?? '').toLowerCase();

      let status: ErpInvoice['status'];
      if (situacao.startsWith('pago')) status = 'paid';
      else if (situacao.startsWith('cancel')) status = 'cancelled';
      else if (Number(t.valorPagoParcial) > 0) status = 'partial';
      else if (dueDate && dueDate < hoje) status = 'overdue';
      else status = 'open';

      // Em aberto, o que o assinante paga é o valor corrigido (juros/multa).
      const valor = Number(t.valorCorrigido) || Number(t.valor) || 0;

      return {
        externalId: String(t.id),
        contractExternalId,
        referenceMonth: dueDate ? `${dueDate.slice(0, 7)}-01` : undefined,
        dueDate,
        amountCents: Math.round(valor * 100),
        status,
        pixCopyPaste: t.codigoPix || undefined,
        boletoLine: t.linhaDigitavel || undefined,
        boletoPdfUrl: t.link || undefined,
        paidAt: toIsoDate(t.dataPagamento),
        paidAmountCents: Number(t.valorPago) ? Math.round(Number(t.valorPago) * 100) : undefined,
        paidMethod: t.formaPagamento || undefined,
      };
    });

    return opts?.onlyOpen
      ? invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
      : invoices;
  }

  async getInvoice(invoiceExternalId: string): Promise<ErpInvoice | null> {
    // A API da URA não tem consulta de título avulso (`/api/ura/titulo/` é 404):
    // títulos só saem por contrato ou por CPF. Quem precisa de uma fatura usa a
    // cópia gravada no banco pela sincronização.
    void invoiceExternalId;
    return null;
  }
}
