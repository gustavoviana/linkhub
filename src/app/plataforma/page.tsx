import Link from 'next/link';
import { listProviders, platformSummary, BILLING_LABEL } from '@/lib/platform/data';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/utils';
import { MigrationNotice } from './migration-notice';
import { TenantStatusBadge } from './status-badge';

export const dynamic = 'force-dynamic';

export default async function PlatformHome() {
  const { rows, missingTable } = await listProviders();
  if (missingTable) return <MigrationNotice />;

  const resumo = await platformSummary(rows);
  const atrasados = rows.filter((r) => r.overdue > 0);

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Visão geral da plataforma</h1>
        <p className="text-sm text-fg-2 mt-1">
          {resumo.providers} provedor(es) · {resumo.customers} assinantes atendidos
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Receita recorrente" value={formatBRL(resumo.mrrCents)} hint="Mensalidades dos provedores ativos" />
        <Metric label="A receber" value={formatBRL(resumo.openCents)} hint="Cobranças em aberto no prazo" />
        <Metric
          label="Em atraso"
          value={formatBRL(resumo.overdueCents)}
          hint="Cobranças vencidas e não pagas"
          tone={resumo.overdueCents > 0 ? 'danger' : undefined}
        />
        <Metric label="Recebido no mês" value={formatBRL(resumo.paidThisMonthCents)} hint="Baixas registradas neste mês" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Metric label="Ativos" value={String(resumo.active)} />
        <Metric label="Em teste" value={String(resumo.trial)} />
        <Metric label="Suspensos" value={String(resumo.suspended)} tone={resumo.suspended > 0 ? 'warning' : undefined} />
      </div>

      {atrasados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Provedores com cobrança vencida</CardTitle>
            <CardSubtitle>Resolver antes de suspender o acesso costuma sair mais barato</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {atrasados.map((r) => (
              <Link
                key={r.tenant.id}
                href={`/plataforma/provedores/${r.tenant.id}`}
                className="flex items-center gap-3 p-3 rounded-md border border-border hover:border-fg-3 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{r.tenant.name}</div>
                  <div className="text-xs text-fg-2">
                    {r.overdue} cobrança(s) vencida(s) · mensalidade{' '}
                    {formatBRL(r.billing?.monthly_amount_cents ?? 0)}
                  </div>
                </div>
                <Badge tone="danger">em atraso</Badge>
              </Link>
            ))}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Provedores</CardTitle>
          <CardSubtitle>Todos os clientes da plataforma</CardSubtitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-fg-2 border-b border-border">
                  <th className="text-left px-5 py-3 font-medium">Provedor</th>
                  <th className="text-left px-3 py-3 font-medium">Situação</th>
                  <th className="text-left px-3 py-3 font-medium">Assinatura</th>
                  <th className="text-right px-3 py-3 font-medium">Mensalidade</th>
                  <th className="text-right px-3 py-3 font-medium">Assinantes</th>
                  <th className="text-right px-5 py-3 font-medium">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.tenant.id} className="border-b border-border last:border-0 hover:bg-bg-3/40">
                    <td className="px-5 py-3">
                      <Link href={`/plataforma/provedores/${r.tenant.id}`} className="font-medium hover:text-brand">
                        {r.tenant.name}
                      </Link>
                      <div className="text-xs text-fg-3 font-mono">{r.tenant.slug}</div>
                    </td>
                    <td className="px-3 py-3">
                      <TenantStatusBadge status={r.tenant.status} />
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-fg-2">
                        {BILLING_LABEL[r.billing?.status ?? 'trial']}
                        {r.overdue > 0 && <span className="text-danger"> · {r.overdue} vencida(s)</span>}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatBRL(r.billing?.monthly_amount_cents ?? 0)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{r.customers}</td>
                    <td className="px-5 py-3 text-right text-xs text-fg-2">
                      {new Date(r.tenant.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-fg-2">
                      Nenhum provedor cadastrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'danger' | 'warning';
}) {
  const color = tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : '';
  return (
    <div className="bg-bg-2 border border-border rounded-lg p-4">
      <div className="text-[11px] uppercase tracking-wide text-fg-3 font-medium">{label}</div>
      <div className={`text-2xl font-bold mt-1 tabular-nums ${color}`}>{value}</div>
      {hint && <div className="text-[11px] text-fg-3 mt-1 leading-snug">{hint}</div>}
    </div>
  );
}
