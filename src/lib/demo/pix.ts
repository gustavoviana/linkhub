// Pix copia-e-cola da demonstração.
//
// O payload é montado no formato EMV de verdade, com o CRC certo, para que o
// app do banco do visitante ABRA o código em vez de dizer "QR inválido" — a
// tela de pagamento é justamente o que ele veio ver funcionando.
//
// A chave é fictícia e não existe em banco nenhum: quem chegar até o fim da
// leitura recebe do próprio banco um "chave não encontrada". É o desfecho
// honesto para uma demonstração — nada aqui pode mover dinheiro de ninguém.

const CHAVE_DEMO = 'demo@seuprovedor.com.br';

function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, '0')}${valor}`;
}

/** CRC16/CCITT-FALSE — o algoritmo que o Banco Central especifica no Pix. */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Deixa só o que o EMV aceita em nome e cidade do recebedor, e corta no
 * limite do campo. A decomposição separa o acento da letra; o filtro
 * seguinte, que só deixa passar letra, número e espaço, leva o acento embora
 * e preserva o "a" de "ç" — descartar o caractere inteiro viraria "CAIAS".
 */
function ascii(texto: string, limite: number): string {
  return texto
    .normalize('NFD')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .toUpperCase()
    .slice(0, limite)
    .trim();
}

export function demoPixPayload(amountCents: number, txid: string): string {
  const valor = (amountCents / 100).toFixed(2);

  const semCrc =
    campo('00', '01') +
    campo('26', campo('00', 'br.gov.bcb.pix') + campo('01', CHAVE_DEMO)) +
    campo('52', '0000') +
    campo('53', '986') +
    campo('54', valor) +
    campo('58', 'BR') +
    campo('59', ascii('DEMONSTRACAO SUA LOGO', 25)) +
    campo('60', ascii('CAXIAS DO SUL', 15)) +
    campo('62', campo('05', ascii(txid, 25))) +
    '6304';

  return semCrc + crc16(semCrc);
}

/**
 * Linha digitável do boleto de exemplo.
 *
 * O bloco final carrega fator de vencimento e valor em centavos, como num
 * boleto de verdade — assim o número que o visitante lê na tela conversa com
 * a fatura ao lado. Os dígitos verificadores não são calculados: o código não
 * é cobrança de ninguém e não deve poder ser pago em lugar nenhum.
 */
export function demoLinhaDigitavel(amountCents: number, dueDate: string): string {
  const valor = String(amountCents).padStart(10, '0');
  const fator = String(fatorVencimento(dueDate)).padStart(4, '0');
  return `34191.79001 01043.510047 91020.150008 1 ${fator}${valor}`;
}

/** Dias desde 07/10/1997, como manda a FEBRABAN. */
function fatorVencimento(dueDate: string): number {
  const [y, m, d] = dueDate.split('-').map(Number);
  const venc = Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1);
  const base = Date.UTC(1997, 9, 7);
  return Math.max(0, Math.round((venc - base) / 86_400_000));
}
