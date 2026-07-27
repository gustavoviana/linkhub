'use client';

// Detalhes da conexão, direto do ERP. Só mostra o que o ERP realmente
// respondeu — campo ausente some do card em vez de exibir traço ou número
// inventado.

import type { Contract, Plan } from '@/lib/supabase/types';
import type { ErpConnection } from '@/lib/erp/types';
import { formatDate } from '@/lib/utils';
import { Icon } from './icons';
import { rgba, type PortalTokens } from './tokens';
import { formatBytes, formatUptime } from './ui';

export function ConnectionCard({
  t,
  connection,
  contract,
  plan,
  compact,
}: {
  t: PortalTokens;
  connection: ErpConnection | null | undefined;
  contract: Contract | null;
  plan: Plan | null;
  compact?: boolean;
}) {
  if (!connection && !contract) return null;

  const online = connection?.online ?? contract?.status === 'active';
  const statusColor = online ? t.success : t.danger;
  const statusText = online ? 'Conectado' : 'Desconectado';

  const details: { label: string; value: string }[] = [];
  if (connection?.login) details.push({ label: 'Usuário', value: connection.login });
  if (connection?.ip) details.push({ label: 'IP', value: connection.ip });
  if (connection?.kind) details.push({ label: 'Tipo', value: connection.kind });
  if (connection?.mac) details.push({ label: 'MAC', value: connection.mac });
  if (connection?.since) {
    details.push({ label: 'Conectado desde', value: formatDate(connection.since.slice(0, 10)) });
  }
  if (connection?.uptimeSeconds) {
    details.push({ label: 'Tempo online', value: formatUptime(connection.uptimeSeconds) });
  }
  if (!online && connection?.disconnectReason) {
    details.push({ label: 'Motivo', value: connection.disconnectReason });
  }

  return (
    <section
      style={{
        padding: 18,
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: rgba(statusColor, 0.12),
            color: statusColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="wifi" size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Sua conexão</div>
          <div style={{ fontSize: 12, color: t.text2 }}>
            {plan?.name ?? 'Plano contratado'}
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            padding: '4px 10px',
            borderRadius: 10,
            background: rgba(statusColor, 0.12),
            color: statusColor,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 3, background: statusColor }} />
          {statusText}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: details.length ? 14 : 0 }}>
        <Metric
          t={t}
          label="Download"
          value={plan?.down_mbps != null ? String(plan.down_mbps) : '—'}
          unit="Mbps"
          sub={connection?.downloadBytes ? `${formatBytes(connection.downloadBytes)} nesta conexão` : undefined}
        />
        <Metric
          t={t}
          label="Upload"
          value={plan?.up_mbps != null ? String(plan.up_mbps) : '—'}
          unit="Mbps"
          sub={connection?.uploadBytes ? `${formatBytes(connection.uploadBytes)} nesta conexão` : undefined}
        />
      </div>

      {details.length > 0 && !compact && (
        <div style={{ borderTop: `1px solid ${t.borderSoft}`, paddingTop: 12, display: 'grid', gap: 8 }}>
          {details.map((d) => (
            <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
              <span style={{ color: t.text2 }}>{d.label}</span>
              <span style={{ fontFamily: t.mono, textAlign: 'right', wordBreak: 'break-all' }}>{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({
  t,
  label,
  value,
  unit,
  sub,
}: {
  t: PortalTokens;
  label: string;
  value: string;
  unit: string;
  sub?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: t.text2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: t.mono, letterSpacing: '-0.02em' }}>
        {value}
        <span style={{ fontSize: 12, color: t.text2, fontWeight: 500, marginLeft: 4 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
