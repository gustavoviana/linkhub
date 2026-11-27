import 'server-only';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Limite de tentativas compartilhado entre as instâncias da Vercel, numa
// janela deslizante guardada no Supabase (função rate_limit_hit, migração
// 015). O limitador em memória (rate-limit.ts) continua para rotas onde
// "melhor que nada" basta; para build, certificado e publicação vale este.
//
// Se o banco não responder, o pedido é recusado: nessas rotas, deixar
// passar sem contar é pior que pedir para tentar de novo.

export interface SharedRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  /** O banco não respondeu: o pedido foi recusado sem contar. */
  unavailable: boolean;
}

export async function sharedRateLimit(key: string, limit: number, windowMs: number): Promise<SharedRateLimitResult> {
  const { data, error } = await createAdminClient().rpc('rate_limit_hit' as never, {
    p_key: key,
    p_limit: limit,
    p_window_seconds: Math.max(1, Math.round(windowMs / 1000)),
  } as never);

  const row = (Array.isArray(data) ? data[0] : data) as
    | { allowed: boolean; remaining: number; retry_after_seconds: number }
    | null
    | undefined;

  if (error || !row) {
    console.error(`[rate-limit] ${key.split(':')[0]} indisponível: ${error?.code ?? 'sem resposta'}`);
    return { allowed: false, remaining: 0, retryAfterSeconds: 30, unavailable: true };
  }
  return {
    allowed: row.allowed,
    remaining: row.remaining,
    retryAfterSeconds: row.retry_after_seconds,
    unavailable: false,
  };
}

/** Resposta 429/503 pronta, ou null quando o pedido pode seguir. */
export async function rateLimitResponse(
  key: string,
  limit: number,
  windowMs: number,
  message: (retryAfterSeconds: number) => string,
): Promise<NextResponse | null> {
  const r = await sharedRateLimit(key, limit, windowMs);
  if (r.allowed) return null;
  if (r.unavailable) {
    return NextResponse.json(
      { error: 'Não deu para conferir o limite de tentativas agora. Tente de novo em instantes.' },
      { status: 503, headers: { 'Retry-After': String(r.retryAfterSeconds) } },
    );
  }
  return NextResponse.json(
    { error: message(r.retryAfterSeconds) },
    { status: 429, headers: { 'Retry-After': String(r.retryAfterSeconds) } },
  );
}
