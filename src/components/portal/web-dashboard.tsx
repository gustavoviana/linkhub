'use client';

// Versão web (desktop) da central — seção "05 · Versão Web (PC)" do
// protótipo (docs/prototipo/src/web.jsx): KPIs no topo, gráfico + coluna de
// pagamento no meio, cartões de conexão, atendimento e plano embaixo.

import { NavLink as Link } from './nav-link';
import { formatBRL, formatDate, formatMonthYear, titleCaseName } from '@/lib/utils';
import { Icon, type IconName } from './icons';
import { portalTokens, rgba, type PortalTokens } from './tokens';
import { NetChart, usageToSeries } from './net-chart';
import { ConnectionCard } from './connection-card';
import { PortalScreenProps, invoiceStanding } from './ui';

export function WebDashboard(props: PortalScreenProps) {
  const { tenant, customer, contract, plan, openInvoice, recentInvoices, connection, usage } = props;
  const t = portalTokens(tenant, tenant.dark_mode_default);
  const firstName = titleCaseName(customer.name.split(' ')[0]);

  const kpis: {
    label: string;
    value: string;
    sub: string;
    icon: IconName;
    color: string;
    cta?: { label: string; href: string };
  }[] = [
    openInvoice
      ? {
          label: 'Próxima fatura',
          value: formatBRL(openInvoice.amount_cents),
          // Sempre a data original do vencimento, com a situação ao lado.
          sub: `${invoiceStanding(openInvoice).label} · ${formatDate(openInvoice.due_date)}`,
          icon: 'card',
          color: t.accent,
          cta: { label: 'Pagar agora', href: `/fatura/${openInvoice.id}` },
        }
      : {
          label: 'Próxima fatura',
          value: 'Em dia',
          sub: 'Nenhuma fatura em aberto',
          icon: 'check',
          color: t.success,
        },
    {
      label: 'Status da conexão',
      value: contract?.status === 'active' ? 'Online' : contract ? contract.status : '—',
      sub: plan ? `${plan.down_mbps ?? '—'} ↓ / ${plan.up_mbps ?? '—'} ↑ Mbps` : 'Sem contrato ativo',
      icon: 'wifi',
      color: t.success,
    },
    {
      label: 'Vencimento',
      value: contract?.due_day ? `Dia ${contract.due_day}` : '—',
      sub: 'Todo mês, na mesma data',
      icon: 'clock',
      color: t.accent2,
    },
    {
      label: 'Plano atual',
      value: plan?.name ?? '—',
      sub: plan?.description ?? 'Consulte seu provedor',
      icon: 'shield',
      color: t.accent,
    },
  ];

  return (
    <div style={{ padding: '24px 28px 40px', color: t.text }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: t.text2, fontWeight: 600 }}>Início / Visão geral</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '4px 0 0', letterSpacing: '-0.01em' }}>
            Olá, {firstName} 👋
          </h1>
        </div>
        <Link
          href="/suporte"
          style={{
            height: 36,
            padding: '0 14px',
            borderRadius: 9,
            border: `1px solid ${t.border}`,
            background: t.surfaceSolid,
            color: t.text,
            fontSize: 12.5,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <Icon name="help" size={14} /> Preciso de ajuda
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ padding: 18, background: t.surfaceSolid, borderRadius: 14, border: `1px solid ${t.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: t.text2, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {k.label}
              </div>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: rgba(k.color, 0.12),
                  color: k.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={k.icon} size={14} />
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', fontFamily: t.mono }}>{k.value}</div>
            <div style={{ fontSize: 11, color: t.text3, marginTop: 4 }}>{k.sub}</div>
            {k.cta && (
              <Link
                href={k.cta.href}
                style={{
                  display: 'inline-block',
                  marginTop: 12,
                  padding: '7px 12px',
                  borderRadius: 8,
                  background: k.color,
                  color: t.accentFg,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {k.cta.label}
              </Link>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 18 }}>
        {/* No desktop o card divide a linha com o de pagamento e estica até a
            altura dele — o gráfico acompanha, senão sobra vazio embaixo. */}
        <NetChart t={t} series={usageToSeries(usage)} height={260} fill />

        <div style={{ padding: 22, background: t.surfaceSolid, borderRadius: 14, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {openInvoice ? 'Pagar fatura aberta' : 'Faturas'}
          </div>
          <div style={{ fontSize: 11, color: t.text2, marginBottom: 14 }}>
            {openInvoice
              ? `${invoiceStanding(openInvoice).label} · vencimento ${formatDate(openInvoice.due_date)}`
              : 'Nada em aberto'}
          </div>

          {openInvoice && (
            <>
              <div style={{ padding: 14, borderRadius: 12, border: `1.5px dashed ${t.border}`, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 11, color: t.text2 }}>Total</span>
                  <span style={{ fontSize: 22, fontWeight: 700, fontFamily: t.mono, letterSpacing: '-0.01em' }}>
                    {formatBRL(openInvoice.amount_cents)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: t.text2 }}>{plan?.name ?? 'Mensalidade'}</span>
                  <span style={{ fontSize: 11, color: t.text2, fontFamily: t.mono }}>
                    {openInvoice.reference_month ? formatMonthYear(openInvoice.reference_month) : ''}
                  </span>
                </div>
              </div>
              <Link
                href={`/fatura/${openInvoice.id}`}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 10,
                  background: t.accentGrad,
                  color: t.accentFg,
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <Icon name="pix" size={15} /> Pagar com Pix
              </Link>
            </>
          )}

          <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 11, color: t.text2, fontWeight: 600, marginBottom: 8 }}>Histórico</div>
            {recentInvoices.length === 0 && (
              <div style={{ fontSize: 12, color: t.text3 }}>Nenhuma fatura ainda.</div>
            )}
            {recentInvoices.slice(0, 4).map((inv, i, arr) => (
              <Link
                key={inv.id}
                href={`/fatura/${inv.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: i < arr.length - 1 ? `1px solid ${t.borderSoft}` : 'none',
                  color: t.text,
                }}
              >
                <div style={{ flex: 1, fontSize: 12, fontFamily: t.mono }}>
                  {inv.reference_month ? formatMonthYear(inv.reference_month) : formatDate(inv.due_date)}
                </div>
                <div style={{ width: 70, fontSize: 10, color: inv.status === 'paid' ? t.success : t.warning, fontWeight: 600 }}>
                  {inv.status === 'paid' ? '✓ Paga' : 'Em aberto'}
                </div>
                <div style={{ width: 84, fontSize: 12, fontWeight: 600, fontFamily: t.mono, textAlign: 'right' }}>
                  {formatBRL(inv.amount_cents)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <div style={{ padding: 18, background: t.surfaceSolid, borderRadius: 14, border: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Sua conexão</div>
            {contract?.status === 'active' && (
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 8,
                  background: rgba(t.success, 0.12),
                  color: t.success,
                  fontWeight: 700,
                }}
              >
                ● ATIVA
              </span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', padding: '8px 0' }}>
            <SpeedStat t={t} label="Down" value={plan?.down_mbps} color={t.accent} />
            <div style={{ width: 1, background: t.border }} />
            <SpeedStat t={t} label="Up" value={plan?.up_mbps} color={t.accent2} />
            <div style={{ width: 1, background: t.border }} />
            <SpeedStat t={t} label="Venc." value={contract?.due_day} color={t.success} unit="" />
          </div>
          {contract?.pppoe_user && (
            <div style={{ marginTop: 10, fontSize: 11, color: t.text3, fontFamily: t.mono, textAlign: 'center' }}>
              usuário: {contract.pppoe_user}
            </div>
          )}
        </div>

        <div style={{ padding: 18, background: t.surfaceSolid, borderRadius: 14, border: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Atendimento</div>
            <Link href="/suporte" style={{ fontSize: 11, color: t.accent, fontWeight: 600 }}>
              + Abrir chamado
            </Link>
          </div>
          <div style={{ fontSize: 12, color: t.text2, lineHeight: 1.6 }}>
            Fale com o {tenant.name} pelos canais oficiais e acompanhe suas solicitações por aqui.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {tenant.support_whatsapp && (
              <a
                href={`https://wa.me/${tenant.support_whatsapp}`}
                target="_blank"
                rel="noreferrer"
                style={{ ...channelBtn(t), background: '#25D366', color: '#fff', border: 'none' }}
              >
                <Icon name="whatsapp" size={15} /> WhatsApp
              </a>
            )}
            {tenant.support_phone && (
              <a href={`tel:${tenant.support_phone.replace(/\D/g, '')}`} style={channelBtn(t)}>
                <Icon name="phone" size={14} /> {tenant.support_phone}
              </a>
            )}
          </div>
        </div>

        <div
          style={{
            padding: 18,
            background: t.accentGrad,
            borderRadius: 14,
            color: t.accentFg,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -30,
              right: -30,
              width: 140,
              height: 140,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
            }}
          />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Seu plano
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, letterSpacing: '-0.01em' }}>
              {plan?.name ?? '—'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 14 }}>
              {plan ? `${plan.down_mbps ?? '—'} ↓ / ${plan.up_mbps ?? '—'} ↑ Mbps` : 'Sem plano vinculado'}
            </div>
            {plan?.price_cents ? (
              <div style={{ fontSize: 13, opacity: 0.95, fontFamily: t.mono }}>
                {formatBRL(plan.price_cents)} / mês
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}


function SpeedStat({
  t,
  label,
  value,
  color,
  unit = 'Mbps',
}: {
  t: PortalTokens;
  label: string;
  value: number | null | undefined;
  color: string;
  unit?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: t.text2, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: t.mono, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: 10, color: t.text3, fontFamily: t.mono }}>{unit}</div>
    </div>
  );
}

function channelBtn(t: PortalTokens): React.CSSProperties {
  return {
    padding: '9px 12px',
    borderRadius: 9,
    border: `1px solid ${t.border}`,
    background: t.surface2,
    color: t.text,
    fontSize: 12,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };
}
