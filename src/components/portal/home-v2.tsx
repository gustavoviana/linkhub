'use client';

// Layout V2 — Neo Premium. Portado de docs/prototipo/src/v2.jsx: vidro,
// gradiente da marca, densidade maior e hierarquia por contraste.

import { NavLink as Link } from './nav-link';
import { formatBRL, formatDate, formatMonthYear } from '@/lib/utils';
import { Icon, type IconName } from './icons';
import { portalTokens, rgba, type PortalTokens } from './tokens';
import { BrandMark, PortalScreenProps, daysUntil } from './ui';
import { NetChart } from './net-chart';
import { NoOpenInvoice } from './home-v1';

function glass(t: PortalTokens) {
  return {
    background: t.surface,
    backdropFilter: 'blur(20px) saturate(160%)',
    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    border: `1px solid ${t.border}`,
  } as const;
}

export function HomeV2(props: PortalScreenProps) {
  const { tenant, customer, contract, plan, openInvoice, recentInvoices } = props;
  const t = portalTokens(tenant, tenant.dark_mode_default);
  const firstName = customer.name.split(' ')[0];

  return (
    <div style={{ background: t.bgGrad, color: t.text, minHeight: '100%', paddingBottom: 120 }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ padding: '14px 22px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrandMark tenant={tenant} t={t} size={32} showName={false} />
            <div>
              <div style={{ fontSize: 12, color: t.text2 }}>Bem-vindo,</div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>{firstName}</div>
            </div>
          </div>
          <Link
            href="/conta"
            aria-label="Minha conta"
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              ...glass(t),
              color: t.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="user" size={18} />
          </Link>
        </div>

        {openInvoice ? (
          <Link href={`/fatura/${openInvoice.id}`} style={{ display: 'block' }}>
            <div
              style={{
                margin: '16px 18px 14px',
                padding: 22,
                borderRadius: 24,
                background: t.accentGrad,
                color: t.accentFg,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: `0 20px 50px -16px ${rgba(t.accent, 0.55)}`,
              }}
            >
              <svg style={{ position: 'absolute', top: -40, right: -40, opacity: 0.18 }} width="220" height="220" viewBox="0 0 220 220" aria-hidden>
                <circle cx="110" cy="110" r="100" stroke="currentColor" strokeWidth="0.5" fill="none" />
                <circle cx="110" cy="110" r="70" stroke="currentColor" strokeWidth="0.5" fill="none" />
                <circle cx="110" cy="110" r="40" stroke="currentColor" strokeWidth="0.5" fill="none" />
              </svg>
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                    · A pagar
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      background: 'rgba(255,255,255,0.18)',
                      borderRadius: 20,
                      fontWeight: 600,
                    }}
                  >
                    {dueBadge(openInvoice.due_date)}
                  </span>
                </div>
                <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', fontFamily: t.mono, marginTop: 10, lineHeight: 1 }}>
                  {formatBRL(openInvoice.amount_cents)}
                </div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>
                  {plan ? `${plan.name} · ` : ''}
                  {formatDate(openInvoice.due_date)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
                  <span
                    style={{
                      height: 46,
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.95)',
                      color: t.accent,
                      fontWeight: 700,
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                    }}
                  >
                    <Icon name="pix" size={16} /> Pix
                  </span>
                  <span
                    style={{
                      height: 46,
                      borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.12)',
                      fontWeight: 600,
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                    }}
                  >
                    <Icon name="barcode" size={16} /> Boleto
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <NoOpenInvoice t={t} />
        )}

        <div style={{ display: 'flex', gap: 10, padding: '0 18px 16px', overflowX: 'auto' }} className="scrollbar-hide">
          <Quick t={t} href="/fatura" icon="barcode" label="2ª via" />
          <Quick t={t} href="/conta" icon="speed" label="Velocidade" />
          <Quick t={t} href="/suporte" icon="help" label="Suporte" />
          <Quick t={t} href="/conta" icon="settings" label="Plano" />
          <Quick t={t} href="/suporte" icon="shield" label="Wi-Fi" />
        </div>

        {contract && (
          <div style={{ margin: '0 18px 14px', padding: 18, borderRadius: 20, ...glass(t) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: t.success }} />
              <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
                {contract.status === 'active' ? 'Conexão estável' : `Contrato ${contract.status}`}
              </div>
              {contract.pppoe_user && (
                <span style={{ fontSize: 11, color: t.text2, fontFamily: t.mono }}>{contract.pppoe_user}</span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Metric t={t} label="↓ Down" value={plan?.down_mbps} unit="Mbps" color={t.accent} />
              <Metric t={t} label="↑ Up" value={plan?.up_mbps} unit="Mbps" color={t.accent2} />
              <Metric
                t={t}
                label="Venc."
                value={contract.due_day}
                unit="do mês"
                color={t.success}
              />
            </div>
          </div>
        )}

        <div style={{ margin: '0 18px 14px' }}>
          <NetChart t={t} />
        </div>

        <div style={{ margin: '0 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.text2 }}>
              Histórico
            </span>
            <Link href="/fatura" style={{ fontSize: 12, color: t.accent2, fontWeight: 600 }}>
              Ver tudo →
            </Link>
          </div>
          {recentInvoices.length === 0 && (
            <div style={{ fontSize: 13, color: t.text2 }}>Nenhuma fatura por aqui ainda.</div>
          )}
          {recentInvoices.map((inv) => {
            const paid = inv.status === 'paid';
            return (
              <Link
                key={inv.id}
                href={`/fatura/${inv.id}`}
                style={{ padding: '12px 14px', borderRadius: 16, ...glass(t), marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    background: paid ? rgba(t.success, 0.14) : t.accentSoft,
                    color: paid ? t.success : t.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={paid ? 'pix' : 'barcode'} size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {inv.reference_month ? formatMonthYear(inv.reference_month) : formatDate(inv.due_date)}
                  </div>
                  <div style={{ fontSize: 11, color: t.text2 }}>
                    {paid ? `Pago${inv.paid_method ? ` via ${inv.paid_method}` : ''}` : 'Em aberto'}
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: t.mono }}>{formatBRL(inv.amount_cents)}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function dueBadge(due: string) {
  const d = daysUntil(due);
  if (d < 0) return `${Math.abs(d)}d em atraso`;
  if (d === 0) return 'vence hoje';
  return `vence em ${d}d`;
}

function Quick({ t, href, icon, label }: { t: PortalTokens; href: string; icon: IconName; label: string }) {
  return (
    <Link
      href={href}
      style={{
        minWidth: 96,
        padding: '14px 10px',
        borderRadius: 18,
        ...glass(t),
        border: `1px solid ${t.borderSoft}`,
        textAlign: 'center',
        color: t.text,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          margin: '0 auto',
          borderRadius: 12,
          background: t.accentSoft,
          color: t.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 16px ${rgba(t.accent, 0.2)}`,
        }}
      >
        <Icon name={icon} size={18} />
      </div>
      <div style={{ fontSize: 11, marginTop: 8, fontWeight: 600 }}>{label}</div>
    </Link>
  );
}

function Metric({
  t,
  label,
  value,
  unit,
  color,
}: {
  t: PortalTokens;
  label: string;
  value: number | null | undefined;
  unit: string;
  color: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: t.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: t.mono, letterSpacing: '-0.02em', color, marginTop: 2 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 10, color: t.text3 }}>{unit}</div>
    </div>
  );
}
