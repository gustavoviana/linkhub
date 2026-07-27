import type { Tenant, TenantLayout } from '@/lib/supabase/types';
import { hexToRgbTriplet, readableOn } from '@/lib/tenant/theme';

// Tokens dos três layouts do portal, portados do protótipo em
// docs/prototipo/src/{v1,v2,v3}.jsx.
//
// Regra de tradução: a geometria, a tipografia e os neutros são exatamente
// os do protótipo. O que muda é a cor de marca — no protótipo cada variante
// tinha um acento fixo (V1 índigo, V2 violeta/ciano, V3 laranja); aqui ela
// vem do provedor, senão o produto deixaria de ser white-label.

export interface PortalTokens {
  layout: TenantLayout;
  dark: boolean;
  bg: string;
  bgGrad: string;
  surface: string;
  surfaceSolid: string;
  surface2: string;
  border: string;
  borderSoft: string;
  text: string;
  text2: string;
  text3: string;
  accent: string;
  accentFg: string;
  accent2: string;
  accentSoft: string;
  accentGrad: string;
  success: string;
  successSoft: string;
  warning: string;
  danger: string;
  mono: string;
  /** Raio dos cards — V3 é bem mais arredondado que V1. */
  radius: number;
  radiusSm: number;
}

function rgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgbTriplet(hex).split(' ');
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

export function portalTokens(tenant: Tenant, dark: boolean): PortalTokens {
  const accent = tenant.primary_color;
  const accent2 = tenant.accent_color;
  const accentFg = `rgb(${readableOn(accent)})`;

  const common = {
    layout: tenant.layout,
    dark,
    accent,
    accentFg,
    accent2,
    success: dark ? '#34d399' : '#0e9f6e',
    successSoft: dark ? 'rgba(52,211,153,0.14)' : '#e6faf3',
    warning: dark ? '#fbbf24' : '#b45309',
    danger: dark ? '#fb7185' : '#dc2626',
    mono: MONO,
  };

  if (tenant.layout === 'v2') {
    // Neo Premium — dark-first, vidro, gradiente da marca.
    return {
      ...common,
      bg: dark ? '#07060f' : '#f4f3fa',
      bgGrad: dark
        ? `radial-gradient(ellipse 80% 60% at 30% 0%, ${rgba(accent, 0.18)}, transparent 50%), radial-gradient(ellipse 80% 60% at 80% 30%, ${rgba(accent2, 0.1)}, transparent 50%), #07060f`
        : `radial-gradient(ellipse 80% 60% at 30% 0%, ${rgba(accent, 0.1)}, transparent 50%), radial-gradient(ellipse 80% 60% at 80% 30%, ${rgba(accent2, 0.08)}, transparent 50%), #f4f3fa`,
      surface: dark ? 'rgba(20,18,38,0.6)' : 'rgba(255,255,255,0.7)',
      surfaceSolid: dark ? '#171428' : '#ffffff',
      surface2: dark ? '#1b1730' : '#f0eff7',
      border: rgba(accent, 0.18),
      borderSoft: dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,16,27,0.06)',
      text: dark ? '#f1eefb' : '#13102a',
      text2: dark ? '#a7a3c2' : '#5a5475',
      text3: dark ? '#6c6789' : '#8a85a3',
      accentSoft: rgba(accent, dark ? 0.16 : 0.1),
      accentGrad: `linear-gradient(135deg, ${accent}, ${accent2})`,
      radius: 22,
      radiusSm: 14,
    };
  }

  if (tenant.layout === 'v3') {
    // Friendly Bold — cores fortes, bordas grandes, base quente.
    return {
      ...common,
      bg: dark ? '#1a1410' : '#fff9f4',
      bgGrad: dark ? '#1a1410' : '#fff9f4',
      surface: dark ? '#241b14' : '#ffffff',
      surfaceSolid: dark ? '#241b14' : '#ffffff',
      surface2: dark ? '#2e2218' : rgba(accent, 0.08),
      border: dark ? '#3a2c20' : rgba(accent, 0.18),
      borderSoft: dark ? '#2e2218' : rgba(accent, 0.12),
      text: dark ? '#fef3e8' : '#1a0f08',
      text2: dark ? '#c9a986' : '#6b5344',
      text3: dark ? '#947254' : '#9a8172',
      accentSoft: rgba(accent, dark ? 0.15 : 0.1),
      accentGrad: `linear-gradient(135deg, ${accent2}, ${accent})`,
      radius: 26,
      radiusSm: 18,
    };
  }

  // V1 — Clean Minimal (padrão).
  return {
    ...common,
    bg: dark ? '#0b0e16' : '#f5f6fa',
    bgGrad: dark ? '#0b0e16' : '#f5f6fa',
    surface: dark ? '#141826' : '#ffffff',
    surfaceSolid: dark ? '#141826' : '#ffffff',
    surface2: dark ? '#1c2030' : '#f0f1f6',
    border: dark ? '#252a3d' : '#e7e8ee',
    borderSoft: dark ? '#1f2333' : '#f0f1f6',
    text: dark ? '#eef1f8' : '#0d0f17',
    text2: dark ? '#9ca3b6' : '#525866',
    text3: dark ? '#6b7388' : '#8a90a0',
    accentSoft: rgba(accent, dark ? 0.16 : 0.1),
    accentGrad: `linear-gradient(135deg, ${accent}, ${accent2})`,
    radius: 20,
    radiusSm: 14,
  };
}

/** Sombra colorida da marca — usada nos CTAs principais dos três layouts. */
export function brandShadow(t: PortalTokens, strength = 0.45) {
  return `0 12px 28px -8px ${rgba(t.accent, strength)}`;
}

export { rgba };
