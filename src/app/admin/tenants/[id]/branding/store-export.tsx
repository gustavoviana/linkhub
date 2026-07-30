'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { STORE_ASSETS, STORE_FORMATS } from '@/lib/tenant/store-formats';
import { PREVIEW_SCREENS } from '@/lib/tenant/preview-screens';

// Botão que gera a ficha da loja inteira: as telas da central com a marca
// deste provedor, no pixel que a Apple e o Google exigem, mais ícone e capa.
//
// Um pedido por formato — o servidor sobe um Chrome, tira as telas daquele
// tamanho e devolve. O ZIP é montado aqui, no navegador, quando tudo chega.

interface ShotFile {
  path: string;
  base64: string;
}

const TARGETS = [
  ...STORE_FORMATS.map((f) => ({ id: f.id, label: f.label })),
  { id: 'marca', label: 'Ícones e capa' },
];

export function StoreExport({ tenantName, tenantId, slug }: { tenantName: string; tenantId: string; slug: string }) {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    setDone(false);
    const files: ShotFile[] = [];

    try {
      for (const target of TARGETS) {
        setStep(target.label);
        const res = await fetch(`/api/tenants/${tenantId}/store-assets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: target.id }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Falha ao gerar "${target.label}".`);
        }
        const body = (await res.json()) as { files: ShotFile[] };
        files.push(...body.files);
      }

      setStep('Montando o ZIP');
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (const file of files) zip.file(file.path, file.base64, { base64: true });
      zip.file('LEIA-ME.txt', readme(tenantName));

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}-lojas.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível gerar as imagens.');
    } finally {
      setBusy(false);
      setStep(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publicar nas lojas</CardTitle>
        <CardSubtitle>
          Screenshots da sua central, com a sua marca, no tamanho exato que a App Store e a Google
          Play exigem
        </CardSubtitle>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STORE_FORMATS.map((f) => (
            <div key={f.id} className="p-3 rounded-md border border-border">
              <div className="text-sm font-semibold">{f.label}</div>
              <div className="text-xs text-fg-2 mt-1 leading-relaxed">
                {f.width * f.scale}×{f.height * f.scale} · {PREVIEW_SCREENS.length} telas
              </div>
              <div className="text-xs text-fg-3 mt-1 leading-relaxed">{f.hint}</div>
            </div>
          ))}
          {STORE_ASSETS.map((a) => (
            <div key={a.id} className="p-3 rounded-md border border-border">
              <div className="text-sm font-semibold">{a.label}</div>
              <div className="text-xs text-fg-2 mt-1 leading-relaxed">
                {a.width * a.scale}×{a.height * a.scale}
              </div>
              <div className="text-xs text-fg-3 mt-1 leading-relaxed">{a.hint}</div>
            </div>
          ))}
        </div>

        <p className="text-xs text-fg-2 leading-relaxed">
          As telas saem com um assinante fictício — nome, valores e faturas de exemplo. A loja é uma
          vitrine pública: dado de cliente real não pode ir para lá. O que é seu de verdade nas
          imagens é a marca: logo, cores, layout e contatos.
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <Button type="button" onClick={generate} loading={busy}>
            Gerar imagens das lojas
          </Button>
          {busy && step && <span className="text-sm text-fg-2">{step}…</span>}
          {done && <span className="text-sm text-success">✓ ZIP baixado</span>}
          {error && <span className="text-sm text-danger">{error}</span>}
        </div>
        {busy && (
          <p className="text-xs text-fg-3">
            Leva um minuto: cada tela é aberta e capturada uma a uma, no tamanho do aparelho.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function readme(tenantName: string) {
  const screens = PREVIEW_SCREENS.map((s) => `  ${s.file}.png — ${s.label}`).join('\n');

  return `Imagens da ficha de loja — ${tenantName}
Geradas pela central LinkHub.

app-store/iphone-6.9/    Screenshots de 1320x2868 (iPhone 6,9").
                         É o único tamanho de iPhone exigido: a Apple gera os
                         demais a partir dele. De 1 a 10 imagens por idioma.
google-play/celular/     Screenshots de 1080x1920. A Play aceita de 2 a 8;
                         mande 4 ou mais para concorrer aos destaques.
google-play/icone-512.png       Ícone da ficha (obrigatório). Sai da marca
                                quadrada — envie o "ícone do navegador" em
                                Marca & visual para ele ficar bem no quadrado.
google-play/capa-1024x500.png   Imagem de capa (obrigatória, e a mais esquecida).
app-store/icone-1024.png        Ícone do app iOS — vai no projeto (asset
                                catalog), não na ficha da App Store.

Telas incluídas, na ordem sugerida:
${screens}

Observações
- O assinante das telas é fictício. Nenhum dado de cliente real foi usado.
- Os PNGs saem com canal alfa. Para o ícone do iOS, achate o alfa antes de
  colocar no Xcode (a Apple recusa ícone com transparência).
- Tablet não está incluído: só é exigido se o app declarar suporte a iPad ou
  a telas grandes no Android.
- Screenshot precisa mostrar o app como ele é. Estes mostram: são a central
  de verdade renderizada com a sua marca.
`;
}
