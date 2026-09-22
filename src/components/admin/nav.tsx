'use client';

// Itens da barra lateral do painel.
//
// Cliente por um motivo só: saber qual página está aberta. Antes nenhum item
// acendia, e em um painel de oito telas o operador perdia a referência de onde
// estava — a barra virava uma lista de links, não uma navegação.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/portal/icons';

export function NavGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-fg-3 px-3 pt-5 pb-1.5">
      {children}
    </div>
  );
}

export function NavItem({
  href,
  icon,
  children,
  exact = false,
  tom = 'brand',
}: {
  href: string;
  icon: IconName;
  children: React.ReactNode;
  /** Só acende no caminho exato. Usado na visão geral, que é prefixo de todo o resto. */
  exact?: boolean;
  /**
   * A cor do contexto. O painel do provedor usa o acento da marca; o da
   * plataforma usa âmbar — os dois ficam abertos no mesmo navegador, e trocar
   * de contexto sem perceber é como se apaga o provedor errado.
   */
  tom?: 'brand' | 'warning';
}) {
  const pathname = usePathname();
  const ativo = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const cores =
    tom === 'warning'
      ? { fundo: 'bg-warning/10', barra: 'bg-warning', icone: 'text-warning' }
      : { fundo: 'bg-brand/10', barra: 'bg-brand', icone: 'text-brand' };

  return (
    <Link
      href={href}
      aria-current={ativo ? 'page' : undefined}
      className={[
        'group relative flex items-center gap-2.5 px-3 h-9 rounded-[9px] text-[13px] font-medium transition-colors duration-150',
        ativo ? `${cores.fundo} text-fg` : 'text-fg-2 hover:bg-bg-3 hover:text-fg',
      ].join(' ')}
    >
      {/* Traço à esquerda: a cor de fundo sozinha some para quem enxerga pouco
          contraste, e o estado ativo é a informação mais consultada da barra. */}
      <span
        aria-hidden
        className={[
          'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-200',
          cores.barra,
          ativo ? 'h-5 opacity-100' : 'h-0 opacity-0',
        ].join(' ')}
      />
      <Icon name={icon} size={16} className={ativo ? cores.icone : 'text-fg-3 group-hover:text-fg-2'} />
      <span className="flex-1 truncate">{children}</span>
    </Link>
  );
}
