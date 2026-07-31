// Converte a foto escolhida pelo provedor para WebP, no navegador, antes de
// subir.
//
// Uma foto de celular chega com 4 a 8 MB e 4000px de largura para ocupar 900px
// numa tela de login. Subir isso é fazer o assinante baixar oito megabytes na
// primeira tela que ele vê — no 4G da casa dele. Redimensionar e reencodar em
// WebP corta para algo entre 100 e 400 KB, com a mesma aparência.
//
// Roda no cliente porque é onde o arquivo já está: nada de mandar o original
// para o servidor só para ele encolher e devolver.

export interface ImagemConvertida {
  blob: Blob;
  /** Extensão do arquivo final, para montar o caminho no storage. */
  ext: string;
  tipo: string;
  /** Quanto encolheu, para avisar quem enviou. */
  bytesAntes: number;
  bytesDepois: number;
}

const CONVERSIVEIS = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];

export async function converterParaWebp(
  file: File,
  { maxDim = 1920, qualidade = 0.82 }: { maxDim?: number; qualidade?: number } = {},
): Promise<ImagemConvertida> {
  const original: ImagemConvertida = {
    blob: file,
    ext: file.name.split('.').pop()?.toLowerCase() || 'png',
    tipo: file.type || 'application/octet-stream',
    bytesAntes: file.size,
    bytesDepois: file.size,
  };

  // SVG é vetor: rasterizar seria perder qualidade para ganhar peso. Formato
  // desconhecido também passa direto — melhor subir como veio do que estragar.
  if (!CONVERSIVEIS.includes(file.type)) return original;

  try {
    const bitmap = await createImageBitmap(file);
    try {
      const escala = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * escala));
      const h = Math.max(1, Math.round(bitmap.height * escala));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return original;
      ctx.drawImage(bitmap, 0, 0, w, h);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', qualidade),
      );
      // Navegador sem encoder WebP devolve null ou um PNG disfarçado.
      if (!blob || blob.type !== 'image/webp') return original;

      // Imagem pequena e já otimizada pode ficar maior em WebP — nesse caso o
      // original é a melhor escolha.
      if (blob.size >= file.size && file.type !== 'image/png') return original;

      return {
        blob,
        ext: 'webp',
        tipo: 'image/webp',
        bytesAntes: file.size,
        bytesDepois: blob.size,
      };
    } finally {
      bitmap.close?.();
    }
  } catch {
    // Arquivo corrompido ou navegador sem createImageBitmap: sobe o original e
    // deixa o provedor seguir a vida.
    return original;
  }
}

export function formatarBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
