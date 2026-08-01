'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatBRL, formatDate, cn } from '@/lib/utils';
import type { ChargeWithTenant, PlatformSummary } from '@/lib/platform/data';
import type { ChargeStatus } from '@/lib/supabase/types';

// Faturamento da plataforma: emitir o mês, acompanhar o que entrou e dar baixa.
//
// A emissão é botão e não cron de propósito. Quem cobra quer conferir a lista
// antes, e um cron que erra manda cobrança para cliente errado sem ninguém ver.

const TONE: Record<ChargeStatus, 'success' | 'info' | 'danger' | 'neutral'> = {
  paid: 'success',
  open: 'info',
  overdue: 'danger',
  cancelled: 'neutral',
};

const LABEL: Record<ChargeStatus, string> = {
  paid: 'paga',
  open: 'em aberto',
  overdue: 'vencida',
  cancelled: 'cancelada',
};

type Filtro = 'todas' | ChargeStatus;

export default function BillingScreen({
  charges,
  resumo,
}: {
  charges: ChargeWithTenant[];
  resumo: PlatformSummary;
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [emitindo, setEmitindo] = useState(false);
  const [trabalhando, setTrabalhando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lista = filtro === 'todas' ? charges : charges.filter((c) => c.status === filtro);

  async function emitir() {
    setEmitindo(true);
    setError(null);
    setAviso(null);
    const r = await fetch('/api/platform/charges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: mes }),
    }).catch(() => null);
    setEmitindo(false);
    if (!r) return setError('Não conseguimos falar com o servidor.');
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return setError(body.error ?? 'Não foi possível emitir as mensalidades.');

    setAviso(
      body.criadas === 0
        ? body.message ?? 'Nenhuma cobrança nova: o mês já estava emitido.'
        : `${body.criadas} cobrança(s) emitida(s) de ${body.elegiveis} provedor(es) ativos.`,
    );
    router.refresh();
  }

  async function marcarVencidas() {
    setEmitindo(true);
    setError(null);
    const r = await fetch('/api/platform/charges', { method: 'PATCH' }).catch(() => null);
    setEmitindo(false);
    if (!r?.ok) return setError('Não foi possível atualizar as cobranças.');
    const body = await r.json().catch(() => ({}));
    setAviso(`${body.atualizadas ?? 0} cobrança(s) marcada(s) como vencida(s).`);
    router.refresh();
  }

  async function mudar(id: string, status: ChargeStatus) {
    setTrabalhando(id);
    setError(null);
    const r = await fetch(`/api/platform/charges/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => null);
    setTrabalhando(null);
    if (!r?.ok) return setError('Não foi possível atualizar a cobrança.');
    router.refresh();
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Faturamento</h1>
        <p className="text-sm text-fg-2 mt-1">Mensalidades que os provedores pagam à plataforma</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Recorrente" value={formatBRL(resumo.mrrCents)} />
        <Metric label="A receber" value={formatBRL(resumo.openCents)} />
        <Metric label="Em atraso" value={formatBRL(resumo.overdueCents)} tone={resumo.overdueCents > 0 ? 'danger' : undefined} />
        <Metric label="Recebido no mês" value={formatBRL(resumo.paidThisMonthCents)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Emitir as mensalidades do mês</CardTitle>
          <CardSubtitle>
            Gera uma cobrança para cada provedor com assinatura ativa e mensalidade definida
          </CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-fg-2 mb-1.5">Mês de referência</label>
              <input
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="h-10 px-3 rounded-md border border-border bg-bg-2 text-sm"
              />
            </div>
            <Button type="button" onClick={emitir} loading={emitindo}>
              Emitir mensalidades
            </Button>
            <Button type="button" variant="outline" onClick={marcarVencidas} loading={emitindo}>
              Marcar vencidas
            </Button>
          </div>
          <p className="text-xs text-fg-2 leading-relaxed">
            Emitir duas vezes o mesmo mês não duplica cobrança: cada provedor tem no máximo uma por
            mês de referência.
          </p>
          {aviso && <div className="text-sm text-success bg-success/10 rounded-md p-3">{aviso}</div>}
          {error && <div className="text-sm text-danger bg-danger/10 rounded-md p-3">{error}</div>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>Cobranças</CardTitle>
            <CardSubtitle>{lista.length} de {charges.length}</CardSubtitle>
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['todas', 'open', 'overdue', 'paid', 'cancelled'] as Filtro[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                className={cn(
                  'h-7 px-3 rounded-md text-xs font-medium border transition-colors',
                  filtro === f ? 'border-brand bg-brand/10 text-brand' : 'border-border text-fg-2 hover:text-fg',
                )}
              >
                {f === 'todas' ? 'todas' : LABEL[f]}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardBody className="space-y-2">
          {lista.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-md border border-border flex-wrap">
              <div className="flex-1 min-w-0">
                <Link href={`/plataforma/provedores/${c.tenant_id}`} className="text-sm font-medium hover:text-brand">
                  {c.tenant_name}
                </Link>
                <div className="text-xs text-fg-2">
                  {new Date(`${c.reference_month}T12:00:00`).toLocaleDateString('pt-BR', {
                    month: 'long',
                    year: 'numeric',
                  })}{' '}
                  · vence {formatDate(c.due_date)}
                  {c.paid_at && ` · pago em ${new Date(c.paid_at).toLocaleDateString('pt-BR')}`}
                </div>
              </div>
              <div className="text-sm tabular-nums font-medium">{formatBRL(c.amount_cents)}</div>
              <Badge tone={TONE[c.status]}>{LABEL[c.status]}</Badge>
              {c.status !== 'paid' && c.status !== 'cancelled' && (
                <>
                  <Button type="button" size="sm" loading={trabalhando === c.id} onClick={() => mudar(c.id, 'paid')}>
                    Dar baixa
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    loading={trabalhando === c.id}
                    onClick={() => mudar(c.id, 'cancelled')}
                  >
                    Cancelar
                  </Button>
                </>
              )}
              {c.status === 'paid' && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  loading={trabalhando === c.id}
                  onClick={() => mudar(c.id, 'open')}
                >
                  Desfazer
                </Button>
              )}
            </div>
          ))}
          {lista.length === 0 && (
            <p className="text-sm text-fg-2">
              Nenhuma cobrança neste filtro. Use o botão acima para emitir o mês.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <div className="bg-bg-2 border border-border rounded-lg p-4">
      <div className="text-[11px] uppercase tracking-wide text-fg-3 font-medium">{label}</div>
      <div className={cn('text-xl font-bold mt-1 tabular-nums', tone === 'danger' && 'text-danger')}>
        {value}
      </div>
    </div>
  );
}
