'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/portal/icons';
import { buildBlockReason, migrationSteps, type MigrationState, type MigrationStepKey } from '@/lib/tenant/app-rules';
import { cn } from '@/lib/utils';
import { UploadKeyCard } from './upload-key-card';

// "Migrar app já publicado": para o provedor que tem app na Play feito por
// outro gerador e quer passar a atualizar pelo LinkHub. O app continua o
// mesmo na loja (mesmo pacote, mesmos usuários); muda só a chave de upload,
// que o Google precisa aprovar antes do primeiro envio.

type Action = 'enable' | 'disable' | 'reset_requested' | 'reset_approved' | 'undo_reset';

const TITLES: Record<MigrationStepKey, string> = {
  package: 'Pacote e versão atual na loja',
  certificate: 'Baixar o certificado de upload',
  reset: 'Pedir a redefinição da chave ao Google',
  signing: 'Colar o SHA-256 da chave de assinatura do Google',
  build: 'Gerar o build',
};

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '';
}

export function MigrationCard({
  tenantId,
  state,
  uploadKey,
  building,
  running,
  onBuild,
}: {
  tenantId: string;
  state: MigrationState;
  uploadKey: { sha256: string | null; hasKeystore: boolean; hasCertificate: boolean; canDownload: boolean };
  building: boolean;
  running: boolean;
  onBuild: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: Action) {
    setPending(action);
    setError(null);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/app/migration`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Não foi possível salvar o passo.');
        return;
      }
      router.refresh();
    } catch {
      setError('Sem conexão. Tente de novo.');
    } finally {
      setPending(null);
    }
  }

  if (!state.migration_enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Migrar app já publicado</CardTitle>
          <CardSubtitle>Para quem já tem o app na Play, feito por outro sistema</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-[13px] text-fg-2 leading-relaxed">
            O app continua o mesmo na loja, com os mesmos usuários e avaliações. O LinkHub passa a gerar as
            atualizações, e para isso o Google precisa aceitar a chave de upload deste provedor.
          </p>
          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => act('enable')} loading={pending === 'enable'}>
            Começar a migração
          </Button>
        </CardBody>
      </Card>
    );
  }

  const steps = migrationSteps(state);
  const blocked = buildBlockReason(state);

  return (
    <Card>
      <CardHeader className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <CardTitle>Migrar app já publicado</CardTitle>
          <CardSubtitle>
            {steps.filter((s) => s.done).length} de {steps.length - 1} passos concluídos
          </CardSubtitle>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => act('disable')} loading={pending === 'disable'}>
          Cancelar migração
        </Button>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex gap-2.5 items-start text-[13px] border rounded-[10px] px-3.5 py-3 text-warning bg-warning/10 border-warning/25">
          <span className="shrink-0 mt-px">
            <Icon name="shield" size={15} />
          </span>
          <span className="leading-relaxed">
            A chave nova só passa a valer depois que o Google aprova a redefinição. Enviar antes disso causa erro de
            assinatura.
          </span>
        </div>

        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}

        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={step.key} className="flex gap-3">
              <span
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5',
                  step.done ? 'bg-success/15 text-success' : 'bg-bg-3 text-fg-3',
                )}
              >
                {step.done ? <Icon name="check" size={12} /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold">{TITLES[step.key]}</div>
                <div className="text-xs text-fg-2 mt-1 leading-relaxed space-y-2">
                  {step.key === 'package' && (
                    <p>
                      Em <strong className="text-fg">Identidade na loja</strong> e <strong className="text-fg">Versão</strong>
                      , acima: o identificador do pacote igual ao do app publicado
                      {state.package_id ? (
                        <>
                          {' '}
                          (<span className="font-mono">{state.package_id}</span>)
                        </>
                      ) : null}{' '}
                      e o código de versão atual na loja
                      {state.store_version_floor > 0 ? ` (${state.store_version_floor})` : ''}. Salve a ficha.
                    </p>
                  )}
                  {step.key === 'certificate' && (
                    <>
                      <p>É o arquivo que você vai enviar ao Google no próximo passo.</p>
                      <UploadKeyCard tenantId={tenantId} {...uploadKey} onDownloaded={() => router.refresh()} />
                    </>
                  )}
                  {step.key === 'reset' && (
                    <>
                      <p>
                        Play Console › Integridade do app › Assinatura de apps › <strong className="text-fg">Solicitar
                        redefinição</strong> da chave de upload. Envie o .pem do passo 2. O Google costuma responder
                        em até 2 dias úteis.
                      </p>
                      {!state.migration_reset_requested_at ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => act('reset_requested')}
                          loading={pending === 'reset_requested'}
                        >
                          Fiz o pedido hoje
                        </Button>
                      ) : (
                        <div className="flex items-center gap-3 flex-wrap">
                          <span>Pedido feito em {formatDate(state.migration_reset_requested_at)}.</span>
                          {state.migration_reset_approved_at ? (
                            <span className="text-success font-semibold">
                              Aprovado em {formatDate(state.migration_reset_approved_at)}.
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => act('reset_approved')}
                              loading={pending === 'reset_approved'}
                            >
                              O Google aprovou
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => act('undo_reset')}
                            className="text-xs text-fg-3 hover:text-fg underline-offset-2 hover:underline"
                          >
                            Desfazer
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  {step.key === 'signing' && (
                    <p>
                      No campo <strong className="text-fg">SHA-256 do Play App Signing</strong>, acima. Não muda com a
                      redefinição: é a chave do Google, não a de upload.
                    </p>
                  )}
                  {step.key === 'build' && (
                    <>
                      {blocked ? (
                        <p className="flex gap-1.5 items-start text-fg-2">
                          <Icon name="lock" size={13} className="mt-0.5 shrink-0" />
                          {blocked}
                        </p>
                      ) : (
                        <p>Tudo pronto. O build sai com o código seguinte ao da loja.</p>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        onClick={onBuild}
                        loading={building}
                        disabled={Boolean(blocked) || running}
                      >
                        {running ? 'Build em andamento…' : 'Gerar o build'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}
