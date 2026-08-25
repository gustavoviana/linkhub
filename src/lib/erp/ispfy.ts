import type {
  ErpAdapter,
  ErpConnection,
  ErpContract,
  ErpCustomer,
  ErpInvoice,
  ErpPlan,
  ErpUsagePoint,
  ErpUsageRange,
} from './types';
import { documentVariants, onlyDigits } from '@/lib/documento';
import { explicarErroDoErp } from './erros';
import { usageSlots } from './usage';

// Adapter ISPFY.
// Doc: https://www.ispfy.com.br/api/postman — endpoint <host>:<porta>/api/...
// Auth: header `token`, individual de cada usuário do sistema, herdando as
// permissões dele.
//
// A API tem duas famílias de rotas. As `/object` expõem as tabelas cruas e
// estão marcadas na própria documentação como "serão descontinuadas"; as
// `/tool` são as recomendadas, e é só delas que este adapter depende.
//
// A `/tool/assinante/info` devolve a árvore inteira do assinante numa única
// chamada — cadastro, contratos, cobranças e pontos de internet —, então quase
// tudo que a central mostra sai de uma requisição só, memorizada por instância
// (e há uma instância por request).

interface IspfyConfig {
  baseUrl: string;
  token: string;
}

/** Portas padrão do webservice: as rotas privadas ouvem separadas por protocolo. */
const PORTA_HTTPS = '8043';
const PORTA_HTTP = '8020';

interface IspfyCobranca {
  id?: string;
  id_contrato?: string;
  data_vencimento?: string;
  data_referencia?: string;
  data_pagamento?: string | null;
  data_exclusao?: string | null;
  valor?: string;
  valor_pago?: string | null;
  status?: string;
  tipo_cobranca?: string;
  linha_digitavel?: string | null;
  pix_copia_cola?: string | null;
}

interface IspfyPonto {
  id?: string;
  id_contrato?: string;
  ativo?: string;
  nome_ponto?: string;
  usuario?: string;
  banda_contratada?: string | null;
  cep?: string | null;
  bairro?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  data_ativacao?: string | null;
  tipo_conexao?: string | null;
  sessao_conexao_status?: string | null;
  sessao_ultimo_login?: string | null;
  sessao_ipv4_wan_endereco_alocado?: string | null;
  mac?: string | null;
}

interface IspfyContrato {
  id?: string;
  id_cliente?: string;
  contrato_ativo?: string;
  status_contrato?: string;
  data_adesao?: string | null;
  data_rescisao?: string | null;
  valor_mensal?: string;
  dia_vencimento?: string;
  fidelidade_meses?: string;
  endereco_custom_endereco?: string | null;
  endereco_custom_numero?: string | null;
  endereco_custom_bairro?: string | null;
  endereco_custom_cidade?: string | null;
  cobrancas?: unknown;
  pontos?: unknown;
}

interface IspfyCliente {
  id?: string;
  nome_razao?: string;
  fantasia_apelido?: string;
  cpf_cnpj?: string;
  endereco_cobranca_rua?: string | null;
  endereco_cobranca_numero?: string | null;
  endereco_cobranca_complemento?: string | null;
  endereco_cobranca_bairro?: string | null;
  endereco_cobranca_cep?: string | null;
  contratos?: unknown;
}

/** Um item de /tool/assinante/ponto/status. */
interface IspfyStatusDePonto {
  id_ponto?: string;
  id_contrato?: string;
  nome_ponto?: string;
  bloqueado?: string;
  plano_contratado_nome?: string | null;
  plano_contratado_velocidade?: string | null;
  velocidade_atual?: string | null;
  ultimo_login?: string | null;
  conexao_status?: string | null;
  ipv4_atual_wan?: string | null;
}

/** Um item de /tool/assinante/boleto?tipo=linha-detalhes. */
interface IspfyDetalheDeBoleto {
  id?: string;
  linha?: string | null;
  pix?: string | null;
}

interface DetalheDeBoleto {
  linha?: string;
  pix?: string;
}

/**
 * O ISPFY serve as listas aninhadas ora como array, ora como objeto indexado
 * (`{"15": {...}, "16": {...}}`) — é o `json_encode` do PHP quando as chaves do
 * array deixam de ser sequenciais, o que acontece assim que uma linha é
 * filtrada no meio. Na mesma resposta um contrato traz `cobrancas` como array
 * e o seguinte como objeto. Ler só o array devolveria zero fatura para a
 * maioria dos contratos, então toda lista aninhada passa por aqui.
 */
function lista<T>(valor: unknown): T[] {
  if (Array.isArray(valor)) return valor as T[];
  if (valor && typeof valor === 'object') return Object.values(valor as Record<string, T>);
  return [];
}

/** "2022-05-10 00:00:00" e "2022-05-10" viram "2022-05-10". */
function toIsoDate(value: unknown): string {
  const v = String(value ?? '').trim();
  if (!v || v.startsWith('0000')) return '';
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(v);
  if (iso) return iso[1]!;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(v);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : '';
}

function toIsoDateTime(value: unknown): string | undefined {
  const v = String(value ?? '').trim();
  if (!v || v.startsWith('0000')) return undefined;
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(v);
  if (m) return `${m[1]}T${m[2]}`;
  return toIsoDate(v) || undefined;
}

/** Hoje no fuso do provedor — em servidor UTC a virada do dia chega cedo. */
function hojeNoBrasil(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

/**
 * O ISPFY já guarda dinheiro em centavos: `valor_mensal: "8100"` é R$ 81,00.
 * É o contrário do IXC e do SGP, que mandam reais — converter de novo aqui
 * multiplicaria a conta do assinante por cem.
 */
function centavos(valor: unknown): number {
  const n = Number(String(valor ?? '').trim());
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** O consumo vem em kbytes; o resto do app fala em bytes. */
function kbytesEmBytes(valor: unknown): number {
  const n = Number(String(valor ?? '').trim());
  return Number.isFinite(n) ? Math.round(n * 1024) : 0;
}

/** "100000K/50000K" vira 100 / 50 Mbps. */
function velocidades(banda: unknown): { down?: number; up?: number } {
  const m = /(\d+)\s*K\s*\/\s*(\d+)\s*K/i.exec(String(banda ?? ''));
  if (!m) return {};
  const mbps = (kbps: number) => (kbps > 0 ? Math.max(1, Math.round(kbps / 1000)) : undefined);
  return { down: mbps(Number(m[1])), up: mbps(Number(m[2])) };
}

/**
 * O status da sessão do ISPFY é um rótulo, não um booleano: "none" para quem
 * nunca conectou, "expired" para sessão vencida. Como o conjunto completo de
 * valores não está documentado, a leitura é pelo lado positivo — só conta como
 * online o que o ISPFY escreve como conectado. Assim um rótulo novo aparece
 * como desconectado, e não como "conectado" para quem está sem internet.
 */
function conectado(status: unknown): boolean {
  return /^(online|conectado|connected|ativo|active|start|up)$/i.test(String(status ?? '').trim());
}

/** Aceita `host`, `https://host`, com ou sem porta, e com `/api` no fim. */
function normalizeBaseUrl(raw: string): string {
  let bruto = (raw ?? '').trim();
  if (!bruto) return '';
  if (!/^https?:\/\//i.test(bruto)) bruto = `https://${bruto}`;
  bruto = bruto.replace(/\/+$/, '').replace(/\/api$/i, '');

  try {
    const url = new URL(bruto);
    // Sem porta a chamada iria para 443/80, onde mora a central web e não o
    // webservice — o provedor receberia o HTML da tela de login no lugar do
    // JSON, e o erro não diria nada sobre porta.
    if (!url.port) url.port = url.protocol === 'http:' ? PORTA_HTTP : PORTA_HTTPS;
    return `${url.protocol}//${url.host}`;
  } catch {
    return bruto;
  }
}

/**
 * As rotas `/tool` do ISPFY são chaveadas por cliente — não existe consulta por
 * contrato. Mas `listInvoicesByContract`, `getConnection` e `getUsage` recebem
 * só o id do contrato: vêm do cron e da sincronização, sem o cliente por perto.
 * Por isso o `externalId` do contrato carrega os dois códigos,
 * "<id_cliente>-<id_contrato>" — é a única chave que o resto do app consegue
 * devolver depois. Mesma saída do adapter do SGP, onde o `externalId` do
 * cliente é o CPF pelo mesmo motivo.
 */
function chaveDoContrato(idCliente: unknown, idContrato: unknown): string {
  return `${String(idCliente ?? '')}-${String(idContrato ?? '')}`;
}

function lerChaveDoContrato(chave: string): { idCliente: string; idContrato: string } | null {
  const m = /^(\d+)-(\d+)$/.exec(String(chave ?? '').trim());
  return m ? { idCliente: m[1]!, idContrato: m[2]! } : null;
}

/**
 * Executa em lotes. O ISPFY roda no servidor do provedor, não num datacenter
 * elástico: disparar trinta consultas de uma vez para desenhar um gráfico é um
 * jeito de derrubar o ERP de quem nos contratou.
 */
async function emLotes<T, R>(itens: T[], tamanho: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const saida: R[] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    saida.push(...(await Promise.all(itens.slice(i, i + tamanho).map((item) => fn(item)))));
  }
  return saida;
}

export class IspfyAdapter implements ErpAdapter {
  name = 'ispfy';
  private baseUrl: string;
  private token: string;

  // Memória da instância — e há uma instância por request. A árvore do
  // assinante é usada por contratos, faturas, conexão e consumo; sem isto a
  // mesma resposta seria baixada quatro vezes para pintar uma tela.
  private clientes = new Map<string, Promise<IspfyCliente | null>>();
  private pontos = new Map<string, Promise<IspfyStatusDePonto[]>>();
  private boletos = new Map<string, Promise<Map<string, DetalheDeBoleto>>>();

  constructor(cfg: IspfyConfig) {
    this.baseUrl = normalizeBaseUrl(cfg.baseUrl);
    this.token = (cfg.token ?? '').trim();
  }

  private montarUrl(caminho: string, query?: Record<string, string | number | undefined>): string {
    const url = new URL(`${this.baseUrl}/api${caminho}`);
    for (const [chave, valor] of Object.entries(query ?? {})) {
      if (valor !== undefined && valor !== null && valor !== '') {
        url.searchParams.set(chave, String(valor));
      }
    }
    return url.toString();
  }

  private async buscar(
    caminho: string,
    query?: Record<string, string | number | undefined>,
    accept = 'application/json',
  ): Promise<Response> {
    return fetch(this.montarUrl(caminho, query), {
      headers: { token: this.token, Accept: accept },
      cache: 'no-store',
    });
  }

  /**
   * O ISPFY devolve o motivo em `{"message": "..."}` e deixa o resto com o
   * status HTTP: 401/403 para credencial, 404 para quem não existe. Quando a
   * origem não está liberada no firewall não vem resposta nenhuma — a conexão
   * morre antes de virar HTTP, e quem traduz isso é ./erros.
   */
  private async recusa(r: Response, caminho: string): Promise<Error> {
    const texto = (await r.text().catch(() => '')).trim();
    let motivo = texto.slice(0, 300);
    try {
      const json = JSON.parse(texto) as { message?: unknown; mensagem?: unknown };
      motivo = String(json?.message ?? json?.mensagem ?? motivo);
    } catch {
      // Corpo não-JSON (uma página de erro do proxy, por exemplo): fica o texto.
    }
    return new Error(`ISPFY ${caminho} ${r.status}: ${motivo}`);
  }

  private async req<T>(
    caminho: string,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const r = await this.buscar(caminho, query);
    if (!r.ok) throw await this.recusa(r, caminho);
    return (await r.json()) as T;
  }

  /** A árvore do assinante, por CPF/CNPJ ou pelo código do cliente. */
  private info(chave: { doc?: string; id?: string }): Promise<IspfyCliente | null> {
    const memo = chave.doc ? `doc:${onlyDigits(chave.doc)}` : `id:${chave.id}`;
    const guardado = this.clientes.get(memo);
    if (guardado) return guardado;

    const pedido = this.buscarCliente(chave);
    this.clientes.set(memo, pedido);
    return pedido;
  }

  private async buscarCliente(chave: { doc?: string; id?: string }): Promise<IspfyCliente | null> {
    const caminho = '/tool/assinante/info';
    const r = await this.buscar(caminho, chave);

    // Assinante inexistente não é falha de integração: o ISPFY responde 404
    // com "Cliente não encontrado". Separar isso do 401 é o que deixa a central
    // dizer "CPF não encontrado" sem acusar a integração, e vice-versa.
    if (r.status === 404) return null;
    if (!r.ok) throw await this.recusa(r, caminho);

    const dados = (await r.json().catch(() => null)) as IspfyCliente | null;
    const cliente = dados && dados.id ? dados : null;

    // Guarda a mesma árvore sob as duas chaves: quem entrou pelo CPF costuma
    // pedir contratos e faturas logo em seguida, aí já pelo código do cliente.
    if (cliente) {
      this.clientes.set(`id:${cliente.id}`, Promise.resolve(cliente));
      const documento = onlyDigits(cliente.cpf_cnpj);
      if (documento) this.clientes.set(`doc:${documento}`, Promise.resolve(cliente));
    }
    return cliente;
  }

  /** A árvore que já está em memória, sem ir buscar se não estiver. */
  private clienteMemorizado(idCliente: string): Promise<IspfyCliente | null> | undefined {
    return this.clientes.get(`id:${idCliente}`);
  }

  /** Estado ao vivo dos pontos de internet ativos de um cliente. */
  private statusDosPontos(idCliente: string): Promise<IspfyStatusDePonto[]> {
    const guardado = this.pontos.get(idCliente);
    if (guardado) return guardado;

    const pedido = this.req<unknown>('/tool/assinante/ponto/status', {
      id_cliente: idCliente,
    }).then((dados) => lista<IspfyStatusDePonto>(dados));

    this.pontos.set(idCliente, pedido);
    return pedido;
  }

  /**
   * Pix e linha digitável por fatura, vindos da segunda via.
   *
   * O cadastro da cobrança não basta: `pix_copia_cola` chega nulo em quem emite
   * por gateway, e `linha_digitavel` só aparece depois de o boleto ser
   * registrado no banco. Quem tem os dois prontos é a segunda via, que responde
   * por CPF e devolve um item por fatura a pagar. É uma chamada a mais por
   * sincronização de contrato, e é ela que faz o Pix já chegar gravado — senão
   * a tela da fatura esperaria o ERP na primeira abertura de cada conta.
   *
   * Melhor esforço: provedor sem carteira configurada não tem boleto nenhum, e
   * isso não pode impedir as faturas de aparecerem na central.
   */
  private detalhesDeBoleto(doc: unknown): Promise<Map<string, DetalheDeBoleto>> {
    const documento = onlyDigits(String(doc ?? ''));
    if (!documento) return Promise.resolve(new Map());

    const guardado = this.boletos.get(documento);
    if (guardado) return guardado;

    const pedido = this.buscarSegundaVia(documento);
    this.boletos.set(documento, pedido);
    return pedido;
  }

  private async buscarSegundaVia(documento: string): Promise<Map<string, DetalheDeBoleto>> {
    // "pagar" traz só o que o assinante ainda deve, que é o que precisa de Pix.
    // Ele aparece na documentação atual, mas não na lista publicada junto com a
    // biblioteca oficial — instalação mais antiga pode não conhecer o valor.
    // Nesse caso "todos" cobre o mesmo, ao custo de uma resposta maior.
    for (const status of ['pagar', 'todos']) {
      try {
        const dados = await this.req<{ cobrancas?: unknown }>('/tool/assinante/boleto', {
          doc: documento,
          status,
          tipo: 'linha-detalhes',
          retorno: 'json',
        });

        const mapa = new Map<string, DetalheDeBoleto>();
        for (const item of lista<IspfyDetalheDeBoleto>(dados?.cobrancas)) {
          if (!item?.id) continue;
          mapa.set(String(item.id), {
            linha: item.linha || undefined,
            pix: item.pix || undefined,
          });
        }
        return mapa;
      } catch (e) {
        console.error(`[ispfy] segunda via indisponível (status=${status})`, e);
      }
    }
    return new Map();
  }

  async testConnection() {
    try {
      if (!this.baseUrl) throw new Error('Endereço do servidor não preenchido.');
      // CPF que não existe responde 404 depois de a credencial passar;
      // credencial errada para antes disso, em 401/403.
      await this.info({ doc: '00000000000' });
      return { ok: true };
    } catch (e: unknown) {
      return { ok: false, message: explicarErroDoErp('ispfy', e) };
    }
  }

  /**
   * O ISPFY só expõe catálogo de planos nas rotas `/object`, que a própria
   * documentação marca como a descontinuar. O plano que interessa à central é o
   * do contrato, e esse vem do ponto de internet — nome e velocidade saem em
   * `listContractsByCustomer`, e o portal materializa o plano a partir daí.
   */
  async listPlans(): Promise<ErpPlan[]> {
    return [];
  }

  async findCustomerByCpf(cpf: string): Promise<ErpCustomer | null> {
    // A rota aceita o documento formatado ou só os dígitos, e cada instalação
    // guarda de um jeito. Tentamos as duas escritas antes de desistir.
    for (const variante of documentVariants(cpf)) {
      const cliente = await this.info({ doc: variante });
      if (cliente) return this.paraCliente(cliente, cpf);
    }
    return null;
  }

  private paraCliente(c: IspfyCliente, cpfConsultado: string): ErpCustomer {
    return {
      externalId: String(c.id),
      cpfCnpj: c.cpf_cnpj || cpfConsultado,
      name: c.nome_razao || c.fantasia_apelido || '',
      // Telefone e e-mail moram em /object/cliente/contato, uma das rotas que o
      // ISPFY marcou para descontinuar. A central não depende deles — o login é
      // por CPF —, então ficam de fora em vez de amarrar a integração a uma
      // rota com prazo de validade.
      email: null,
      phone: null,
      address: {
        street: c.endereco_cobranca_rua ?? undefined,
        number: c.endereco_cobranca_numero ?? undefined,
        complement: c.endereco_cobranca_complemento ?? undefined,
        district: c.endereco_cobranca_bairro ?? undefined,
        zip: c.endereco_cobranca_cep ?? undefined,
      },
    };
  }

  async listContractsByCustomer(customerExternalId: string): Promise<ErpContract[]> {
    const idCliente = String(customerExternalId ?? '').trim();
    const cliente = await this.info({ id: idCliente });
    if (!cliente) return [];

    // O nome e a velocidade do plano não estão no contrato: vivem no ponto de
    // internet, e é o status que os entrega prontos. Melhor esforço — sem eles
    // o contrato ainda aparece, só sem o nome do plano.
    const status = await this.statusDosPontos(String(cliente.id)).catch(
      () => [] as IspfyStatusDePonto[],
    );

    return lista<IspfyContrato>(cliente.contratos)
      .filter((c) => c.id != null)
      .map((c) => {
        const idContrato = String(c.id);
        const pontos = lista<IspfyPonto>(c.pontos);
        const ponto = pontos.find((p) => String(p.ativo).toLowerCase() === 's') ?? pontos[0];
        const doContrato = status.find((s) => String(s.id_contrato) === idContrato);

        const banda = doContrato?.plano_contratado_velocidade ?? ponto?.banda_contratada;
        const { down, up } = velocidades(banda);

        return {
          externalId: chaveDoContrato(cliente.id, idContrato),
          customerExternalId,
          planName: doContrato?.plano_contratado_nome || undefined,
          planDownMbps: down,
          planUpMbps: up,
          status: this.mapContractStatus(c),
          pppoeUser: ponto?.usuario || undefined,
          dueDay: Number(c.dia_vencimento) || undefined,
          monthlyPriceCents: centavos(c.valor_mensal) || undefined,
          installationAddress: this.enderecoDe(c, ponto),
          activatedAt: toIsoDate(c.data_adesao) || undefined,
        };
      });
  }

  private enderecoDe(c: IspfyContrato, ponto?: IspfyPonto): string | undefined {
    // O endereço da instalação é o do ponto; o do contrato só existe quando o
    // provedor sobrescreveu o cadastro.
    const rua = c.endereco_custom_endereco || ponto?.endereco;
    const numero = c.endereco_custom_numero || ponto?.numero;
    const bairro = c.endereco_custom_bairro || ponto?.bairro;
    const cidade = c.endereco_custom_cidade;

    const linha = [rua, numero].filter(Boolean).join(', ');
    const completo = [linha, bairro, cidade].filter(Boolean).join(' - ');
    return completo || undefined;
  }

  async listInvoicesByContract(
    contractExternalId: string,
    opts?: { onlyOpen?: boolean },
  ): Promise<ErpInvoice[]> {
    const chave = lerChaveDoContrato(contractExternalId);
    // Contrato gravado antes desta integração não carrega o código do cliente,
    // e sem ele não há consulta possível nas rotas /tool. Devolver vazio deixa
    // a central mostrando o que já tem, em vez de estourar na cara do
    // assinante; a próxima sincronização do cadastro regrava a chave certa.
    if (!chave) return [];

    const cliente = await this.info({ id: chave.idCliente });
    if (!cliente) return [];

    const contrato = lista<IspfyContrato>(cliente.contratos).find(
      (c) => String(c.id) === chave.idContrato,
    );
    if (!contrato) return [];

    const detalhes = await this.detalhesDeBoleto(cliente.cpf_cnpj);
    const hoje = hojeNoBrasil();

    const faturas = lista<IspfyCobranca>(contrato.cobrancas)
      .filter((f) => f.id != null)
      .map((f): ErpInvoice => {
        const vencimento = toIsoDate(f.data_vencimento);
        const referencia = toIsoDate(f.data_referencia) || vencimento;
        const boleto = detalhes.get(String(f.id));

        return {
          externalId: String(f.id),
          contractExternalId,
          // Mês de referência é o do vencimento: é como o assinante lê a conta.
          referenceMonth: referencia ? `${referencia.slice(0, 7)}-01` : undefined,
          dueDate: vencimento,
          amountCents: centavos(f.valor),
          status: this.mapInvoiceStatus(f, vencimento, hoje),
          pixCopyPaste: f.pix_copia_cola || boleto?.pix || undefined,
          boletoLine: f.linha_digitavel || boleto?.linha || undefined,
          paidAt: toIsoDate(f.data_pagamento) || undefined,
          paidAmountCents: f.valor_pago ? centavos(f.valor_pago) : undefined,
        };
      });

    return opts?.onlyOpen
      ? faturas.filter((f) => f.status !== 'paid' && f.status !== 'cancelled')
      : faturas;
  }

  /**
   * A segunda via responde por CPF, e aqui só chega o código da fatura — não dá
   * para descobrir o assinante sem as rotas que o ISPFY vai descontinuar. Não
   * faz falta: o Pix já vem gravado pela sincronização, lá em
   * `listInvoicesByContract`.
   */
  async getInvoice(invoiceExternalId: string): Promise<ErpInvoice | null> {
    void invoiceExternalId;
    return null;
  }

  /** PDF do boleto, em base64. */
  async getInvoiceBoletoPdf(invoiceExternalId: string): Promise<string | null> {
    const id = onlyDigits(invoiceExternalId);
    if (!id) return null;

    const r = await this.buscar(
      `/tool/assinante/boleto/imprimir/${id}`,
      { retorno: 'pdf' },
      'application/pdf',
    );
    if (!r.ok) return null;

    const bytes = Buffer.from(await r.arrayBuffer());
    // A mesma rota sabe devolver HTML; sem o cabeçalho do PDF não é arquivo, e
    // servir a página como .pdf abriria um anexo quebrado no celular.
    return bytes.subarray(0, 4).toString('latin1') === '%PDF' ? bytes.toString('base64') : null;
  }

  async getConnection(contractExternalId: string): Promise<ErpConnection | null> {
    const chave = lerChaveDoContrato(contractExternalId);
    if (!chave) return null;

    const pontos = (await this.statusDosPontos(chave.idCliente)).filter(
      (p) => String(p.id_contrato) === chave.idContrato,
    );
    // Contrato com mais de um ponto mostra o que está no ar; se nenhum estiver,
    // o primeiro, que é de onde vem o motivo do bloqueio.
    const ponto = pontos.find((p) => conectado(p.conexao_status)) ?? pontos[0];
    if (!ponto) return null;

    // Login, MAC e tipo de conexão vivem na árvore do assinante, não no status.
    // Se ela já estiver em memória nesta requisição, aproveita; buscar só por
    // causa desses três campos custaria uma chamada inteira ao ERP do provedor.
    const cliente = await (this.clienteMemorizado(chave.idCliente) ?? Promise.resolve(null));
    const cadastro = cliente
      ? lista<IspfyContrato>(cliente.contratos)
          .flatMap((c) => lista<IspfyPonto>(c.pontos))
          .find((p) => String(p.id) === String(ponto.id_ponto))
      : undefined;

    const online = conectado(ponto.conexao_status);
    return {
      online,
      login: cadastro?.usuario || undefined,
      ip: ponto.ipv4_atual_wan || cadastro?.sessao_ipv4_wan_endereco_alocado || undefined,
      mac: cadastro?.mac || undefined,
      kind: cadastro?.tipo_conexao || undefined,
      since: toIsoDateTime(ponto.ultimo_login),
      // O ISPFY conta o tráfego do mês, não o da sessão. Preencher
      // `downloadBytes` com ele faria a central escrever "X nesta conexão"
      // debaixo do consumo do mês inteiro, então fica de fora.
      disconnectReason:
        !online && String(ponto.bloqueado) === '1' ? 'Acesso bloqueado no ERP' : undefined,
    };
  }

  /**
   * Consumo por período.
   *
   * O ISPFY mede por dia: `/tool/assinante/ponto/consumo` devolve o total de um
   * intervalo, sem abrir por hora, e aceita no máximo trinta dias. Então cada
   * dia do gráfico é uma consulta, em lotes para não afogar o servidor do
   * provedor, e o período "hoje" sai como um ponto só — o número é real, mas a
   * medição hora a hora que o IXC dá aqui não existe neste ERP.
   */
  async getUsage(contractExternalId: string, range: ErpUsageRange = '7d'): Promise<ErpUsagePoint[]> {
    const chave = lerChaveDoContrato(contractExternalId);
    if (!chave) return [];

    const pontos = (await this.statusDosPontos(chave.idCliente)).filter(
      (p) => String(p.id_contrato) === chave.idContrato,
    );
    // Contrato com vários pontos daria um gráfico por ponto; a central tem um
    // só, então ela acompanha o principal.
    const idPonto = pontos[0]?.id_ponto;
    if (!idPonto) return [];

    if (range === 'today') {
      const dia = usageSlots('today')[0]?.point.date.slice(0, 10);
      if (!dia) return [];
      const total = await this.consumo(String(idPonto), dia, dia);
      return [
        { date: dia, label: 'hoje', downloadBytes: total.download, uploadBytes: total.upload },
      ];
    }

    const slots = usageSlots(range);
    const totais = await emLotes(
      slots.map((s) => s.point.date),
      6,
      (dia) => this.consumo(String(idPonto), dia, dia),
    );

    return slots.map((slot, i) => ({
      ...slot.point,
      downloadBytes: totais[i]?.download ?? 0,
      uploadBytes: totais[i]?.upload ?? 0,
    }));
  }

  private async consumo(idPonto: string, inicio: string, fim: string) {
    // Os campos se chamam "mes" em qualquer consulta; o que eles trazem é o
    // total do intervalo pedido.
    const dados = await this.req<{ download_mes_kbytes?: unknown; upload_mes_kbytes?: unknown }>(
      '/tool/assinante/ponto/consumo',
      { id_ponto: idPonto, data_inicial: inicio, data_final: fim },
    );
    return {
      download: kbytesEmBytes(dados?.download_mes_kbytes),
      upload: kbytesEmBytes(dados?.upload_mes_kbytes),
    };
  }

  private mapContractStatus(c: IspfyContrato): ErpContract['status'] {
    if (String(c.contrato_ativo ?? '').toLowerCase() === 'n' || c.data_rescisao) return 'cancelled';

    // `status_contrato` é o que reflete o corte por falta de pagamento:
    // "livre" para quem está liberado, "bloqueado" para quem não está. O
    // contrato sozinho diria "ativo" com a internet cortada.
    const s = String(c.status_contrato ?? '').toLowerCase();
    if (s.includes('cancel') || s.includes('rescind')) return 'cancelled';
    if (s.includes('bloque') || s.includes('suspens')) return 'suspended';
    if (s.includes('livre') || s.includes('ativ') || s.includes('liberad')) return 'active';
    return s ? 'pending' : 'active';
  }

  private mapInvoiceStatus(c: IspfyCobranca, dueDate: string, hoje: string): ErpInvoice['status'] {
    // Cobrança excluída continua na resposta, com a data do estorno preenchida.
    if (c.data_exclusao) return 'cancelled';

    const s = String(c.status ?? '').toLowerCase();
    if (s.startsWith('pago') || s.startsWith('recebid') || s.startsWith('baixad')) return 'paid';
    if (s.startsWith('cancel') || s.startsWith('exclu') || s.startsWith('estorn')) return 'cancelled';

    const pago = centavos(c.valor_pago);
    if (pago > 0 && pago < centavos(c.valor)) return 'partial';

    // O ISPFY não marca "vencida": quem decide é a data, e é essa distinção que
    // a central mostra ao assinante.
    if (!dueDate) return 'open';
    return dueDate < hoje ? 'overdue' : 'open';
  }
}
