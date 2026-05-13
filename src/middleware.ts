import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'linkhub.api.br';

// Hosts que NÃO são tenant — caem nas rotas root (landing / admin / api / auth).
const ROOT_HOSTS = new Set(['www', 'app', 'admin', 'api', 'auth']);

function extractSubdomain(host: string): string | null {
  const cleanHost = host.split(':')[0].toLowerCase();

  // Em dev (localhost / 127.0.0.1) usa `?tenant=slug` ou cabeçalho.
  if (cleanHost === 'localhost' || cleanHost.startsWith('127.0.0.1')) return null;

  // Vercel preview: <branch>-<project>.vercel.app — tratamos como root.
  if (cleanHost.endsWith('.vercel.app')) return null;

  if (!cleanHost.endsWith(`.${ROOT_DOMAIN}`) && cleanHost !== ROOT_DOMAIN) {
    // Domínio custom de tenant: resolveremos via DB no layout.
    return `__custom__:${cleanHost}`;
  }

  if (cleanHost === ROOT_DOMAIN) return null;
  const sub = cleanHost.slice(0, -1 * (ROOT_DOMAIN.length + 1));
  if (!sub || ROOT_HOSTS.has(sub)) return null;
  return sub;
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get('host') ?? '';
  const subdomain = extractSubdomain(host);

  // Em dev, permite `?tenant=demo` ou cookie pra simular subdomínio.
  const devTenant = url.searchParams.get('tenant') ?? req.cookies.get('dev_tenant')?.value;
  const tenantSlug = subdomain ?? devTenant ?? null;

  // Refresh do session cookie do Supabase em toda requisição (necessário no
  // App Router pra que server components leiam auth atualizado).
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          ),
      },
    },
  );
  await supabase.auth.getUser();

  // Sem subdomínio → rotas root (landing, admin, api, auth).
  if (!tenantSlug) return response;

  // Com subdomínio → reescreve para /portal/* mantendo a URL visível.
  const pathname = url.pathname;
  if (
    pathname.startsWith('/portal') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.includes('.')
  ) {
    response.headers.set('x-tenant-slug', tenantSlug);
    return response;
  }

  url.pathname = `/portal${pathname === '/' ? '' : pathname}`;
  const rewritten = NextResponse.rewrite(url, { headers: response.headers });
  rewritten.headers.set('x-tenant-slug', tenantSlug);
  // re-aplicar cookies do supabase
  response.cookies.getAll().forEach((c) => rewritten.cookies.set(c));
  return rewritten;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)'],
};
