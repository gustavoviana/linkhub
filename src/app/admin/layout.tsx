import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUser, getUserTenants } from '@/lib/auth/session';
import { getPlatformSession } from '@/lib/auth/platform';
import { Icon } from '@/components/portal/icons';
import { LogoMark } from '@/components/site/chrome';
import { NavGroup, NavItem } from '@/components/admin/nav';
import { ThemeToggle } from '@/components/admin/theme-toggle';
import { ADMIN_THEME_COOKIE, adminThemeCss, resolveAdminTheme } from '@/lib/admin/theme';

// Barra lateral do painel: marca, seletor de provedor, navegação em três
// blocos (configuração, operação, conta) e o rodapé com o usuário.
//
// Este painel é do cliente e cuida de UM provedor. Gestão de provedores,
// cobrança e senha de terceiros moram em /plataforma, e o atalho para lá só
// aparece para quem é super administrador.

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login?next=/admin');

  const [tenants, platform, store] = await Promise.all([
    getUserTenants(),
    getPlatformSession(),
    cookies(),
  ]);
  const current = tenants[0]?.tenant ?? null;
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

        {current && (
          <div className="px-3 pt-3">
            <Link
              href="/admin"
              className="px-3 py-2.5 rounded-[11px] bg-bg-3 border border-border flex items-center gap-2.5 hover:border-border-strong transition-colors"
            >
              <span
                className="w-7 h-7 rounded-[8px] text-white flex items-center justify-center text-[11px] font-extrabold shrink-0 overflow-hidden"
                style={{ background: current.primary_color }}
              >
                {current.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  current.name[0]
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[12.5px] font-bold truncate leading-tight">
                  {current.name}
                </span>
                <span className="flex items-center gap-1.5 mt-1">
                  <span
                    className={[
                      'w-1.5 h-1.5 rounded-full',
                      current.status === 'active' ? 'bg-success' : 'bg-warning',
                    ].join(' ')}
                  />
                  <span className="text-[10.5px] text-fg-3">
                    {current.status}
                    {tenants.length > 1 && ` · ${tenants.length} provedores`}
                  </span>
                </span>
              </span>
              <Icon name="chevron" size={13} className="text-fg-3" style={{ transform: 'rotate(90deg)' }} />
            </Link>
          </div>
        )}

        <nav className="px-3 flex-1 overflow-y-auto flex flex-col gap-0.5 pb-4 scrollbar-hide">
          <div className="pt-3" />
          <NavItem href="/admin" icon="home" exact>
            Visão geral
          </NavItem>

          {current && (
            <>
              <NavGroup>Configuração</NavGroup>
              <NavItem href={`/admin/tenants/${current.id}/erp`} icon="router">Integração ERP</NavItem>
              <NavItem href={`/admin/tenants/${current.id}/branding`} icon="flash">Marca &amp; visual</NavItem>
              <NavItem href={`/admin/tenants/${current.id}/aplicativo`} icon="phone">Aplicativo</NavItem>
              <NavItem href={`/admin/tenants/${current.id}/dominio`} icon="globe">Domínio</NavItem>

              <NavGroup>Operação</NavGroup>
              <NavItem href={`/admin/tenants/${current.id}/customers`} icon="user">Clientes</NavItem>
              <NavItem href={`/admin/tenants/${current.id}/plans`} icon="file">Planos</NavItem>

              <NavGroup>Conta</NavGroup>
              <NavItem href={`/admin/tenants/${current.id}/team`} icon="shield">Equipe &amp; acessos</NavItem>
              <NavItem href={`/admin/tenants/${current.id}/configuracoes`} icon="settings">Configurações</NavItem>
            </>
          )}

          {platform && (
            <div className="mt-auto pt-6">
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
