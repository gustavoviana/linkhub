import type { Tenant } from '@/lib/supabase/types';

// Converte hex → "r g b" pra usar como `rgb(var(--brand))` no Tailwind.
export function hexToRgbTriplet(hex: string): string {
  const h = hex.replace('#', '');
  const x = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return '109 74 224';
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `${r} ${g} ${b}`;
}

// Soft / lighter version (mix com branco a ~10%).
export function hexToSoftRgb(hex: string, alpha = 0.12): string {
  const triplet = hexToRgbTriplet(hex);
  return triplet; // mesmo triplet; usa rgba via /alpha-value no Tailwind.
}

export function isLight(hex: string): boolean {
  const h = hex.replace('#', '');
  const x = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}

export function tenantCssVars(tenant: Tenant, dark = false): React.CSSProperties {
  const brand = hexToRgbTriplet(tenant.primary_color);
  const accent = hexToRgbTriplet(tenant.accent_color);
  const brandFg = isLight(tenant.primary_color) ? '15 16 27' : '255 255 255';
  const accentFg = isLight(tenant.accent_color) ? '15 16 27' : '255 255 255';

  return {
    '--brand': brand,
    '--brand-fg': brandFg,
    '--brand-soft': brand,
    '--accent': accent,
    '--accent-fg': accentFg,
    '--bg': dark ? '7 9 15' : '250 251 253',
    '--bg-2': dark ? '15 19 28' : '255 255 255',
    '--bg-3': dark ? '22 27 39' : '243 244 248',
    '--fg': dark ? '238 241 248' : '13 15 23',
    '--fg-2': dark ? '156 163 182' : '82 88 102',
    '--fg-3': dark ? '107 115 136' : '138 144 160',
    '--border': dark ? '35 42 58' : '231 232 238',
    '--success': '21 145 90',
    '--warning': '184 115 14',
    '--danger': '214 51 74',
    '--info': '38 96 212',
  } as React.CSSProperties;
}
