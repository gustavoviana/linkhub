'use client';

// Tela de pagamento — seção "03 · Pagamento" do protótipo.
// Estrutura comum aos três layouts: valor em destaque, abas de método,
// bloco do Pix, boleto e detalhes. O que muda por layout é a moldura.

import { useState } from 'react';
import { NavLink as Link } from './nav-link';
import type { Tenant, Invoice, Plan } from '@/lib/supabase/types';
import { formatBRL, formatDate, formatMonthYear } from '@/lib/utils';
import { Icon } from './icons';
import { portalTokens, rgba, type PortalTokens } from './tokens';
import { PixQr } from './ui';

type Method = 'pix' | 'boleto';

export function InvoiceScreen({
  tenant,
  invoice,
  plan,
}: {
  tenant: Tenant;
  invoice: Invoice;
  plan: Plan | null;
}) {
  const t = portalTokens(tenant, tenant.dark_mode_default);
  const paid = invoice.status === 'paid';
  const [method, setMethod] = useState<Method>(invoice.pix_copy_paste ? 'pix' : 'boleto');

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Valor */}
      {t.layout === 'v3' ? (
        <div
          style={{
            background: t.accentGrad,
            color: t.accentFg,
            padding: '8px 20px 52px',
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
            textAlign: 'center',
            marginBottom: 40,
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>Total a pagar</div>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 4, fontFamily: t.mono }}>
            {formatBRL(invoice.amount_cents)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>Vence {formatDate(invoice.due_date)}</div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '8px 24px 24px' }}>
          <div style={{ fontSize: 11, color: t.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Total a pagar
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: t.mono, marginTop: 4 }}>
            {formatBRL(invoice.amount_cents)}
          </div>
          <div style={{ fontSize: 13, color: t.text2, marginTop: 4 }}>
            Vencimento{' '}
            <strong style={{ color: t.text, fontWeight: 700, fontFamily: t.mono }}>
              {formatDate(invoice.due_date)}
            </strong>
            {invoice.reference_month ? ` · ${formatMonthYear(invoice.reference_month)}` : ''}
          </div>
          <StatusPill t={t} invoice={invoice} />
        </div>
      )}

      {paid ? (
        <div
          style={{
            margin: t.layout === 'v3' ? '-40px 18px 14px' : '0 20px 14px',
            padding: 20,
            borderRadius: t.radius,
            background: t.successSoft,
            border: `1px solid ${rgba(t.success, 0.25)}`,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 13,
              background: t.success,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="check" size={22} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.success }}>Fatura paga</div>
            <div style={{ fontSize: 13, color: t.text2 }}>
              {invoice.paid_at ? `Recebido em ${formatDate(invoice.paid_at.slice(0, 10))}` : 'Pagamento confirmado'}
              {invoice.paid_method ? ` · ${invoice.paid_method}` : ''}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Abas de método */}
          <div
            style={{
              margin: t.layout === 'v3' ? '-40px 18px 14px' : '0 20px 14px',
              padding: 4,
              background: t.surface2,
              borderRadius: 12,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 4,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {(['pix', 'boleto'] as Method[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                style={{
                  height: 36,
                  borderRadius: 9,
                  background: method === m ? t.surfaceSolid : 'transparent',
                  color: method === m ? t.text : t.text2,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: method === m ? 600 : 500,
                  boxShadow: method === m ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {m === 'pix' ? 'Pix' : 'Boleto'}
              </button>
            ))}
          </div>

          {method === 'pix' && (
            <section
              style={{
                margin: '0 20px 12px',
                padding: 20,
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: t.radius,
                textAlign: 'center',
              }}
            >
              <PixQr invoice={invoice} t={t} />
              {invoice.pix_copy_paste ? (
                <>
                  <div
                    style={{
                      background: t.surface2,
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 12,
                      fontFamily: t.mono,
                      fontSize: 11,
                      wordBreak: 'break-all',
                      lineHeight: 1.5,
                      textAlign: 'left',
                      color: t.text2,
                    }}
                  >
                    {invoice.pix_copy_paste}
                  </div>
                  <CopyAction t={t} text={invoice.pix_copy_paste} label="Copiar código Pix" icon="copy" primary />
                  <div style={{ fontSize: 12, color: t.text2, marginTop: 12 }}>
                    Pagamento processado em até 5 minutos.
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: t.text2 }}>
                  Este provedor ainda não disponibilizou Pix para esta fatura.
                </div>
              )}
            </section>
          )}

          {method === 'boleto' && (
            <section
              style={{
                margin: '0 20px 12px',
                padding: 20,
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: t.radius,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Icon name="barcode" size={18} color={t.accent} />
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Boleto bancário</h3>
              </div>
              {invoice.boleto_line ? (
                <>
                  <div
                    style={{
                      background: t.surface2,
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 12,
                      fontFamily: t.mono,
                      fontSize: 12,
                      textAlign: 'center',
                      letterSpacing: '0.04em',
                      color: t.text,
                    }}
                  >
                    {invoice.boleto_line}
                  </div>
                  <CopyAction t={t} text={invoice.boleto_line} label="Copiar linha digitável" icon="copy" primary />
                </>
              ) : (
                <div style={{ fontSize: 13, color: t.text2 }}>Linha digitável indisponível.</div>
              )}
              <a
                href={invoice.boleto_pdf_url ?? `/api/portal/fatura/${invoice.id}/boleto`}
                target="_blank"
                rel="noreferrer"
                style={{ ...secondaryBtn(t), marginTop: 8 }}
              >
                <Icon name="download" size={15} /> Baixar boleto em PDF
              </a>
            </section>
          )}
        </>
      )}

      {/* Detalhes */}
      <section
        style={{
          margin: '0 20px 12px',
          padding: 16,
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: t.radiusSm,
        }}
      >
        <div style={{ fontSize: 12, color: t.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Detalhes
        </div>
        <Row t={t} label={plan?.name ?? 'Mensalidade'} value={formatBRL(invoice.amount_cents)} />
        {invoice.reference_month && (
          <Row t={t} label="Referência" value={formatMonthYear(invoice.reference_month)} />
        )}
        <Row t={t} label="Vencimento" value={formatDate(invoice.due_date)} />
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `2px solid ${t.border}`, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Total</span>
          <span style={{ fontFamily: t.mono, fontWeight: 700, fontSize: 16 }}>{formatBRL(invoice.amount_cents)}</span>
        </div>
      </section>

      {invoice.nfe_url && (
        <div style={{ margin: '0 20px' }}>
          <a href={invoice.nfe_url} target="_blank" rel="noreferrer" style={secondaryBtn(t)}>
            <Icon name="download" size={15} /> Baixar nota fiscal
          </a>
        </div>
      )}

      <div style={{ margin: '12px 20px 0' }}>
        <Link href="/suporte" style={{ fontSize: 13, color: t.accent, fontWeight: 600 }}>
          Problema com esta fatura? Fale com o suporte →
        </Link>
      </div>
    </div>
  );
}

function StatusPill({ t, invoice }: { t: PortalTokens; invoice: Invoice }) {
  const map = {
    paid: [t.success, 'Paga'],
    overdue: [t.danger, 'Em atraso'],
    partial: [t.warning, 'Parcial'],
    cancelled: [t.text3, 'Cancelada'],
    open: [t.accent, 'Em aberto'],
  } as const;
  const [color, label] = map[invoice.status as keyof typeof map] ?? map.open;
  return (
    <span
      style={{
        display: 'inline-block',
        marginTop: 10,
        fontSize: 11,
        fontWeight: 700,
        padding: '4px 12px',
        borderRadius: 20,
        background: rgba(color, 0.12),
        color,
      }}
    >
      {label}
    </span>
  );
}

function Row({ t, label, value }: { t: PortalTokens; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${t.borderSoft}`, fontSize: 13 }}>
      <span style={{ color: t.text2 }}>{label}</span>
      <span style={{ fontFamily: t.mono, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function CopyAction({
  t,
  text,
  label,
  icon,
  primary,
}: {
  t: PortalTokens;
  text: string;
  label: string;
  icon: 'copy';
  primary?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      style={{
        width: '100%',
        height: 48,
        borderRadius: 12,
        background: primary ? t.accentGrad : t.surface2,
        color: primary ? t.accentFg : t.text,
        border: 'none',
        fontSize: 14,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <Icon name={copied ? 'check' : icon} size={15} />
      {copied ? 'Copiado!' : label}
    </button>
  );
}

function secondaryBtn(t: PortalTokens): React.CSSProperties {
  return {
    width: '100%',
    height: 46,
    borderRadius: 12,
    background: t.surface,
    border: `1px solid ${t.border}`,
    color: t.text,
    fontSize: 14,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };
}
