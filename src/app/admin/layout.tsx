import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser, getUserTenants } from '@/lib/auth/session';
import { Icon, type IconName } from '@/components/portal/icons';

// Barra lateral do painel — portada de docs/prototipo/src/admin-dash.jsx:
// marca, seletor de provedor, navegação em três blocos (configuração,
// operação, conta) e o rodapé com o usuário.

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login?next=/admin');

  const tenants = await getUserTenants();
  const current = tenants[0]?.tenant ?? null;

  return (
    <div className="min-h-screen bg-bg flex">
      <aside className="w-[232px] bg-bg-2 border-r border-border flex flex-col shrink-0">
        <div className="px-4 py-[18px] border-b border-border flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] rounded-[9px] bg-brand text-brand-fg flex items-center justify-center font-extrabold text-sm">
            L
          </div>
          <span className="text-[14.5px] font-semibold tracking-[-0.01em]">LinkHub Admin</span>
        </div>

        {current && (
          <div className="px-3 pt-3 pb-2">
            <Link
              href="/admin"
              className="px-[11px] py-[9px] rounded-[9px] bg-bg-3 border border-border flex items-center gap-2.5 hover:border-fg-3 transition-colors"
            >
              <div
                className="w-6 h-6 rounded-[7px] text-white flex items-center justify-center text-[11px] font-extrabold shrink-0 overflow-hidden"
                style={{ background: current.primary_color }}
              >
                {current.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  current.name[0]
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold truncate">{current.name}</div>
                <div className="text-[10.5px] text-fg-3">
                  {current.status}
                  {tenants.length > 1 && ` · ${tenants.length} provedores`}
                </div>
              </div>
              <Icon name="chevron" size={13} style={{ transform: 'rotate(90deg)' }} />
            </Link>
          </div>
        )}

        <nav className="px-3 flex-1 overflow-y-auto flex flex-col gap-0.5">
          <NavItem href="/admin" icon="home">Visão geral</NavItem>
          <NavItem href="/admin/tenants/new" icon="building">Meus provedores</NavItem>

          {current && (
            <>
              <NavGroup>Configuração</NavGroup>
              <NavItem href={`/admin/tenants/${current.id}/erp`} icon="router">Integração ERP</NavItem>
              <NavItem href={`/admin/tenants/${current.id}/branding`} icon="flash">Marca &amp; visual</NavItem>
              <NavItem href={`/admin/tenants/${current.id}/dominio`} icon="globe">Domínio</NavItem>

              <NavGroup>Operação</NavGroup>
              <NavItem href={`/admin/tenants/${current.id}/customers`} icon="user">Clientes</NavItem>
              <NavItem href={`/admin/tenants/${current.id}/plans`} icon="file">Planos</NavItem>

              <NavGroup>Conta</NavGroup>
              <NavItem href={`/admin/tenants/${current.id}/team`} icon="shield">Equipe &amp; acessos</NavItem>
            </>
          )}
        </nav>

        <div className="px-4 py-3 border-t border-border flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-brand/15 text-brand flex items-center justify-center text-[11px] font-bold shrink-0">
            {user.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-fg-2 truncate">{user.email}</div>
          </div>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              title="Sair"
              className="text-fg-3 hover:text-danger p-1 flex transition-colors"
            >
              <Icon name="logout" size={15} />
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  );
}

function NavGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] font-bold tracking-[0.08em] uppercase text-fg-3 px-[11px] pt-3.5 pb-1">
      {children}
    </div>
  );
}

function NavItem({ href, icon, children }: { href: string; icon: IconName; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-[11px] py-2 rounded-lg text-[13.5px] font-medium text-fg-2 hover:bg-bg-3 hover:text-fg transition-colors"
    >
      <Icon name={icon} size={16} />
      <span className="flex-1">{children}</span>
    </Link>
  );
}
