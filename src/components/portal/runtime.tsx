'use client';

// Onde a central está montada.
//
// As telas do portal são as mesmas em três contextos: no domínio do provedor
// (`/fatura`, `/suporte`), dentro da demonstração (`/demo/central/fatura`) e
// no mockup do painel, onde link nenhum navega. Em vez de duplicar as telas
// para cada um, o que muda vive aqui: o prefixo dos links, para onde vai o
// botão de sair, e se os dados são fictícios.
//
// Sem contexto vale o portal de verdade — é o caso da esmagadora maioria das
// montagens, e um provider esquecido não pode mudar o comportamento de quem
// está pagando.

import { createContext, useContext, useMemo } from 'react';
import { usePathname } from 'next/navigation';

export interface PortalRuntime {
  /** Prefixo das rotas internas. Vazio no portal do provedor. */
  base: string;
  /** Dados fictícios: as chamadas de rede vão para /api/demo. */
  demo: boolean;
  /** Destino do formulário "Sair da conta". */
  logoutAction: string;
}

const PADRAO: PortalRuntime = { base: '', demo: false, logoutAction: '/auth/logout' };

const RuntimeContext = createContext<PortalRuntime>(PADRAO);

export function PortalRuntimeProvider({
  value,
  children,
}: {
  value: Partial<PortalRuntime>;
  children: React.ReactNode;
}) {
  const runtime = useMemo(() => ({ ...PADRAO, ...value }), [value]);
  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
}

export function usePortalRuntime(): PortalRuntime {
  return useContext(RuntimeContext);
}

/** Um href interno já com o prefixo de onde a central está montada. */
export function portalHref(base: string, href: string): string {
  if (!base || !href.startsWith('/')) return href;
  return href === '/' ? base : `${base}${href}`;
}

/**
 * O caminho atual visto de dentro da central, sem o prefixo — é o que as abas
 * comparam para saber qual delas está acesa. Em `/demo/central/fatura` isto
 * devolve `/fatura`, e a aba Faturas acende sem que nenhuma tela precise
 * saber que existe uma demonstração.
 */
export function usePortalPath(): string {
  const { base } = usePortalRuntime();
  const pathname = usePathname();
  if (!base) return pathname;
  if (pathname === base) return '/';
  return pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname;
}
