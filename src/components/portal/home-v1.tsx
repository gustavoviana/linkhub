'use client';

// Layout V1 — Clean Minimal. Portado de docs/prototipo/src/v1.jsx:
// hierarquia tipográfica, muito respiro, cards de borda fina sem sombra.

import { NavLink as Link } from './nav-link';
import { formatBRL, formatDate, formatMonthYear } from '@/lib/utils';
import { Icon } from './icons';
import { portalTokens } from './tokens';
import { BrandMark, PortalScreenProps, daysUntil, initials } from './ui';
import { NetChart } from './net-chart';

export function HomeV1(props: PortalScreenProps) {
  const { tenant, customer, contract, plan, openInvoice, recentInvoices } = props;
  const t = portalTokens(tenant, tenant.dark_mode_default);
  const firstName = customer.name.split(' ')[0];

  return (
    <div style={{ background: t.bg, color: t.text, minHeight: '100%', paddingBottom: 110 }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ padding: '16px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <BrandMark tenant={tenant} t={t} size={30} />
          <Link
            href="/conta"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: t.accentSoft,
              color: t.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {initials(customer.name)}
          </Link>
        </div>

        <div style={{ padding: '18px 24px 0' }}>
          <div style={{ fontSize: 13, color: t.text2 }}>Olá,</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{firstName}</div>
        </div>

        {openInvoice ? (
          <Link href={`/fatura/${openInvoice.id}`} style={{ display: 'block' }}>
            <div
              style={{
                margin: '20px 20px 16px',
                padding: 22,
                borderRadius: t.radius,
                background: t.accentGrad,
                color: t.accentFg,
                boxShadow: `0 16px 30px -12px ${t.accent}66`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <span style={{ fontSize: 11, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                  Próxima fatura
                </span>
                <span style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(255,255,255,0.18)', borderRadius: 12, fontWeight: 600 }}>
                  {dueLabel(openInvoice.due_date)}
                </span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: t.mono, marginTop: 6 }}>
                {formatBRL(openInvoice.amount_cents)}
              </div>
              <div style={{ fontSize: 13, opacity: 0.88, marginTop: 2 }}>
                Vence {formatDate(openInvoice.due_date)}
                {plan && ` · ${plan.name}`}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                <span
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: 12,
                    background: '#fff',
                    color: t.accent,
                    fontWeight: 700,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Icon name="pix" size={15} /> Pagar com Pix
                </span>
                <span
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="barcode" size={16} />
                </span>
              </div>
            </div>
          </Link>
        ) : (
          <NoOpenInvoice t={t} />
        )}

        <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          <Shortcut t={t} href="/fatura" icon="barcode" label="2ª via" />
          <Shortcut t={t} href="/conta" icon="speed" label="Velocidade" />
          <Shortcut t={t} href="/suporte" icon="help" label="Suporte" />
          <Shortcut t={t} href="/conta" icon="settings" label="Plano" />
        </div>

        {contract && (
          <div style={{ margin: '0 20px 14px', padding: 18, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: t.successSoft,
                  color: t.success,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="wifi" size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Sua conexão</div>
                <div style={{ fontSize: 12, color: t.text2 }}>
                  {plan ? `${plan.name} · ${plan.down_mbps ?? '—'} / ${plan.up_mbps ?? '—'} Mbps` : 'Contrato ativo'}
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 10,
                  background: t.successSoft,
                  color: t.success,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: 3, background: t.success }} />
                {contract.status === 'active' ? 'Online' : contract.status}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Stat t={t} label="Download" value={plan?.down_mbps ?? null} unit="Mbps" />
              <Stat t={t} label="Upload" value={plan?.up_mbps ?? null} unit="Mbps" />
            </div>
          </div>
        )}

        <div style={{ margin: '0 20px 14px' }}>
          <NetChart t={t} />
        </div>

        <div style={{ margin: '8px 20px 0' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: t.text2,
              marginBottom: 10,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Últimas faturas</span>
            <Link href="/fatura" style={{ color: t.accent }}>Ver todas</Link>
          </div>
          {recentInvoices.length === 0 && (
            <div style={{ fontSize: 13, color: t.text2, padding: '8px 0' }}>Nenhuma fatura por aqui ainda.</div>
          )}
          {recentInvoices.map((inv) => {
            const paid = inv.status === 'paid';
            return (
              <Link
                key={inv.id}
                href={`/fatura/${inv.id}`}
                style={{
                  padding: 14,
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 14,
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: paid ? t.successSoft : t.accentSoft,
                    color: paid ? t.success : t.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={paid ? 'check' : 'file'} size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {inv.reference_month ? formatMonthYear(inv.reference_month) : formatDate(inv.due_date)}
                  </div>
                  <div style={{ fontSize: 12, color: t.text2, fontFamily: t.mono }}>{formatBRL(inv.amount_cents)}</div>
                </div>
                <Icon name="chevron" size={16} color={t.text3} />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function dueLabel(due: string) {
  const d = daysUntil(due);
  if (d < 0) return `${Math.abs(d)} d atrasada`;
  if (d === 0) return 'vence hoje';
  return `${d} dias`;
}

function Shortcut({
  t,
  href,
  icon,
  label,
}: {
  t: ReturnType<typeof portalTokens>;
  href: string;
  icon: 'barcode' | 'speed' | 'help' | 'settings';
  label: string;
}) {
  return (
    <Link
      href={href}
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: '12px 4px 10px',
        textAlign: 'center',
        display: 'block',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          margin: '0 auto',
          borderRadius: 10,
          background: t.accentSoft,
          color: t.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={17} />
      </div>
      <div style={{ fontSize: 11, marginTop: 7, fontWeight: 500, color: t.text }}>{label}</div>
    </Link>
  );
}

function Stat({
  t,
  label,
  value,
  unit,
}: {
  t: ReturnType<typeof portalTokens>;
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: t.text2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: t.mono, letterSpacing: '-0.02em' }}>
        {value ?? '—'}
        <span style={{ fontSize: 12, color: t.text2, fontWeight: 500, marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
}

export function NoOpenInvoice({ t }: { t: ReturnType<typeof portalTokens> }) {
  return (
    <div
      style={{
        margin: '20px 20px 16px',
        padding: 22,
        borderRadius: t.radius,
        background: t.successSoft,
        border: `1px solid ${t.success}33`,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: t.success,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="check" size={20} />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.success }}>Tudo em dia</div>
        <div style={{ fontSize: 13, color: t.text2 }}>Você não tem faturas em aberto.</div>
      </div>
    </div>
  );
}
