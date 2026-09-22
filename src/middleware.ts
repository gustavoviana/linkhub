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

  // A central de demonstração: as mesmas telas do portal, com assinante,
  // faturas e consumo fictícios, servidas de `src/app/demo`.
  //
  // Ela tem endereço próprio — `demo.linkhub.api.br` — e é ali que a
  // demonstração é servida, em cima do endereço que o visitante abriu. Já foi
  // um redirecionamento para `/demo` no domínio raiz, e isso custava caro no
  // único lugar onde não dá para pagar: o provedor manda o link para o cliente
  // dele, o endereço troca de domínio no primeiro clique e o que era uma
  // demonstração da marca passa a parecer link errado.
  //
  // "demo" não é slug de provedor: está na lista de reservados do cadastro e
  // da função `create_tenant_with_owner`, então não há provedor de verdade
  // para atropelar aqui.
  //
  // Tudo isto acontece antes do Supabase, de propósito: a demonstração não
  // tem banco nem sessão, e não pode cair junto com eles.
  if (subdomain === 'demo') {
    const caminho = url.pathname;

    // As rotas de dados da demonstração (`/api/demo/*`) e os arquivos já
    // estão no endereço final — seguem sem reescrita.
    if (caminho.startsWith('/api') || caminho.startsWith('/_next') || caminho.includes('.')) {
      return NextResponse.next();
    }

    // Aqui o prefixo `/demo` é redundante: o subdomínio inteiro já é a
    // demonstração. Links montados no domínio raiz chegam com ele — mandamos
    // para o endereço limpo em vez de devolver 404.
    if (caminho === '/demo' || caminho.startsWith('/demo/')) {
      const limpo = url.clone();
      limpo.pathname = caminho.slice('/demo'.length) || '/';
      return NextResponse.redirect(limpo, { status: 308 });
    }

    // `/` é a tela de entrada; `/central`, `/central/fatura` e o resto são
    // as telas de dentro. A URL visível não muda.
    const interno = url.clone();
    interno.pathname = caminho === '/' ? '/demo' : `/demo${caminho}`;
    return NextResponse.rewrite(interno);
  }

  // Em dev, permite `?tenant=demo` ou cookie pra simular subdomínio. Em
  // produção não: quem manda é o subdomínio, senão daria para abrir a central
  // de qualquer provedor pelo domínio raiz só mudando a query string.
  const devTenant =
    process.env.NODE_ENV === 'production'
      ? null
      : (url.searchParams.get('tenant') ?? req.cookies.get('dev_tenant')?.value);
  const tenantSlug = subdomain ?? devTenant ?? null;

  // Refresh do session cookie do Supabase em toda requisição (necessário no
  // App Router pra que server components leiam auth atualizado).
  const response = NextResponse.next();

  // Em dev, grava o slug num cookie: assim as chamadas seguintes (o fetch do
  // gráfico de consumo, por exemplo) acham o provedor sem repetir o
  // `?tenant=` na URL. Fora de dev o subdomínio é a única fonte — aceitar
  // query string em produção seria trocar de provedor pela barra de endereço.
  const devParam = url.searchParams.get('tenant');
  if (devParam && process.env.NODE_ENV !== 'production') {
    response.cookies.set('dev_tenant', devParam, { path: '/', sameSite: 'lax' });
  }

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
    // A demonstração é rota do domínio raiz e não pertence a provedor nenhum.
    // Em desenvolvimento o `?tenant=` fica guardado num cookie, e sem esta
    // linha ele arrastava /demo para dentro de /portal na visita seguinte.
    pathname.startsWith('/demo') ||
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
