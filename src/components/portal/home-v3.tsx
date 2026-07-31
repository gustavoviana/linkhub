'use client';

// Layout V3 — Friendly Bold. Portado de docs/prototipo/src/v3.jsx: cabeçalho
// colorido com base arredondada, card de fatura flutuando por cima dele,
// tiles grandes 2×2 e cards de histórico encorpados.

import { NavLink as Link } from './nav-link';
import { contractStatusLabel, formatBRL, formatDate, formatMonthYear, titleCaseName } from '@/lib/utils';
import { Icon, type IconName } from './icons';
import { portalTokens, rgba, type PortalTokens } from './tokens';
import { ThemeToggle, usePortalTokens } from './theme';
import { BrandMark, PortalScreenProps, invoiceStanding } from './ui';
import { NetChart, usageToSeries } from './net-chart';
import { ConnectionCard } from './connection-card';

export function HomeV3(props: PortalScreenProps) {
  const { tenant, customer, contract, plan, openInvoice, recentInvoices, connection, usage } = props;
  const t = usePortalTokens(tenant);
  const firstName = titleCaseName(customer.name.split(' ')[0]);

  return (
    <div style={{ background: t.bg, color: t.text, minHeight: '100%', paddingBottom: 120 }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div
          style={{
            background: t.accentGrad,
            color: t.accentFg,
            padding: '18px 22px 56px',
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            position: 'relative',
            overflow: 'hidden',
            marginBottom: openInvoice ? 60 : 20,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div>
              <div style={{ marginBottom: 10 }}>
                <BrandMark tenant={tenant} t={t} size={30} showName={false} />
              </div>
              <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>Oi de novo,</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em' }}>{firstName} 👋</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ThemeToggle t={t} onAccent size={44} style={{ borderRadius: 14 }} />
              <Link
                href="/conta"
                aria-label="Minha conta"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.2)',
                  color: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="user" size={18} />
              </Link>
            </div>
          </div>
        </div>

        {openInvoice && (
          <Link href={`/fatura/${openInvoice.id}`} style={{ display: 'block' }}>
            <div
              style={{
                margin: '-60px 18px 16px',
                padding: 22,
                background: t.surface,
                borderRadius: t.radius,
                boxShadow: `0 20px 40px -12px ${rgba(t.accent, 0.2)}, 0 0 0 1px ${t.border}`,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: t.text2, fontWeight: 600 }}>Sua próxima fatura</div>
                  <div style={{ fontSize: 36, fontWeight: 800, marginTop: 6, letterSpacing: '-0.02em' }}>
                    {formatBRL(openInvoice.amount_cents)}
                  </div>
                </div>
                <div
                  style={{
                    background: t.accentSoft,
                    color: t.accent,
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '6px 12px',
                    borderRadius: 20,
                  }}
                >
                  {invoiceStanding(openInvoice).label}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13, color: t.text2 }}>
                <Icon name="wifi" size={13} /> {plan?.name ?? 'Seu plano'} · vence {formatDate(openInvoice.due_date)}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <span
                  style={{
                    flex: 1.5,
                    height: 52,
                    borderRadius: 16,
                    background: t.accentGrad,
                    color: t.accentFg,
                    fontSize: 15,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: `0 8px 20px -6px ${rgba(t.accent, 0.5)}`,
                  }}
                >
                  <Icon name="pix" size={17} /> Pagar com Pix
                </span>
                <span
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 16,
                    background: t.surface2,
                    color: t.accent,
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Icon name="barcode" size={15} /> Boleto
                </span>
              </div>
            </div>
          </Link>
        )}

        <div style={{ padding: '0 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <Tile t={t} href="/fatura" icon="barcode" title="2ª via" desc="Baixe seu boleto" />
          <Tile t={t} href="/suporte" icon="help" title="Suporte" desc="Tire suas dúvidas" />
          <Tile t={t} href="/conta" icon="settings" title="Meu plano" desc={plan ? `${plan.down_mbps ?? '—'} / ${plan.up_mbps ?? '—'} Mbps` : 'Ver detalhes'} />
          <Tile t={t} href="/suporte" icon="lock" title="Senha Wi-Fi" desc="Trocar agora" />
        </div>

        {contract && (
          <div
            style={{
              margin: '0 18px 16px',
              padding: 18,
              background: t.surface,
              borderRadius: t.radius,
              border: `2px solid ${t.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: t.success,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="wifi" size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>
                  {contract.status === 'active' ? 'Tudo certo! ✨' : `Contrato ${contractStatusLabel(contract.status).toLowerCase()}`}
                </div>
                <div style={{ fontSize: 12, color: t.text2 }}>
                  {contract.status === 'active' ? 'Sua conexão está ótima' : 'Fale com o suporte'}
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
                padding: '12px 0 4px',
                borderTop: `2px dashed ${t.border}`,
              }}
            >
              <BigStat t={t} label="Download" value={plan?.down_mbps} color={t.success} />
              <BigStat t={t} label="Upload" value={plan?.up_mbps} color={t.accent} />
            </div>
          </div>
        )}

        <div style={{ margin: '0 18px 16px' }}>
          <NetChart t={t} series={usageToSeries(usage)} />
        </div>

        <div style={{ padding: '0 18px' }}>
          {/* Chamar de "pagamentos recentes" o que ainda vai vencer confunde:
              o título segue o que está na lista. */}
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>
            {recentInvoices.every((i) => i.status !== 'paid') ? 'Próximas faturas' : 'Pagamentos recentes'}
          </div>
          {recentInvoices.length === 0 && (
            <div style={{ fontSize: 13, color: t.text2 }}>Nenhuma fatura por aqui ainda.</div>
          )}
          {recentInvoices.map((inv) => {
            const paid = inv.status === 'paid';
            const label = inv.reference_month ? formatMonthYear(inv.reference_month) : formatDate(inv.due_date);
            return (
              <Link
                key={inv.id}
                href={`/fatura/${inv.id}`}
                style={{
                  padding: 14,
                  background: t.surface,
                  borderRadius: 18,
                  border: `2px solid ${t.border}`,
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: t.accentSoft,
                    color: t.accent,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 800,
                    lineHeight: 1.1,
                    textTransform: 'capitalize',
                  }}
                >
                  {label.split(' ')[0].slice(0, 3)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{formatBRL(inv.amount_cents)}</div>
                  <div style={{ fontSize: 11, color: paid ? t.success : t.warning, fontWeight: 600 }}>
                    {paid ? '✓ Paga' : 'Em aberto'}
                  </div>
                </div>
                <Icon name="chevron" size={18} color={t.accent} />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function Tile({
  t,
  href,
  icon,
  title,
  desc,
}: {
  t: PortalTokens;
  href: string;
  icon: IconName;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      style={{
        padding: 16,
        background: t.surface2,
        borderRadius: 22,
        minHeight: 110,
        display: 'block',
        color: t.text,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: t.accentGrad,
          color: t.accentFg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 6px 14px -4px ${rgba(t.accent, 0.5)}`,
        }}
      >
        <Icon name={icon} size={22} />
      </div>
      <div style={{ marginTop: 12, fontSize: 14, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 11, color: t.text2, marginTop: 2 }}>{desc}</div>
    </Link>
  );
}

function BigStat({
  t,
  label,
  value,
  color,
}: {
  t: PortalTokens;
  label: string;
  value: number | null | undefined;
  color: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: t.text2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: t.mono, color }}>
        {value ?? '—'}
        <span style={{ fontSize: 12, color: t.text2 }}> Mbps</span>
      </div>
    </div>
  );
}
