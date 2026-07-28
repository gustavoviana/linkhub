'use client';

import Link from 'next/link';
import type { Tenant, Invoice } from '@/lib/supabase/types';
import { formatBRL, formatDate, formatMonthYear } from '@/lib/utils';
import { Icon } from '@/components/portal/icons';
import { portalTokens, rgba } from '@/components/portal/tokens';
import { usePortalTokens } from '@/components/portal/theme';
import { ScreenHeader } from '@/components/portal/shell';
import { invoiceStanding } from '@/components/portal/ui';

export function InvoiceList({ tenant, invoices }: { tenant: Tenant; invoices: Invoice[] }) {
  const t = usePortalTokens(tenant);

  // Em aberto: vencimento mais próximo primeiro — é o que o assinante
  // precisa resolver. Pagas: as três últimas bastam para ele se situar.
  const open = invoices
    .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const closed = invoices
    .filter((i) => i.status === 'paid' || i.status === 'cancelled')
    .sort((a, b) => b.due_date.localeCompare(a.due_date))
    .slice(0, 3);

  return (
    <div>
      <ScreenHeader t={t} title="Suas faturas" />
      <p style={{ padding: '0 20px', fontSize: 13, color: t.text2, marginTop: -4, marginBottom: 18 }}>
        Pague por Pix, copie a linha do boleto ou baixe a nota.
      </p>

      {invoices.length === 0 && (
        <div style={{ margin: '0 20px', padding: 24, textAlign: 'center', background: t.surface, border: `1px solid ${t.border}`, borderRadius: t.radius }}>
          <Icon name="file" size={28} color={t.text3} />
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>Nenhuma fatura por aqui</div>
          <div style={{ fontSize: 13, color: t.text2, marginTop: 4 }}>
            Assim que o provedor emitir, ela aparece nesta tela.
          </div>
        </div>
      )}

      {open.length > 0 && (
        <Group t={t} title="Em aberto">
          {open.map((inv) => (
            <Row key={inv.id} t={t} invoice={inv} />
          ))}
        </Group>
      )}

      {closed.length > 0 && (
        <Group t={t} title="Pagas">
          {closed.map((inv) => (
            <Row key={inv.id} t={t} invoice={inv} />
          ))}
        </Group>
      )}
    </div>
  );
}

function Group({
  t,
  title,
  children,
}: {
  t: ReturnType<typeof portalTokens>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ padding: '0 20px', marginBottom: 20 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: t.text2,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </section>
  );
}

function Row({ t, invoice }: { t: ReturnType<typeof portalTokens>; invoice: Invoice }) {
  const paid = invoice.status === 'paid';
  const { overdue, label } = invoiceStanding(invoice);
  const color = paid ? t.success : overdue ? t.danger : t.accent;
  // "vencida há 3 dias" diz mais que "em atraso".
  const standing = paid ? 'Paga' : label;

  return (
    <Link
      href={`/fatura/${invoice.id}`}
      style={{
        padding: 14,
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: t.radiusSm,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        color: t.text,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: rgba(color, 0.12),
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={paid ? 'check' : 'file'} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
          {invoice.reference_month ? formatMonthYear(invoice.reference_month) : formatDate(invoice.due_date)}
        </div>
        <div style={{ fontSize: 12, color: t.text2 }}>
          Vence{' '}
          <strong style={{ color: t.text, fontWeight: 700, fontFamily: t.mono }}>
            {formatDate(invoice.due_date)}
          </strong>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: t.mono }}>{formatBRL(invoice.amount_cents)}</div>
        <div style={{ fontSize: 11, color, fontWeight: 600 }}>{standing}</div>
      </div>
      <Icon name="chevron" size={16} color={t.text3} />
    </Link>
  );
}
