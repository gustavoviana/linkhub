import qrcode from 'qrcode-generator';

// QR do Pix desenhado a partir do copia-e-cola.
//
// O código copia-e-cola JÁ É o conteúdo do QR: o que o app do banco lê da
// câmera é exatamente aquele texto (payload EMV). Ou seja, não existe imagem
// para pedir ao ERP — o SGP nunca manda uma, e a tela de pagamento acabava
// mostrando "use o Pix copia e cola abaixo" em vez do quadradinho.
//
// Vale para servidor e navegador: a biblioteca traz o próprio base64, não
// depende de Buffer nem de btoa.

export function pixQrDataUrl(copyPaste: string | null | undefined): string | null {
  const payload = (copyPaste ?? '').trim();
  if (!payload) return null;

  try {
    // Tipo 0 = escolhe sozinho o tamanho conforme o texto. 'M' é o nível de
    // correção que os bancos usam no Pix: sobra margem para o QR ser lido
    // amassado na tela sem inchar o desenho.
    const qr = qrcode(0, 'M');
    qr.addData(payload);
    qr.make();
    return qr.createDataURL(6, 0);
  } catch (e) {
    // Payload fora do que cabe num QR: melhor cair no copia-e-cola do que
    // derrubar a tela de pagamento.
    console.error('[portal] falha ao gerar QR do Pix', e);
    return null;
  }
}
