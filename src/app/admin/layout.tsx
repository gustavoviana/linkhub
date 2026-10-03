import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUser, getUserTenants } from '@/lib/auth/session';
import { getPlatformSession } from '@/lib/auth/platform';
import { Icon } from '@/components/portal/icons';
import { LogoMark } from '@/components/site/chrome';
import { TenantNav, type NavTenant } from '@/components/admin/tenant-nav';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Tenant } from '@/lib/supabase/types';
import { ThemeToggle } from '@/components/admin/theme-toggle';
import { ADMIN_THEME_COOKIE, adminThemeCss, resolveAdminTheme } from '@/lib/admin/theme';

// Barra lateral do painel: marca, seletor de provedor, navegação em três
// blocos (configuração, operação, conta) e o rodapé com o usuário.
//
// Este painel é do cliente e cuida de UM provedor. Gestão de provedores,
// cobrança e senha de terceiros moram em /plataforma, e o atalho para lá só
// aparece para quem é super administrador. Ele também entra no painel de
// qualquer provedor (a porta é `resolveTenantAccess`), e por isso a barra
// recebe a lista inteira: o provedor exibido é o do endereço.

function navTenant(t: Pick<Tenant, 'id' | 'name' | 'status' | 'primary_color' | 'logo_url'>): NavTenant {
  return { id: t.id, name: t.name, status: t.status, primary_color: t.primary_color, logo_url: t.logo_url };
}

async function outrosProvedores(proprios: Set<string>): Promise<NavTenant[]> {
  const { data } = await createAdminClient()
    .from('tenants')
    .select('id, name, status, primary_color, logo_url');
  return ((data ?? []) as Tenant[]).filter((t) => !proprios.has(t.id)).map(navTenant);
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login?next=/admin');

  const [tenants, platform, store] = await Promise.all([
    getUserTenants(),
    getPlatformSession(),
    cookies(),
  ]);
  const proprios = tenants.map(({ tenant }) => navTenant(tenant));
  const outros = platform ? await outrosProvedores(new Set(proprios.map((t) => t.id))) : [];
  const tema = resolveAdminTheme(store.get(ADMIN_THEME_COOKIE)?.value);
  const temaCss = adminThemeCss(tema);

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Em :root e não numa div: o body também lê estas variáveis, então o
          fundo cobre a tela inteira, inclusive no overscroll. */}
      {temaCss && <style dangerouslySetInnerHTML={{ __html: temaCss }} />}
      <aside className="w-[248px] bg-bg-2 border-r border-border flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="px-4 h-[60px] flex items-center gap-2.5 border-b border-border">
          <LogoMark size={28} />
          <span className="text-[14px] font-extrabold tracking-[-0.02em]">LinkHub</span>
          <span className="text-[9.5px] font-bold tracking-[0.12em] uppercase text-fg-3 border border-border rounded px-1.5 py-0.5 ml-auto">
            Painel
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto flex flex-col pb-4 scrollbar-hide">
          <TenantNav proprios={proprios} outros={outros} />

          {platform && (
            <div className="mt-auto pt-6 px-3">
              <Link
                href="/plataforma"
                className="flex items-center gap-2.5 px-3 h-9 rounded-[9px] text-[12.5px] font-semibold text-fg-2 border border-dashed border-border-strong hover:border-brand hover:text-brand transition-colors"
              >
                <Icon name="shield" size={15} />
                <span className="flex-1">Painel da plataforma</span>
              </Link>
            </div>
          )}
        </nav>

        <div className="px-3 py-3 border-t border-border flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-brand/12 text-brand flex items-center justify-center text-[11px] font-extrabold shrink-0">
            {user.email?.[0]?.toUpperCase() ?? '?'}
          </span>
          <span className="flex-1 min-w-0 text-[11.5px] text-fg-2 truncate">{user.email}</span>
          <ThemeToggle tema={tema} />
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              title="Sair da conta"
              aria-label="Sair da conta"
              className="text-fg-3 hover:text-danger p-1.5 flex rounded-lg hover:bg-bg-3 transition-colors"
            >
              <Icon name="logout" size={15} />
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
