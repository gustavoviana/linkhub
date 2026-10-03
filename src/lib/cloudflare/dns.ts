import 'server-only';

// DNS do domínio raiz (linkhub.api.br), que mora na Cloudflare.
//
// Existe para um registro só: o TXT `_vercel.linkhub.api.br` com que a Vercel
// confere a posse de cada subdomínio de provedor. Como os nameservers não são
// da Vercel, ela exige um TXT por subdomínio novo — e sem ele não emite
// certificado. Antes alguém publicava esse TXT à mão; quando esquecia, o
// provedor nascia com a central fora do ar (ERR_CONNECTION_CLOSED).
//
// Sem CLOUDFLARE_API_TOKEN nada quebra: a tela de Domínio continua mostrando
// o registro para publicar à mão. O token precisa de Zone → DNS → Edit no
// domínio raiz, e nada além disso.

const API = 'https://api.cloudflare.com/client/v4';

function config() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) return null;
  return { token, zoneId: process.env.CLOUDFLARE_ZONE_ID ?? null };
}

export function isCloudflareConfigured() {
  return config() !== null;
}

async function call(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    result?: unknown;
    errors?: { message?: string }[];
  };
  if (!res.ok || body.success === false) {
    throw new Error(body.errors?.[0]?.message ?? `Cloudflare respondeu ${res.status}`);
  }
  return body.result;
}

let zonaEmCache: string | null = null;

async function zoneId(token: string, configured: string | null, root: string) {
  if (configured) return configured;
  if (zonaEmCache) return zonaEmCache;
  const zonas = (await call(token, `/zones?name=${encodeURIComponent(root)}`)) as { id: string }[];
  if (!zonas[0]) throw new Error(`Zona ${root} não encontrada na Cloudflare.`);
  zonaEmCache = zonas[0].id;
  return zonaEmCache;
}

/** A Cloudflare guarda o TXT com ou sem aspas, conforme quem criou. */
const semAspas = (v: string) => v.replace(/^"|"$/g, '');

/**
 * Garante o TXT no domínio raiz. Idempotente: se o valor já existe, não cria
 * outro. Devolve true quando o registro está lá ao final.
 */
export async function ensureTxtRecord(name: string, value: string): Promise<boolean> {
  const cfg = config();
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'linkhub.api.br';
  // Só o domínio raiz do LinkHub. Domínio próprio de provedor mora no DNS
  // dele, e aqui não temos (nem devemos ter) acesso.
  if (!cfg || !(name === root || name.endsWith(`.${root}`))) return false;

  try {
    const zona = await zoneId(cfg.token, cfg.zoneId, root);
    const existentes = (await call(
      cfg.token,
      `/zones/${zona}/dns_records?type=TXT&name=${encodeURIComponent(name)}&per_page=100`,
    )) as { content: string }[];
    if (existentes.some((r) => semAspas(r.content) === value)) return true;

    await call(cfg.token, `/zones/${zona}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'TXT',
        name,
        content: `"${value}"`,
        ttl: 60,
        comment: 'Verificação da Vercel — criado pelo LinkHub',
      }),
    });
    return true;
  } catch (e) {
    console.error('[cloudflare] TXT não publicado', name, e instanceof Error ? e.message : e);
    return false;
  }
}
