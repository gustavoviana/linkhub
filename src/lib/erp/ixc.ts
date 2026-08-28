import type { ErpAdapter, ErpCheck, ErpCustomer, ErpPlan, ErpContract, ErpInvoice, ErpConfig, ErpConnection, ErpUsagePoint, ErpUsageRange, ErpPix } from './types';
import { usageSlots } from './usage';
import { documentVariants } from '@/lib/documento';
import { explicarErroDoErp, limparMensagem } from './erros';

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

/**
 * "MARAUNET-PLANO-500X500 2026" → 500 / 500.
 *
 * O separador vira espaço antes de medir. Cada provedor escreve o nome do
 * plano do seu jeito, e `\s*` não casa com underscore: "PLANO_200_MEGA_FIXO"
 * não era reconhecido e o assinante via "— ↓ / — ↑ Mbps" no lugar da
 * velocidade que ele contratou, enquanto o provedor ao lado — que escreve
 * "500X500" — aparecia certo. É o mesmo tratamento que `nomeDoGrupo` já dava
 * ao grupo do RADIUS, que sofria disto antes.
 */
function parseSpeeds(name?: string): { down: number; up: number } | null {
  if (!name) return null;
  const limpo = name.replace(/[_-]+/g, ' ');
  const m = /(\d{1,5})\s*[xX]\s*(\d{1,5})/.exec(limpo);
  if (m) return { down: Number(m[1]), up: Number(m[2]) };
  const single = /(\d{2,5})\s*(?:MEGA|MB|MBPS)/i.exec(limpo);
  if (single) return { down: Number(single[1]), up: Number(single[1]) };
  return null;
}

/**
 * O grupo do RADIUS é guardado sem espaço ("MR_600_MEGA") porque o valor vai
 * para o concentrador. Para exibir — e para o parseSpeeds enxergar o número —
 * o underscore vira espaço.
 */
function nomeDoGrupo(bruto: unknown): string {
  const nome = String(bruto ?? '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
  return nome || 'Plano';
}

/**
 * Velocidade que o nome do grupo anuncia — vale mais que o perfil do RADIUS,
 * que sempre entrega com margem sobre o vendido. Aceita um dígito só, ao
 * contrário do parseSpeeds dos contratos: o catálogo guarda plano antigo de
 * "3 MEGA", e cair no perfil mostraria 30.
 */
function velocidadeAnunciada(nome: string): { down: number; up: number } | null {
  const doContrato = parseSpeeds(nome);
  if (doContrato) return doContrato;
  const m = /(\d{1,5})\s*(?:MEGA|MB|MBPS)\b/i.exec(nome);
  return m ? { down: Number(m[1]), up: Number(m[1]) } : null;
}

/** Velocidade do perfil do RADIUS: "850M", "9216M", "1G" → Mbps. */
function parseRadiusSpeed(value: unknown): number | undefined {
  const m = /^(\d+(?:[.,]\d+)?)\s*([KMG])?/i.exec(String(value ?? '').trim());
  if (!m) return undefined;
  const numero = Number(m[1]!.replace(',', '.'));
  if (!Number.isFinite(numero) || numero <= 0) return undefined;
  const unidade = (m[2] ?? 'M').toUpperCase();
  const mbps = unidade === 'G' ? numero * 1000 : unidade === 'K' ? numero / 1000 : numero;
  return Math.round(mbps) || undefined;
}

/**
 * O IXC serve o JSON declarando ISO-8859-1 com o texto já em UTF-8, então
 * "não" chega escrito "nÃ£o". Desfaz a dupla codificação quando o resultado é
 * texto válido — senão a mensagem do ERP apareceria embaralhada no painel.
 */
function corrigirAcentos(texto: string): string {
  if (!/[ÃÂ]/.test(texto)) return texto;
  try {
    const refeito = Buffer.from(texto, 'latin1').toString('utf8');
    return refeito.includes('\uFFFD') ? texto : refeito;
  } catch {
    return texto;
  }
}

/** Primeiro valor preenchido entre nomes alternativos do mesmo campo. */
function pick(registro: Record<string, unknown> | undefined, ...nomes: string[]): unknown {
  for (const nome of nomes) {
    const v = registro?.[nome];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return undefined;
}

/**
 * Onde o IXC guarda a contabilidade do RADIUS.
 *
 * O nome da tabela e o campo de busca mudam entre versões e entre modelos de
 * autenticação da instalação — é a parte mais instável do webservice. Um
 * provedor em PPPoE responde em `radacct` indexado por `username` (o FreeRADIUS
 * indexa por login, não por cliente); outro, em versão diferente, só responde
 * em `radpop_radaccounting`. Como as duas instalações são do mesmo ERP e a
 * integração é a mesma, pedir só `radacct.username` deixava um provedor com o
 * gráfico funcionando e o outro com a área vazia, sem nada que apontasse a
 * diferença.
 *
 * A ordem importa: primeiro o que é indexado por login, que é específico do
 * contrato; a busca por cliente vem depois porque, em quem tem mais de um
 * contrato, ela traz sessão que não é deste.
 */
const TENTATIVAS_DE_CONSUMO: { resource: string; field: string; por: 'login' | 'cliente' }[] = [
  { resource: 'radacct', field: 'username', por: 'login' },
  { resource: 'radpop_radaccounting', field: 'login', por: 'login' },
  { resource: 'radpop_radaccounting', field: 'nomeusuario', por: 'login' },
  { resource: 'radpop_radacct', field: 'login', por: 'login' },
  { resource: 'radacct', field: 'id_cliente', por: 'cliente' },
  { resource: 'radpop_radaccounting', field: 'id_cliente', por: 'cliente' },
  { resource: 'radpop_radacct', field: 'id_cliente', por: 'cliente' },
];

// Os mesmos dados com nomes diferentes conforme a tabela que respondeu. Só
// entram aqui nomes vistos em instalação real: inventar apelido de campo de
// bytes arriscaria somar velocidade como volume e mostrar um gráfico errado,
// que é pior que um gráfico vazio. Quando nenhum casa, o diagnóstico imprime os
// campos que vieram de verdade, e o nome certo entra aqui depois de visto.
const CAMPOS_INICIO = ['acctstarttime', 'inicioconexao', 'conexao_data', 'inicio_data', 'start_time', 'data_inicio', 'data_conexao'];
const CAMPOS_FIM = ['acctstoptime', 'fimconexao', 'desconexao_data', 'fim_data', 'stop_time', 'data_fim', 'data_desconexao'];
const CAMPOS_DOWNLOAD = ['acctoutputoctets', 'output_octets'];
const CAMPOS_UPLOAD = ['acctinputoctets', 'input_octets'];
const CAMPOS_DURACAO = ['acctsessiontime', 'sessiontime'];
const CAMPOS_LOGIN = ['username', 'login', 'nomeusuario', 'usuario'];

/**
 * O IXC recusa chamada respondendo HTTP 200: o motivo vem no corpo, como
 * {"type":"error","message":"Seu IP não está liberado..."}. Tratar isso como
 * resposta boa era o que fazia o painel dizer "Conexão OK" com a integração
 * recusada, e a central responder "cliente não encontrado" para assinante que
 * existe — a lista vinha vazia porque o IXC nem chegou a consultar.
 *
 * Devolve o motivo da recusa, ou null quando a resposta é legítima.
 */
function motivoDaRecusa(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as { type?: unknown; message?: unknown; mensagem?: unknown };
  if (String(p.type ?? '').toLowerCase() !== 'error') return null;
  const texto = corrigirAcentos(String(p.message ?? p.mensagem ?? '').trim());
  return texto || 'o IXC recusou a chamada sem informar o motivo.';
}

/**
 * Traduz o erro do IXC para algo acionável. Os casos são os mesmos de
 * qualquer ERP — restrição de IP, credencial recusada, host errado — então
 * a tradução mora em ./erros, junto com a de onde arrumar cada um.
 */
function explainIxcError(e: unknown): string {
  return explicarErroDoErp('ixc', e);
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

    const payload = (await r.json()) as T;
    const recusa = motivoDaRecusa(payload);
    if (recusa) throw new Error(`IXC ${resource}: ${recusa}`);
    return payload;
  }

  async testConnection() {
    try {
      await this.req('cliente', { qtype: 'cliente.id', query: '0', oper: '=', page: '1', rp: '1' });
      return { ok: true };
    } catch (e: unknown) {
      return { ok: false, message: explainIxcError(e) };
    }
  }

  /**
   * Consulta cada recurso separadamente e conta o que ele respondeu.
   *
   * `testConnection` pergunta uma coisa só — o `cliente` responde? — e a tela
   * lia a resposta como se valesse para a integração inteira. No IXC a API roda
   * com as permissões do grupo do usuário do token, e cada tabela é liberada em
   * separado: cadastro liberado não diz nada sobre financeiro nem sobre RADIUS.
   * Daí o painel exibir "Conexão OK" enquanto a central do assinante fica sem
   * fatura e sem gráfico de consumo.
   *
   * Com o CPF de um assinante, repete as consultas exatamente como a central
   * faz para ele. É o que separa as duas causas que dão a mesma tela vazia:
   * tabela recusada por permissão, ou tabela liberada cujo filtro não acha nada
   * — no IXC a fatura de cobrança agrupada nasce presa ao cliente, com
   * `id_contrato` zerado, e procurá-la pelo contrato não devolve nada.
   */
  async diagnose(cpf?: string): Promise<ErpCheck[]> {
    const checks: ErpCheck[] = [];

    const sondar = async (
      endpoint: string,
      resource: string,
      feature: string,
      body: Record<string, unknown>,
      vazio?: string,
    ): Promise<any[] | null> => {
      try {
        const data = await this.req<IxcListResponse<any>>(endpoint, body);
        const registros = data.registros ?? [];
        checks.push({
          resource,
          feature,
          status: registros.length ? 'ok' : 'vazio',
          records: registros.length,
          detail: registros.length ? undefined : vazio,
        });
        return registros;
      } catch (e) {
        checks.push({ resource, feature, status: 'recusado', detail: explainIxcError(e) });
        return null;
      }
    };

    const amostra = { page: '1', rp: '1' };
    const semRegistro =
      'O IXC aceitou a consulta e não devolveu registro nenhum. A permissão está liberada — ' +
      'o que falta é dado nesta tabela.';

    // Etapa 1: a permissão de cada tabela, sem depender de assinante nenhum.
    await sondar('cliente', 'cliente', 'Login e cadastro do assinante',
      { qtype: 'cliente.id', query: '0', oper: '>', ...amostra }, semRegistro);
    await sondar('cliente_contrato', 'cliente_contrato', 'Contrato, plano e velocidade',
      { qtype: 'cliente_contrato.id', query: '0', oper: '>', ...amostra }, semRegistro);
    await sondar('fn_areceber', 'fn_areceber', 'Faturas, boleto e Pix',
      { qtype: 'fn_areceber.id', query: '0', oper: '>', ...amostra }, semRegistro);
    await sondar('radusuarios', 'radusuarios', 'Status da conexão: login, IP, tempo online',
      { qtype: 'radusuarios.id', query: '0', oper: '>', ...amostra }, semRegistro);

    if (!cpf) return checks;

    // Etapa 2: o caminho inteiro de um assinante real, na ordem em que a
    // central o percorre. Cada elo confirma o anterior — quando um recurso
    // liberado na etapa 1 volta vazio aqui, a causa é o vínculo, e a linha diz
    // qual em vez de deixar a suposição para quem lê.
    let cliente: any = null;
    try {
      for (const variant of documentVariants(cpf)) {
        const data = await this.req<IxcListResponse<any>>('cliente', {
          qtype: 'cliente.cnpj_cpf', query: variant, oper: '=', page: '1', rp: '1',
        });
        cliente = data.registros?.[0];
        if (cliente) break;
      }
      checks.push({
        resource: 'cliente.cnpj_cpf',
        feature: 'Achar este CPF no cadastro',
        status: cliente ? 'ok' : 'vazio',
        records: cliente ? 1 : 0,
        detail: cliente
          ? undefined
          : 'Nenhum cliente com este CPF — nem com pontuação, nem só com os dígitos. ' +
            'Confira se ele está cadastrado nesta instalação do IXC.',
      });
    } catch (e) {
      checks.push({
        resource: 'cliente.cnpj_cpf',
        feature: 'Achar este CPF no cadastro',
        status: 'recusado',
        detail: explainIxcError(e),
      });
    }
    if (!cliente) return checks;

    const contratos = await sondar(
      'cliente_contrato', 'cliente_contrato.id_cliente', 'Contratos deste assinante',
      { qtype: 'cliente_contrato.id_cliente', query: String(cliente.id), oper: '=', page: '1', rp: '50' },
      'O cliente existe e não tem contrato vinculado. Sem contrato a central não tem por onde ' +
        'procurar fatura nem consumo.',
    );
    const contrato = contratos?.[0];
    if (!contrato) return checks;

    const idContrato = String(contrato.id);

    await sondar(
      'fn_areceber', 'fn_areceber.id_contrato', 'Faturas deste contrato',
      { qtype: 'fn_areceber.id_contrato', query: idContrato, oper: '=', page: '1', rp: '5' },
      `Nenhuma fatura presa ao contrato ${idContrato} — é exatamente esta a consulta que a ` +
        'central faz para montar a tela de faturas.',
    );

    // A mesma pergunta pelo cliente. Se vier fatura aqui e não na linha acima,
    // o vínculo é a causa e está provado, não suposto.
    await sondar(
      'fn_areceber', 'fn_areceber.id_cliente', 'As mesmas faturas, procuradas pelo cliente',
      { qtype: 'fn_areceber.id_cliente', query: String(cliente.id), oper: '=', page: '1', rp: '5' },
      'Também não há fatura pelo cliente. Então não é vínculo: é cadastro sem cobrança lançada.',
    );

    const conexoes = await sondar(
      'radusuarios', 'radusuarios.id_contrato', 'Login de acesso, pelo contrato',
      { qtype: 'radusuarios.id_contrato', query: idContrato, oper: '=', page: '1', rp: '1' },
      'Nenhum login preso ao contrato. Parte das instalações amarra o login só ao cliente — ' +
        'a linha seguinte mostra se é este o caso.',
    );

    // O login é o que abre a consulta de consumo. Quando ele não está preso ao
    // contrato, a busca pelo cliente diz se o modelo da instalação é outro, em
    // vez de deixar o gráfico vazio sem explicação.
    let loginDoAssinante = pick(conexoes?.[0], ...CAMPOS_LOGIN) as string | undefined;
    if (!loginDoAssinante) {
      const porCliente = await sondar(
        'radusuarios', 'radusuarios.id_cliente', 'Login de acesso, pelo cliente',
        { qtype: 'radusuarios.id_cliente', query: String(cliente.id), oper: '=', page: '1', rp: '20' },
        'Este assinante não tem login de acesso em nenhum dos dois vínculos. Sem login não há ' +
          'sessão de RADIUS para somar — é o que acontece em acesso por IP fixo, sem PPPoE.',
      );
      const doContrato = (porCliente ?? []).find(
        (r: any) => String(r.id_contrato ?? '') === String(idContrato),
      );
      const escolhido = doContrato ?? (porCliente?.length === 1 ? porCliente[0] : null);
      loginDoAssinante = pick(escolhido, ...CAMPOS_LOGIN) as string | undefined;
      if (porCliente?.length && !loginDoAssinante) {
        checks.push({
          resource: 'radusuarios.id_cliente',
          feature: 'A qual contrato pertence cada login',
          status: 'vazio',
          detail:
            `O cliente tem ${porCliente.length} logins e nenhum declara o contrato ${idContrato}. ` +
            'Não dá para escolher sem risco de mostrar o consumo do contrato errado.',
        });
      }
    }
    if (!loginDoAssinante) return checks;

    // A contabilidade é a parte que mais muda entre versões do IXC: percorre as
    // combinações conhecidas e diz qual respondeu. Duas instalações do mesmo ERP
    // podem precisar de tabelas diferentes, e sem isto a diferença entre um
    // provedor com gráfico e outro sem era invisível.
    const { registros: sessoes, usado, tentativas } = await this.buscarContabilidade(
      String(loginDoAssinante),
      String(cliente.id),
    );
    checks.push({
      resource: usado ?? 'radacct / radpop_radaccounting',
      feature: 'Sessões do RADIUS que alimentam o gráfico',
      status: sessoes.length ? 'ok' : 'vazio',
      records: sessoes.length,
      detail: sessoes.length
        ? `Respondeu por "${usado}".` +
          (tentativas.length ? ` Antes disso: ${tentativas.join('; ')}.` : '')
        : 'Nenhuma tabela de contabilidade respondeu com sessão. Tentativas: ' +
          `${tentativas.join('; ')}.`,
    });

    // Consulta liberada e respondida ainda não é gráfico na tela. Sessão com
    // data que o nosso leitor não entende, contador zerado ou sessão velha
    // demais para a janela produzem exatamente a mesma área vazia de uma
    // tabela recusada — e sem separar isso, "o RADIUS respondeu 5 registros"
    // convive com "sem registro de consumo" sem explicar nada. Esta linha diz
    // o que veio e o que fizemos com aquilo.
    if (sessoes.length) {
      const s = sessoes[0];
      const inicioIso = toIsoDateTime(pick(s, ...CAMPOS_INICIO));
      const fimIso = toIsoDateTime(pick(s, ...CAMPOS_FIM));
      const down = Number(pick(s, ...CAMPOS_DOWNLOAD) ?? 0);
      const up = Number(pick(s, ...CAMPOS_UPLOAD) ?? 0);
      const janela = usageSlots('7d')[0]?.start ?? 0;
      const fimEpoch = fimIso
        ? new Date(fimIso).getTime()
        : inicioIso
          ? new Date(inicioIso).getTime() + Number(pick(s, ...CAMPOS_DURACAO) ?? 0) * 1000
          : NaN;

      const problemas: string[] = [];
      if (!inicioIso) problemas.push('não achamos a data de início entre os campos que conhecemos');
      if (!down && !up) problemas.push('não achamos os contadores de bytes entre os campos que conhecemos');
      if (inicioIso && Number.isFinite(fimEpoch) && fimEpoch < janela) {
        problemas.push('a sessão mais recente terminou antes dos últimos 7 dias');
      }

      checks.push({
        resource: `${usado} (leitura)`,
        feature: 'O que entendemos da sessão mais recente',
        status: problemas.length ? 'vazio' : 'ok',
        detail: problemas.length
          ? `A tabela respondeu, mas ${problemas.join('; ')}. Esta versão do IXC nomeia as ` +
            'colunas de outro jeito — os nomes que vieram de verdade são: ' +
            // Sem isto, "respondeu 5 registros" e "sem consumo" conviviam sem
            // explicação. Com os nomes na mão, o apoio à variante é uma linha
            // de código, não outra rodada de tentativa e erro.
            `${Object.keys(s).join(', ')}.`
          : `Sessão de ${inicioIso} ${fimIso ? `até ${fimIso}` : '(ainda aberta)'}, ` +
            `${(down / 1e9).toFixed(2)} GB baixados e ${(up / 1e9).toFixed(2)} GB enviados. ` +
            'Isto alimenta o gráfico normalmente.',
      });
    }

    return checks;
  }

  /**
   * Catálogo de planos.
   *
   * `plano_acesso` não existe no webservice do IXC: pedir esse recurso devolve
   * "Recurso plano_acesso não está disponível!", exatamente a mesma resposta de
   * um nome inventado. Como isso era lançado como erro, e o catálogo é a
   * primeira coisa que a sincronização busca, o provedor inteiro era pulado —
   * as faturas nunca chegavam, mesmo com o financeiro liberado.
   *
   * O que existe é `radgrupos`, o perfil de velocidade do RADIUS. Ele não é o
   * catálogo comercial: `download`/`upload` são o que o concentrador entrega,
   * sempre com margem sobre o que foi vendido — o grupo "MR_600_MEGA" sai como
   * 850M. O número que o assinante reconhece é o do nome, então ele vem
   * primeiro e o perfil só cobre o grupo que não diz a velocidade no nome.
   *
   * O catálogo comercial de verdade fica em `vd_contratos`, que costuma estar
   * fora das permissões do usuário da API. Enquanto não estiver liberado, esta
   * é a melhor aproximação que o webservice oferece.
   */
  async listPlans(): Promise<ErpPlan[]> {
    const data = await this.req<IxcListResponse<any>>('radgrupos', {
      qtype: 'radgrupos.id', query: '0', oper: '>',
      page: '1', rp: '500', sortname: 'radgrupos.id', sortorder: 'asc',
    });
    return (data.registros ?? []).map((g) => {
      const name = nomeDoGrupo(g.grupo);
      const doNome = velocidadeAnunciada(name);
      return {
        externalId: String(g.id),
        name,
        downMbps: doNome?.down ?? parseRadiusSpeed(g.download),
        upMbps: doNome?.up ?? parseRadiusSpeed(g.upload),
        priceCents: Math.round(Number(g.valor_produto ?? 0) * 100),
      };
    });
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

  /** O cliente dono de um contrato, para as consultas indexadas por cliente. */
  private async idClienteDoContrato(contractExternalId: string): Promise<string | undefined> {
    const data = await this.req<IxcListResponse<any>>('cliente_contrato', {
      qtype: 'cliente_contrato.id', query: contractExternalId, oper: '=', page: '1', rp: '1',
    });
    const c = data.registros?.[0];
    return c?.id_cliente ? String(c.id_cliente) : undefined;
  }

  /**
   * O registro de acesso do contrato no radusuarios.
   *
   * Nem toda instalação preenche `id_contrato` aqui — parte delas amarra o
   * login só ao cliente. Procurar apenas por contrato não achava nada nessas, e
   * como o login é o que abre a consulta de consumo, o gráfico caía junto com o
   * status da conexão sem que nada apontasse o motivo.
   *
   * Quando a busca por cliente traz mais de um login e nenhum declara este
   * contrato, devolve nada de propósito: atribuir a sessão de um contrato ao
   * outro mostraria consumo alheio ao assinante, o que é pior que não mostrar.
   */
  private async radusuarioDoContrato(
    contractExternalId: string,
  ): Promise<{ registro: any | null; idCliente?: string; ambiguo?: boolean }> {
    const porContrato = await this.req<IxcListResponse<any>>('radusuarios', {
      qtype: 'radusuarios.id_contrato', query: contractExternalId, oper: '=',
      page: '1', rp: '1',
    });
    const direto = porContrato.registros?.[0];
    if (direto) {
      return {
        registro: direto,
        idCliente: direto.id_cliente ? String(direto.id_cliente) : undefined,
      };
    }

    const idCliente = await this.idClienteDoContrato(contractExternalId);
    if (!idCliente) return { registro: null };

    const porCliente = await this.req<IxcListResponse<any>>('radusuarios', {
      qtype: 'radusuarios.id_cliente', query: idCliente, oper: '=',
      page: '1', rp: '20',
    });
    const lista = porCliente.registros ?? [];
    const doContrato = lista.find(
      (r: any) => String(r.id_contrato ?? '') === String(contractExternalId),
    );
    // Um login só e sem vínculo declarado: é dele mesmo. Vários, é ambíguo — e
    // a ambiguidade precisa ser dita, não virar apenas "não achei": quem só
    // ouve "não achei" cai no caminho por cliente, que soma todos os contratos
    // e mostraria ao assinante o consumo do ponto do vizinho de contrato.
    const escolhido = doContrato ?? (lista.length === 1 ? lista[0] : null);
    return {
      registro: escolhido ?? null,
      idCliente,
      ambiguo: !escolhido && lista.length > 1,
    };
  }

  /**
   * O cliente tem um contrato só?
   *
   * A contabilidade indexada por cliente devolve as sessões de todos os
   * contratos dele. Isso serve para quem tem um; para quem tem dois pontos,
   * somaria os dois no gráfico de cada um. Como esse caminho só é usado quando
   * o login não pôde ser determinado, não há como separar depois — a hora de
   * checar é antes.
   */
  private async temContratoUnico(idCliente: string): Promise<boolean> {
    const data = await this.req<IxcListResponse<any>>('cliente_contrato', {
      qtype: 'cliente_contrato.id_cliente', query: idCliente, oper: '=',
      page: '1', rp: '10',
    });
    return (data.registros ?? []).length === 1;
  }

  /** Conexão atual do assinante — vem do radusuarios, ligado ao contrato. */
  async getConnection(contractExternalId: string): Promise<ErpConnection | null> {
    const { registro: r } = await this.radusuarioDoContrato(contractExternalId);
    if (!r) return null;

    return {
      online: r.online === 'S',
      login: (pick(r, ...CAMPOS_LOGIN) as string | undefined) || undefined,
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
   * As sessões do RADIUS, venham da tabela que vierem.
   *
   * Percorre as combinações conhecidas de tabela e campo até uma responder com
   * registros. Recusa não interrompe a varredura: numa instalação em que o
   * usuário da API alcança `radpop_radaccounting` e não `radacct`, desistir na
   * primeira negativa apagaria o gráfico de um provedor que tem o dado ali do
   * lado. Devolve também qual combinação respondeu — é o que o diagnóstico
   * mostra, para que a diferença entre duas instalações do mesmo ERP pare de
   * ser adivinhação.
   */
  private async buscarContabilidade(
    login?: string,
    idCliente?: string,
  ): Promise<{ registros: any[]; usado?: string; tentativas: string[] }> {
    const tentativas: string[] = [];

    for (const { resource, field, por } of TENTATIVAS_DE_CONSUMO) {
      const valor = por === 'login' ? login : idCliente;
      if (!valor) continue;

      const filtros: Record<string, unknown> = {
        qtype: `${resource}.${field}`, query: valor, oper: '=',
        page: '1', rp: '400',
      };
      // Ordenar por uma coluna que a tabela não tem faz o IXC recusar a
      // consulta inteira. Só a combinação comprovada leva ordenação; nas
      // outras vale mais a resposta sem ordem do que erro nenhum.
      if (resource === 'radacct' && field === 'username') {
        filtros.sortname = 'radacct.acctstarttime';
        filtros.sortorder = 'desc';
      }

      try {
        const data = await this.req<IxcListResponse<any>>(resource, filtros);
        const registros = data.registros ?? [];
        if (registros.length) {
          return { registros, usado: `${resource}.${field}`, tentativas };
        }
        tentativas.push(`${resource}.${field}: sem registros`);
      } catch (e) {
        tentativas.push(`${resource}.${field}: ${limparMensagem(e instanceof Error ? e.message : String(e), 90)}`);
      }
    }

    return { registros: [], tentativas };
  }

  /**
   * Consumo por período, a partir da contabilidade do RADIUS.
   *
   * O RADIUS conta por sessão, não por intervalo, e uma sessão PPPoE pode
   * durar semanas. Creditar o total no instante em que a sessão começou produz
   * um pico absurdo num ponto e zero nos outros — e sessão sem registro de
   * encerramento (queda do concentrador) jogaria tudo em cima de agora. Por
   * isso o consumo é distribuído proporcionalmente ao tempo que a sessão
   * passou em cada intervalo, e o fim da sessão vem de acctsessiontime quando
   * não há acctstoptime.
   *
   * É uma estimativa por intervalo sobre um total exato — a central diz isso
   * ao cliente em vez de fingir medição hora a hora.
   */
  async getUsage(
    contractExternalId: string,
    range: ErpUsageRange = '7d',
    login?: string,
  ): Promise<ErpUsagePoint[]> {
    // O login pode vir de fora para não repetir a consulta de conexão.
    //
    // Quando não vem, o consumo depende do radusuarios só para descobrir o
    // usuário — e a falha dele vinha como exceção daqui, como se o problema
    // fosse o consumo. Eram dois recursos distintos derrubados pelo mesmo
    // erro, e nenhuma das duas mensagens dizia qual estava bloqueado. Agora
    // a falta do login devolve "sem consumo" como qualquer período vazio;
    // quem nomeia o recurso recusado é o diagnóstico da integração.
    const slots = usageSlots(range);
    if (!slots.length) return [];

    let user = login;
    let idCliente: string | undefined;
    if (!user) {
      try {
        const achado = await this.radusuarioDoContrato(contractExternalId);
        // Vários logins e nenhum declara este contrato: sem gráfico. Preferir a
        // área vazia a atribuir a este assinante o consumo de outro ponto.
        if (achado.ambiguo) return [];
        user = (pick(achado.registro, ...CAMPOS_LOGIN) as string | undefined) || undefined;
        idCliente = achado.idCliente;
      } catch {
        // radusuarios recusado não encerra o assunto: parte das instalações
        // indexa a contabilidade pelo cliente, e esse caminho continua aberto.
      }
    }
    if (!idCliente) {
      idCliente = await this.idClienteDoContrato(contractExternalId).catch(() => undefined);
    }

    // O caminho por cliente só é seguro quando ele tem um contrato só — senão
    // soma o consumo dos dois pontos. Com o login em mãos a separação é feita
    // registro a registro mais abaixo, então a checagem extra fica de fora.
    const porCliente =
      idCliente && (user || (await this.temContratoUnico(idCliente).catch(() => false)))
        ? idCliente
        : undefined;
    if (!user && !porCliente) return [];

    const { registros } = await this.buscarContabilidade(user, porCliente);
    if (!registros.length) return [];

    const windowStart = slots[0]!.start;
    const now = Date.now();

    for (const s of registros) {
      // A busca por cliente traz as sessões de todos os logins dele. Sem este
      // corte, quem tem dois contratos veria a soma dos dois num gráfico só.
      if (user) {
        const dono = String(pick(s, ...CAMPOS_LOGIN) ?? '');
        if (dono && dono !== user) continue;
      }

      const startIso = toIsoDateTime(pick(s, ...CAMPOS_INICIO));
      if (!startIso) continue;
      const start = new Date(startIso);
      if (Number.isNaN(start.getTime())) continue;

      const stopIso = toIsoDateTime(pick(s, ...CAMPOS_FIM));
      const sessionSeconds = Number(pick(s, ...CAMPOS_DURACAO) ?? 0);
      const stop = stopIso
        ? new Date(stopIso)
        : new Date(Math.min(now, start.getTime() + sessionSeconds * 1000));

      const spanMs = Math.max(stop.getTime() - start.getTime(), 1);
      if (stop.getTime() < windowStart) continue;

      const down = Number(pick(s, ...CAMPOS_DOWNLOAD) ?? 0);
      const up = Number(pick(s, ...CAMPOS_UPLOAD) ?? 0);
      if (!down && !up) continue;

      // Fatia a sessão intervalo a intervalo e credita a parte proporcional.
      for (const slot of slots) {
        const overlap = Math.min(stop.getTime(), slot.end) - Math.max(start.getTime(), slot.start);
        if (overlap <= 0) continue;
        const share = overlap / spanMs;
        slot.point.downloadBytes += down * share;
        slot.point.uploadBytes += up * share;
      }
    }

    return slots.map((slot) => ({
      ...slot.point,
      downloadBytes: Math.round(slot.point.downloadBytes),
      uploadBytes: Math.round(slot.point.uploadBytes),
    }));
  }

  /**
   * Pix da fatura. O IXC gera na hora pelo endpoint get_pix — o campo
   * pix_copia_cola do fn_areceber vem vazio nas instalações que usam gateway,
   * então é aqui que o código realmente aparece.
   */
  async getInvoicePix(invoiceExternalId: string): Promise<ErpPix | null> {
    const data = await this.req<any>('get_pix', { id_areceber: invoiceExternalId });
    const dados = data?.pix?.dadosPix;
    const qr = data?.pix?.qrCode;
    const copyPaste: string | undefined = dados?.pixCopiaECola || qr?.qrcode;
    if (!copyPaste) return null;

    return {
      copyPaste,
      qrImageBase64: qr?.imagemQrcode || undefined,
      expiresAt: dados?.expiracaoPix || undefined,
      status: dados?.status || undefined,
    };
  }

  /** PDF do boleto, em base64. */
  async getInvoiceBoletoPdf(invoiceExternalId: string): Promise<string | null> {
    const url = `${this.baseUrl}/webservice/v1/get_boleto`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: this.auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boletos: invoiceExternalId,
        juro: 'N',
        multa: 'N',
        atualiza_boleto: 'N',
        tipo_boleto: 'arquivo',
        base64: 'S',
      }),
      cache: 'no-store',
    });
    if (!r.ok) return null;
    const body = (await r.text()).trim();
    // A resposta é o PDF já em base64, sem envelope JSON.
    return body && !body.startsWith('{') ? body : null;
  }

  async getInvoice(invoiceExternalId: string): Promise<ErpInvoice | null> {
    // O prefixo do qtype é o nome da tabela. Com "fn." o IXC responde sem
    // erro e sem `registros`, então esta consulta devolvia null para toda
    // fatura que existia — o mesmo tropeço já corrigido em
    // listInvoicesByContract, que tinha passado batido aqui.
    const data = await this.req<IxcListResponse<any>>('fn_areceber', {
      qtype: 'fn_areceber.id', query: invoiceExternalId, oper: '=', page: '1', rp: '1',
    });
    const f = data.registros?.[0];
    if (!f) return null;
    const due = toIsoDate(f.data_vencimento);
    return {
      externalId: String(f.id),
      contractExternalId: String(f.id_contrato),
      dueDate: due,
      amountCents: Math.round(Number(f.valor ?? 0) * 100),
      // Sem a data, "vencida" viraria "em aberto" — é a data que decide.
      status: this.mapInvoiceStatus(f.status, due),
      pixCopyPaste: f.pix_copia_cola || undefined,
      boletoLine: f.linha_digitavel || undefined,
      boletoPdfUrl: f.url_boleto || undefined,
    };
  }

  private mapContractStatus(s: string): ErpContract['status'] {
    // O IXC usa códigos de duas letras em `status_internet`, e este switch só
    // conhecia os de uma — o padrão de outros ERPs. Todo contrato bloqueado ou
    // em atraso caía no `default` e virava "pending", que a central mostra como
    // "Em ativação": assinante com a internet cortada por falta de pagamento
    // lia que o serviço estava sendo instalado. Pior, o cron só sincroniza
    // contrato ativo, então esses ficavam para sempre fora da fila de faturas.
    //
    // status_internet: A=Ativo, D=Desativado, CM=Bloqueio manual,
    // CA=Bloqueio automático, FA=Financeiro em atraso, AA=Aguardando assinatura.
    // status (do contrato): A=Ativo, I=Inativo, P=Pré-contrato, N=Negativado,
    // D=Desativado. B e S ficam por compatibilidade com o que já era gravado.
    switch (String(s ?? '').trim().toUpperCase()) {
      case 'A': return 'active';
      // Contrato de pé, acesso cortado — é o estado em que o assinante mais
      // precisa enxergar a fatura, então ele não pode sumir da sincronização.
      case 'CM': case 'CA': case 'FA': case 'N': case 'B': case 'S': return 'suspended';
      case 'D': case 'I': case 'C': return 'cancelled';
      // Contrato que ainda não entrou em operação.
      case 'AA': case 'P': return 'pending';
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
