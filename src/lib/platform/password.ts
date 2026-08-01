import 'server-only';
import { randomInt } from 'node:crypto';

// Senha gerada para o provedor.
//
// Alfabeto sem os caracteres que a pessoa erra ao copiar do WhatsApp ou ao
// ditar por telefone: 0/O, 1/l/I, 5/S, 2/Z. Sobram 50 símbolos, e três blocos
// de quatro dão ~67 bits — bem acima do que qualquer ataque online alcança, e
// ainda assim legível em voz alta.
//
// `randomInt` do node:crypto, não Math.random: senha de acesso a painel que
// controla todos os provedores não sai de gerador previsível.

const ALFABETO = 'abcdefghjkmnpqrtuvwxyzACDEFGHJKLMNPQRTUVWXY3467689';

function bloco(tamanho: number) {
  let out = '';
  for (let i = 0; i < tamanho; i++) out += ALFABETO[randomInt(ALFABETO.length)];
  return out;
}

/** Ex: `kR7m-Qp3t-Wz9y`. */
export function gerarSenha(): string {
  return [bloco(4), bloco(4), bloco(4)].join('-');
}
