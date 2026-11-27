'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/portal/icons';
import type { AppBuild } from '@/lib/tenant/app-config';
import { versionLabel } from '@/lib/tenant/app-version';
import { cn } from '@/lib/utils';

export const PENDING = new Set(['queued', 'running']);

export function BuildsCard({
  tenantId,
  builds,
  isPlatformAdmin,
  running,
  building,
  blockReason,
  nextLabel,
  onBuild,
}: {
  tenantId: string;
  /** null = a leitura falhou. */
  builds: AppBuild[] | null;
  isPlatformAdmin: boolean;
  running: boolean;
  building: boolean;
  blockReason: string | null;
  nextLabel: string;
  onBuild: () => void;
}) {
  const router = useRouter();
  const android = builds?.filter((b) => b.platform !== 'ios') ?? null;

  return (
    <Card>
      {/* O mesmo botão do topo: quem desce até a lista para pegar o pacote
          procura aqui o "gerar outro". */}
      <CardHeader className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <CardTitle>Builds</CardTitle>
          <CardSubtitle>O próximo sai como {nextLabel}</CardSubtitle>
        </div>
        {android && android.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBuild}
            loading={building}
            disabled={running || Boolean(blockReason)}
          >
            {running ? 'Build em andamento…' : 'Gerar nova versão'}
          </Button>
        )}
      </CardHeader>
      <CardBody>
        {android === null ? (
          <div role="alert" className="flex items-center gap-3.5 py-2">
            <span className="w-10 h-10 rounded-[11px] bg-danger/10 text-danger flex items-center justify-center shrink-0">
              <Icon name="x" size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold">Não foi possível carregar os builds</div>
              <div className="text-xs text-fg-2 mt-0.5">Os pacotes continuam guardados. Tente de novo.</div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>
              <Icon name="refresh" size={14} />
              Tentar de novo
            </Button>
          </div>
        ) : android.length === 0 ? (
          <div className="flex items-center gap-3.5 py-2">
            <span className="w-10 h-10 rounded-[11px] bg-bg-3 text-fg-3 flex items-center justify-center shrink-0">
              <Icon name="file" size={18} />
            </span>
            <div>
              <div className="text-[13px] font-semibold">Nenhum pacote gerado ainda</div>
              <div className="text-xs text-fg-2 mt-0.5">
                {blockReason ?? 'Salve a ficha e clique em “Gerar pacote .aab” lá em cima. Leva de 5 a 10 minutos.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {android.map((b) => (
              <BuildRow key={b.id} tenantId={tenantId} build={b} isPlatformAdmin={isPlatformAdmin} />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function BuildRow({ tenantId, build: b, isPlatformAdmin }: { tenantId: string; build: AppBuild; isPlatformAdmin: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markPublished() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/app/builds/${b.id}/published`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Não foi possível marcar.');
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError('Sem conexão. Tente de novo.');
    } finally {
      setSaving(false);
    }
  }

  const canPublish = isPlatformAdmin && b.status === 'done' && !b.published_at;

  return (
    <div className="p-3 rounded-[10px] border border-border bg-bg/40">
      <div className="flex items-center gap-3 flex-wrap">
        <StatusBadge status={b.status} />
        {b.published_at && <Badge tone="brand">publicado</Badge>}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold font-mono">{versionLabel(b)}</div>
          <div className="text-[11.5px] text-fg-3 mt-0.5">
            {new Date(b.created_at).toLocaleString('pt-BR')}
            {b.artifact_bytes ? ` · ${(b.artifact_bytes / 1024 / 1024).toFixed(1)} MB` : ''}
            {b.published_at ? ` · na loja desde ${new Date(b.published_at).toLocaleDateString('pt-BR')}` : ''}
          </div>
        </div>
        {b.run_url && (
          <a
            href={b.run_url}
            target="_blank"
            rel="noreferrer"
            className="text-[11.5px] text-fg-3 hover:text-fg transition-colors"
          >
            log ↗
          </a>
        )}
        {b.status === 'done' && b.artifact_path && (
          <a
            href={`/api/tenants/${tenantId}/app/download/${b.id}`}
            className="text-[13px] font-semibold text-brand hover:underline whitespace-nowrap"
          >
            Baixar .aab
          </a>
        )}
      </div>
      {b.error && <div className="text-[11.5px] text-danger mt-2 break-words">{b.error}</div>}

      {canPublish && !confirming && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-2.5 text-xs font-semibold text-fg-2 hover:text-fg transition-colors"
        >
          Marcar como publicado na loja
        </button>
      )}
      {canPublish && confirming && (
        <div className="mt-2.5 flex items-center gap-2.5 flex-wrap text-xs">
          <span className="text-fg-2">Depois disso o identificador do pacote fica travado.</span>
          <Button type="button" size="sm" onClick={markPublished} loading={saving}>
            Confirmar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={saving}>
            Voltar
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AppBuild['status'] }) {
  const map: Record<AppBuild['status'], { tone: 'success' | 'info' | 'danger'; label: string }> = {
    done: { tone: 'success', label: 'pronto' },
    queued: { tone: 'info', label: 'na fila' },
    running: { tone: 'info', label: 'gerando' },
    error: { tone: 'danger', label: 'erro' },
  };
  const meta = map[status] ?? map.error;
  return (
    <Badge tone={meta.tone}>
      <span className={cn(PENDING.has(status) && 'animate-pulse')}>{meta.label}</span>
    </Badge>
  );
}
