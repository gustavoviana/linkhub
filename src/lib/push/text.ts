// Textos das notificações: campos, regras de fábrica e o relógio de Brasília.
//
// Sem 'server-only': o painel usa as mesmas funções para a prévia, e a prévia
// precisa mostrar exatamente o que vai chegar no celular.

export const TITULO_MAX = 50;
export const TEXTO_MAX = 150;
export const HORA_MIN = 8;
export const HORA_MAX = 20;
export const REGRAS_MAX = 10;

/** Campos que o provedor pode usar no texto. Mensagem manual só aceita {nome}. */
export const CAMPOS = [
  { chave: '{nome}', rotulo: 'Nome', exemplo: 'Maria' },
  { chave: '{valor}', rotulo: 'Valor', exemplo: 'R$ 99,90' },
  { chave: '{vencimento}', rotulo: 'Vencimento', exemplo: '10/10' },
] as const;

export interface DadosDoTexto {
  nome?: string | null;
  valorCents?: number | null;
  vencimento?: string | null; // yyyy-mm-dd
}

/** "MARIA DA SILVA" → "Maria". Cadastro de ERP costuma vir todo em maiúsculas. */
export function primeiroNome(nome: string | null | undefined): string {
  const primeiro = (nome ?? '').trim().split(/\s+/)[0] ?? '';
  if (!primeiro) return '';
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR');
}

function reais(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function diaMes(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/**
 * Troca os campos pelos dados. Campo sem dado some sem deixar buraco:
 * "Olá, {nome}!" sem nome vira "Olá!", não "Olá, !".
 */
export function preencher(texto: string, dados: DadosDoTexto): string {
  const nome = primeiroNome(dados.nome);
  return texto
    .replace(/,?\s*\{nome\}/g, (m) => (nome ? m.replace('{nome}', nome) : ''))
    .replace(/\{valor\}/g, dados.valorCents != null ? reais(dados.valorCents) : 'sua fatura')
    .replace(/\{vencimento\}/g, dados.vencimento ? diaMes(dados.vencimento) : '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Dados de mentira para a prévia do painel. */
export const DADOS_DE_EXEMPLO: DadosDoTexto = { nome: 'Maria', valorCents: 9990, vencimento: '2026-10-10' };

/** "3 dias antes", "no dia", "1 dia depois". */
export function descreverQuando(dias: number): string {
  if (dias === 0) return 'No dia do vencimento';
  const n = Math.abs(dias);
  return `${n} ${n === 1 ? 'dia' : 'dias'} ${dias < 0 ? 'antes' : 'depois'} do vencimento`;
}

export interface RegraBase {
  days_offset: number;
  send_hour: number;
  title: string;
  body: string;
  enabled: boolean;
}

/** As três regras com que todo provedor começa — desligadas, para revisar antes. */
export const REGRAS_DE_FABRICA: RegraBase[] = [
  {
    days_offset: -3,
    send_hour: 9,
    title: 'Sua fatura vence em 3 dias',
    body: 'Olá, {nome}! Sua fatura de {valor} vence em {vencimento}. Toque para pagar com Pix ou boleto.',
    enabled: false,
  },
  {
    days_offset: 0,
    send_hour: 9,
    title: 'Sua fatura vence hoje',
    body: 'Olá, {nome}! Sua fatura vence hoje. Toque para pegar o código Pix ou o boleto.',
    enabled: false,
  },
  {
    days_offset: 2,
    send_hour: 10,
    title: 'Sua fatura está em aberto',
    body: 'Olá, {nome}! A fatura de {valor} venceu em {vencimento}. Pague agora e evite a suspensão.',
    enabled: false,
  },
];

/**
 * Data e hora em Brasília. O servidor roda em UTC, e "9h" para o provedor é
 * 9h no relógio do assinante. Brasília está sem horário de verão desde 2019.
 */
export function agoraEmBrasilia(agora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(agora);
  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? '';
  return { data: `${p('year')}-${p('month')}-${p('day')}`, hora: Number(p('hour')) };
}

/** Soma dias a uma data yyyy-mm-dd, sem fuso no meio do caminho. */
export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Para onde o toque de uma mensagem manual pode levar. */
export const DESTINOS = [
  { url: '/', rotulo: 'Início' },
  { url: '/fatura', rotulo: 'Faturas' },
  { url: '/suporte', rotulo: 'Suporte' },
] as const;

/** Cookie com o id da inscrição deste aparelho — o logout usa para tirá-lo da lista. */
export const PUSH_COOKIE = 'push_sub';
