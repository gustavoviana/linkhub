// Catálogo das telas que o mockup mostra e que a exportação para as lojas
// transforma em screenshot. Módulo sem React de propósito: o painel, a rota
// de captura e a API de exportação leem essa lista sem arrastar componentes.

export const PREVIEW_SCREENS = [
  { id: 'inicio', label: 'Início', file: '01-inicio' },
  { id: 'pagamento', label: 'Pagamento', file: '02-pagamento' },
  { id: 'faturas', label: 'Faturas', file: '03-faturas' },
  { id: 'consumo', label: 'Consumo', file: '04-consumo' },
  { id: 'suporte', label: 'Suporte', file: '05-suporte' },
  { id: 'conta', label: 'Conta', file: '06-conta' },
  { id: 'entrada', label: 'Entrada', file: '07-entrada' },
] as const;

export type PreviewScreen = (typeof PREVIEW_SCREENS)[number]['id'];

export function isPreviewScreen(value: string | null | undefined): value is PreviewScreen {
  return PREVIEW_SCREENS.some((s) => s.id === value);
}

/**
 * Telas que não começam no topo. "Consumo" é a própria home rolada até o
 * gráfico — a central não tem tela separada de consumo, e inventar uma só
 * para a loja seria vender um app que não existe.
 */
export const SCREEN_ANCHOR: Partial<Record<PreviewScreen, string>> = {
  consumo: '[data-net-chart]',
};

/** Ordem sugerida na loja: o que convence primeiro vem primeiro. */
export const STORE_SCREEN_ORDER: PreviewScreen[] = [
  'inicio',
  'pagamento',
  'faturas',
  'consumo',
  'suporte',
  'conta',
  'entrada',
];
