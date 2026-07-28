import type { Tenant } from '@/lib/supabase/types';

// Fica fora do módulo 'use client' porque quem lê o cookie é o layout, no
// servidor — e um componente de servidor não pode chamar função de módulo
// cliente, só renderizá-lo.

export const PORTAL_THEME_COOKIE = 'portal_theme';

/** Tema inicial: o que o assinante escolheu, senão o padrão do provedor. */
export function resolveDark(
  cookieValue: string | undefined,
  tenant: Pick<Tenant, 'dark_mode_default'>,
): boolean {
  if (cookieValue === 'dark') return true;
  if (cookieValue === 'light') return false;
  return tenant.dark_mode_default;
}
