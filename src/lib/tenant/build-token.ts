import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Passe do build: é com ele que o GitHub Actions conversa com a API.
//
// O runner não tem sessão do painel, e não dá pra mandar a service key pra
// dentro de um workflow. Então cada build ganha um passe assinado, válido
// por poucas horas e amarrado àquele build — vazou, dá acesso a um artefato
// só, e por pouco tempo.

const TTL_MS = 3 * 60 * 60_000;

function secret() {
  const value = process.env.STORE_SHOT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error('Sem segredo para assinar o passe do build.');
  return value;
}

function sign(buildId: string, expiresAt: number) {
  return createHmac('sha256', secret()).update(`build.${buildId}.${expiresAt}`).digest('base64url');
}

export function createBuildToken(buildId: string): string {
  const expiresAt = Date.now() + TTL_MS;
  return `${expiresAt}.${sign(buildId, expiresAt)}`;
}

export function verifyBuildToken(buildId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const [rawExpiry, signature] = token.split('.');
  const expiresAt = Number(rawExpiry);
  if (!expiresAt || !signature || Date.now() > expiresAt) return false;
  const expected = Buffer.from(sign(buildId, expiresAt));
  const got = Buffer.from(signature);
  return expected.length === got.length && timingSafeEqual(expected, got);
}
