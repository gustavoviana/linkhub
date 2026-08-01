import Link from 'next/link';
import { requirePlatformAdmin } from '@/lib/auth/platform';
import { Icon, type IconName } from '@/components/portal/icons';

// Painel da plataforma. Escuro de propósito: quem administra provedor e quem
// administra a plataforma abrem as duas telas no mesmo navegador, e trocar de
// contexto sem perceber é como se apaga o provedor errado.

export const dynamic = 'force-dynamic';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-bg flex">
      <aside className="w-[232px] bg-[#12141c] text-white/90 flex flex-col shrink-0">
        <div className="px-4 py-[18px] border-b border-white/10 flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] rounded-[9px] bg-white text-[#12141c] flex items-center justify-center font-extrabold text-sm">
            L
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold tracking-[-0.01em] leading-tight">LinkHub</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-white/45">Plataforma</div>
          </div>
        </div>

        <nav className="px-3 pt-3 flex-1 overflow-y-auto flex flex-col gap-0.5">
          <NavItem href="/plataforma" icon="home">Visão geral</NavItem>
          <NavItem href="/plataforma/provedores" icon="building">Provedores</NavItem>
          <NavItem href="/plataforma/faturamento" icon="card">Faturamento</NavItem>

          <div className="mt-auto pt-4">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-[11px] py-2 rounded-lg text-[12.5px] text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Icon name="arrow-right" size={15} />
              <span>Ir para o painel do provedor</span>
            </Link>
          </div>
        </nav>

        <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
            {session.email[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-white/70 truncate">{session.email}</div>
            <div className="text-[10px] text-white/40">super administrador</div>
          </div>
          <form action="/auth/logout" method="post">
            <button type="submit" title="Sair" className="text-white/40 hover:text-danger p-1 flex transition-colors">
              <Icon name="logout" size={15} />
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  );
}

function NavItem({ href, icon, children }: { href: string; icon: IconName; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-[11px] py-2 rounded-lg text-[13.5px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
    >
      <Icon name={icon} size={16} />
      <span className="flex-1">{children}</span>
    </Link>
  );
}
