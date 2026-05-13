import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser, getUserTenants } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login?next=/admin');

  const tenants = await getUserTenants();

  return (
    <div className="min-h-screen bg-bg flex">
      <aside className="w-64 bg-bg-2 border-r border-border flex flex-col">
        <div className="p-5 border-b border-border flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-brand text-brand-fg flex items-center justify-center font-bold text-xs">L</div>
          <span className="font-semibold text-sm">LinkHub Admin</span>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          <NavLink href="/admin">Visão geral</NavLink>
          <NavLink href="/admin/tenants">Meus provedores</NavLink>
          {tenants.length === 1 && (
            <>
              <div className="px-3 mt-4 mb-1 text-[10px] uppercase tracking-wider font-semibold text-fg-3">
                {tenants[0].tenant.name}
              </div>
              <NavLink href={`/admin/tenants/${tenants[0].tenant.id}`}>Configurações</NavLink>
              <NavLink href={`/admin/tenants/${tenants[0].tenant.id}/branding`}>Marca & visual</NavLink>
              <NavLink href={`/admin/tenants/${tenants[0].tenant.id}/erp`}>Integração ERP</NavLink>
              <NavLink href={`/admin/tenants/${tenants[0].tenant.id}/customers`}>Clientes</NavLink>
              <NavLink href={`/admin/tenants/${tenants[0].tenant.id}/plans`}>Planos</NavLink>
            </>
          )}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="text-xs text-fg-2 px-2 mb-2 truncate">{user.email}</div>
          <form action="/auth/logout" method="post">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              Sair
            </Button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-3 py-1.5 rounded text-sm text-fg-2 hover:bg-bg-3 hover:text-fg transition-colors"
    >
      {children}
    </Link>
  );
}
