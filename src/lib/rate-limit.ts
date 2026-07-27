import 'server-only';

// Limitador de tentativas em memória.
//
// Serve para o login do portal, onde o CPF é público e a senha é o único
// segredo: sem isso dá para varrer senhas de um assinante à vontade.
//
// Limitação conhecida: o contador vive no processo. Em serverless cada
// instância tem o seu, então o teto real é maior que o configurado. Já corta
// o ataque trivial; para valer de verdade em escala, trocar por Redis/Upstash
// mantendo esta mesma interface.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit = 8, windowMs = 5 * 60_000): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count++;
  if (bucket.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

/** Zera o contador — chamado quando a tentativa dá certo. */
export function rateLimitReset(key: string) {
  buckets.delete(key);
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return headers.get('x-real-ip') ?? 'desconhecido';
}
