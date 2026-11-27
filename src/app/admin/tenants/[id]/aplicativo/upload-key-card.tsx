'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/portal/icons';
import { cn } from '@/lib/utils';

// Chave de upload do provedor: o SHA-256 e o download do certificado
// público (.pem). A keystore em si nunca chega ao navegador.

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; sha256: string }
  | { kind: 'error'; message: string };

export function UploadKeyCard({
  tenantId,
  sha256,
  hasKeystore,
  hasCertificate,
  canDownload,
  onDownloaded,
}: {
  tenantId: string;
  sha256: string | null;
  hasKeystore: boolean;
  hasCertificate: boolean;
  canDownload: boolean;
  onDownloaded?: () => void;
}) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function download() {
    setState({ kind: 'loading' });
    try {
      const res = await fetch(`/api/tenants/${tenantId}/app/upload-cert`, { cache: 'no-store' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        const fallback =
          res.status === 403 ? 'Só o dono do provedor baixa o certificado.' : 'Não foi possível baixar o certificado.';
        setState({ kind: 'error', message: body.error ?? fallback });
        return;
      }
      const blob = await res.blob();
      const name =
        res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'upload_certificate.pem';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      setState({ kind: 'ok', sha256: res.headers.get('X-Upload-Cert-SHA256') ?? sha256 ?? '' });
      onDownloaded?.();
    } catch {
      setState({ kind: 'error', message: 'Sem conexão. Tente de novo.' });
    }
  }

  if (!hasKeystore) {
    return (
      <div className="flex items-center gap-3.5 rounded-[10px] border border-dashed border-border p-3.5">
        <span className="w-9 h-9 rounded-[10px] bg-bg-3 text-fg-3 flex items-center justify-center shrink-0">
          <Icon name="lock" size={16} />
        </span>
        <div className="text-xs text-fg-2 leading-relaxed">
          <span className="font-semibold text-fg">Ainda sem chave de upload.</span> Ela é criada no primeiro build,
          só para este provedor.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-fg-3">Chave de upload</div>
        <p className="text-xs text-fg-2 font-mono break-all mt-1.5">{sha256}</p>
      </div>
      {canDownload ? (
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={download}
            loading={state.kind === 'loading'}
            disabled={!hasCertificate}
          >
            <Icon name="download" size={14} />
            Baixar certificado de upload (.pem)
          </Button>
          {!hasCertificate && (
            <span className="text-xs text-fg-3">O certificado desta chave ainda não foi extraído.</span>
          )}
        </div>
      ) : (
        <p className="text-xs text-fg-3">Só o dono do provedor baixa o certificado de upload.</p>
      )}
      {state.kind === 'ok' && (
        <p role="status" className={cn('text-xs text-success leading-relaxed')}>
          Certificado baixado. O SHA-256 do arquivo confere com o desta tela.
        </p>
      )}
      {state.kind === 'error' && (
        <p role="alert" className="text-xs text-danger leading-relaxed">
          {state.message}
        </p>
      )}
    </div>
  );
}
