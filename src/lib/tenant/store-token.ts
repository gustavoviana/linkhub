import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Passe de entrada para a rota de captura.
//
// Quem abre /store-shot é um Chrome sem janela rodando no servidor, sem
// cookie de sessão nenhum — então a rota não pode depender do login do
// painel. Em vez disso, a API assina um passe curto para aquele provedor e
// manda na URL. Sem o passe a rota devolve 404, e o passe morre em minutos.

const TTL_MS = 10 * 60_000;

function secret() {
  const value = process.env.STORE_SHOT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error('STORE_SHOT_SECRET ausente');
  return value;
}

function sign(tenantId: string, expiresAt: number) {
  return createHmac('sha256', secret()).update(`${tenantId}.${expiresAt}`).digest('base64url');
}

export function createStoreShotToken(tenantId: string): string {
  const expiresAt = Date.now() + TTL_MS;
  return `${expiresAt}.${sign(tenantId, expiresAt)}`;
}

export function verifyStoreShotToken(tenantId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const [rawExpiry, signature] = token.split('.');
  const expiresAt = Number(rawExpiry);
  if (!expiresAt || !signature || Date.now() > expiresAt) return false;

  const expected = Buffer.from(sign(tenantId, expiresAt));
  const got = Buffer.from(signature);
  return expected.length === got.length && timingSafeEqual(expected, got);
}
