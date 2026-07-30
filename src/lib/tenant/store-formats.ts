// Formatos que as lojas pedem, e as medidas em pontos que geram cada um.
//
// A conta é sempre `width × scale`: o navegador renderiza a central na
// largura em pontos do aparelho (os breakpoints se comportam como no
// celular de verdade) e captura com densidade `scale`, então o PNG sai no
// pixel exato que a loja exige — sem redimensionar nada depois, que é o que
// deixa print de app borrado.
//
// Confira as exigências no console de cada loja antes de publicar: elas
// mudam de tempos em tempos. O que está aqui vale para 2026.

export type StoreId = 'apple' | 'play';
export type DeviceChrome = 'ios' | 'android';

export interface StoreFormat {
  id: string;
  store: StoreId;
  label: string;
  /** Pasta dentro do ZIP. */
  folder: string;
  /** Viewport em pontos (CSS px). */
  width: number;
  height: number;
  /** Densidade da captura. */
  scale: number;
  chrome: DeviceChrome;
  /** Obrigatório para publicar, ou só recomendado. */
  required: boolean;
  hint: string;
}

export const STORE_FORMATS: StoreFormat[] = [
  {
    id: 'apple-iphone-69',
    store: 'apple',
    label: 'App Store — iPhone 6,9"',
    folder: 'app-store/iphone-6.9',
    width: 440,
    height: 956,
    scale: 3,
    chrome: 'ios',
    required: true,
    hint: '1320×2868 — o único tamanho de iPhone que a Apple exige hoje.',
  },
  {
    id: 'play-phone',
    store: 'play',
    label: 'Google Play — celular',
    folder: 'google-play/celular',
    width: 360,
    height: 640,
    scale: 3,
    chrome: 'android',
    required: true,
    hint: '1080×1920 — de 2 a 8 imagens; 4 ou mais para concorrer a destaque.',
  },
];

export interface StoreAsset {
  id: string;
  store: StoreId;
  label: string;
  /** Caminho completo dentro do ZIP. */
  path: string;
  kind: 'icone' | 'capa';
  width: number;
  height: number;
  scale: number;
  required: boolean;
  hint: string;
}

export const STORE_ASSETS: StoreAsset[] = [
  {
    id: 'play-icon',
    store: 'play',
    label: 'Google Play — ícone',
    path: 'google-play/icone-512.png',
    kind: 'icone',
    width: 512,
    height: 512,
    scale: 1,
    required: true,
    hint: '512×512, obrigatório na ficha da Play. Usa a marca quadrada (o ícone do navegador) quando você enviou uma — logo deitada encolhe demais num quadrado.',
  },
  {
    id: 'play-feature',
    store: 'play',
    label: 'Google Play — imagem de capa',
    path: 'google-play/capa-1024x500.png',
    kind: 'capa',
    width: 1024,
    height: 500,
    scale: 1,
    required: true,
    hint: '1024×500, obrigatória na Play e esquecida por todo mundo.',
  },
  {
    id: 'apple-icon',
    store: 'apple',
    label: 'App Store — ícone',
    path: 'app-store/icone-1024.png',
    kind: 'icone',
    width: 512,
    height: 512,
    scale: 2,
    required: true,
    hint: '1024×1024, vai no app (asset catalog), não na ficha. Mesma marca quadrada do ícone da Play.',
  },
];

export function findFormat(id: string) {
  return STORE_FORMATS.find((f) => f.id === id) ?? null;
}

export function findAsset(id: string) {
  return STORE_ASSETS.find((a) => a.id === id) ?? null;
}

/** Área segura do topo por aparelho — onde o app pode começar a desenhar. */
export function safeTopFor(chrome: DeviceChrome) {
  return chrome === 'ios' ? 62 : 34;
}
