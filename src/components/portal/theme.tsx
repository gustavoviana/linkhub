'use client';

// Modo escuro da central.
//
// A escolha do assinante vive num cookie, não em localStorage: a central é
// renderizada no servidor, e sem o cookie a primeira pintura sairia no tema
// errado e piscaria depois da hidratação. Quando o assinante nunca escolheu,
// vale o padrão que o provedor definiu no dashboard.
//
// As cores de cada tema são as do protótipo (docs/prototipo/src/v1|v2|v3.jsx),
// já traduzidas em portalTokens — aqui só decidimos qual dos dois lados vale.

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Tenant } from '@/lib/supabase/types';
import { tenantCssText } from '@/lib/tenant/theme';
import { PORTAL_THEME_COOKIE } from '@/lib/portal/theme-cookie';
import { Icon } from './icons';
import { portalTokens, type PortalTokens } from './tokens';

interface ThemeState {
  dark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

export function PortalThemeProvider({
  tenant,
  initialDark,
  children,
}: {
  tenant: Tenant;
  initialDark: boolean;
  children: React.ReactNode;
}) {
  const [dark, setDark] = useState(initialDark);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      // Um ano: a preferência de tema não é sessão, é do aparelho.
      document.cookie = `${PORTAL_THEME_COOKIE}=${next ? 'dark' : 'light'}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);

  const value = useMemo(() => ({ dark, toggle }), [dark, toggle]);

  return (
    <ThemeContext.Provider value={value}>
      {/* Em `:root` e não na div: o `body` também lê essas variáveis, então o
          fundo do provedor cobre a tela inteira, inclusive no overscroll. */}
      <style>{`:root{${tenantCssText(tenant, dark)}}`}</style>
      <div
        data-theme={dark ? 'dark' : 'light'}
        data-layout={tenant.layout}
        className="min-h-screen bg-bg text-fg"
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function usePortalTheme() {
  return useContext(ThemeContext);
}

/**
 * Tokens do layout no tema atual. Fora do provider (o preview do dashboard
 * do provedor, que controla o tema por conta própria) vale o padrão salvo.
 */
export function usePortalTokens(tenant: Tenant): PortalTokens {
  const theme = useContext(ThemeContext);
  const dark = theme?.dark ?? tenant.dark_mode_default;
  return useMemo(() => portalTokens(tenant, dark), [tenant, dark]);
}

/**
 * Botão de claro/escuro. `onAccent` é para os cabeçalhos que ficam por cima
 * da faixa colorida da marca (V3), onde a borda do card sumiria.
 */
export function ThemeToggle({
  t,
  onAccent = false,
  size = 40,
  style,
}: {
  t: PortalTokens;
  onAccent?: boolean;
  size?: number;
  style?: React.CSSProperties;
}) {
  const theme = useContext(ThemeContext);
  if (!theme) return null;

  const label = theme.dark ? 'Mudar para o modo claro' : 'Mudar para o modo escuro';

  return (
    <button
      type="button"
      onClick={theme.toggle}
      aria-label={label}
      aria-pressed={theme.dark}
      title={label}
      style={{
        width: size,
        height: size,
        borderRadius: t.radiusSm,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'background .15s, color .15s',
        ...(onAccent
          ? { background: 'rgba(255,255,255,0.2)', border: 'none', color: t.accentFg }
          : { background: t.surfaceSolid, border: `1px solid ${t.border}`, color: t.text2 }),
        ...style,
      }}
    >
      <Icon name={theme.dark ? 'sun' : 'moon'} size={Math.round(size * 0.45)} />
    </button>
  );
}
