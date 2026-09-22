import Link from 'next/link';
import { requirePlatformAdmin } from '@/lib/auth/platform';
import { Icon } from '@/components/portal/icons';
import { LogoMark } from '@/components/site/chrome';
import { NavItem } from '@/components/admin/nav';

// Painel da plataforma.
//
// Ele e o painel do provedor ficam abertos no mesmo navegador, e trocar de
// contexto sem perceber é como se apaga o provedor errado. Antes o sinal era o
// fundo escuro, quando o resto do sistema era claro; agora que tudo é escuro,
// o sinal passou a ser a cor: aqui o contexto é âmbar, lá é o azul da marca.
// A faixa no topo da barra existe pelo mesmo motivo — ela não some com o
// scroll e não depende de o operador reparar num detalhe.

export const dynamic = 'force-dynamic';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-bg flex">
      <aside className="w-[248px] bg-bg-2 border-r border-border flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="h-1 bg-warning shrink-0" aria-hidden />

        <div className="px-4 h-[59px] flex items-center gap-2.5 border-b border-border">
          <LogoMark size={28} />
          <span className="text-[14px] font-extrabold tracking-[-0.02em]">LinkHub</span>
          <span className="text-[9.5px] font-bold tracking-[0.12em] uppercase text-warning border border-warning/35 bg-warning/10 rounded px-1.5 py-0.5 ml-auto">
            Plataforma
          </span>
        </div>

        <nav className="px-3 pt-3 flex-1 overflow-y-auto flex flex-col gap-0.5 scrollbar-hide">
          <NavItem href="/plataforma" icon="home" tom="warning" exact>
            Visão geral
          </NavItem>
          <NavItem href="/plataforma/provedores" icon="building" tom="warning">
            Provedores
          </NavItem>
          <NavItem href="/plataforma/faturamento" icon="card" tom="warning">
            Faturamento
          </NavItem>
          <NavItem href="/plataforma/conta" icon="shield" tom="warning">
            Minha conta
          </NavItem>

          <div className="mt-auto pt-6">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-3 h-9 rounded-[9px] text-[12.5px] font-semibold text-fg-2 border border-dashed border-border-strong hover:border-brand hover:text-brand transition-colors"
            >
              <Icon name="arrow-right" size={15} />
              <span className="flex-1">Painel do provedor</span>
            </Link>
          </div>
        </nav>

        <div className="px-3 py-3 border-t border-border flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-warning/12 text-warning flex items-center justify-center text-[11px] font-extrabold shrink-0">
            {session.email[0]?.toUpperCase() ?? '?'}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[11.5px] text-fg-2 truncate">{session.email}</span>
            <span className="block text-[10px] text-warning font-semibold">super administrador</span>
          </span>
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
