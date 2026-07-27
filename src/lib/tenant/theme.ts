import type { Tenant } from '@/lib/supabase/types';

// Converte hex → "r g b" pra usar como `rgb(var(--brand))` no Tailwind.
export function hexToRgbTriplet(hex: string): string {
  const h = (hex ?? '').replace('#', '').trim();
  const x = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  if (!/^[0-9a-fA-F]{6}$/.test(x.slice(0, 6))) return '109 74 224';
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return '109 74 224';
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `${r} ${g} ${b}`;
}

const DARK_FG = '15 16 27';
const LIGHT_FG = '255 255 255';

// Luminância relativa da WCAG. A fórmula YIQ que estava aqui errava em
// laranja e verde: #ff6600 recebia texto branco, que dá 2,9:1 de contraste e
// reprova em qualquer critério de acessibilidade.
function luminance(triplet: string): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = triplet.split(' ').map(Number);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Entre branco e quase-preto, devolve o que enxerga melhor sobre a cor. */
export function readableOn(hex: string): string {
  const bg = luminance(hexToRgbTriplet(hex));
  return contrast(bg, luminance(LIGHT_FG)) >= contrast(bg, luminance(DARK_FG)) ? LIGHT_FG : DARK_FG;
}

// Só o que o tema precisa — aceita tanto o tenant salvo quanto o estado do
// formulário de marca, pra o preview conseguir renderizar antes de salvar.
export type ThemeInput = Pick<Tenant, 'primary_color' | 'accent_color'>;

export function tenantThemeVars(theme: ThemeInput, dark = false): Record<string, string> {
  const brand = hexToRgbTriplet(theme.primary_color);
  const accent = hexToRgbTriplet(theme.accent_color);

  return {
    '--brand': brand,
    // Cor legível por cima da marca. Sem isso, provedor com cor clara
    // (amarelo, laranja, lima) fica com texto branco ilegível nos cards.
    '--brand-fg': readableOn(theme.primary_color),
    '--brand-soft': brand,
    '--accent': accent,
    '--accent-fg': readableOn(theme.accent_color),
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
  };
}

export function tenantCssVars(theme: ThemeInput, dark = false): React.CSSProperties {
  return tenantThemeVars(theme, dark) as React.CSSProperties;
}

// Bloco de declarações pra injetar em `:root`. Aplicar no elemento raiz (e
// não só numa div) é o que faz o fundo do `body` acompanhar o modo escuro do
// provedor — senão sobra uma faixa clara no overscroll.
//
// Seguro por construção: todo valor sai de hexToRgbTriplet, que só devolve
// três números. Nada do que o provedor digita chega cru na folha de estilo.
export function tenantCssText(theme: ThemeInput, dark = false): string {
  return Object.entries(tenantThemeVars(theme, dark))
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}
