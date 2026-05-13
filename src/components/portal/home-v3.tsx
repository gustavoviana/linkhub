// Layout V3 — Friendly Bold. Bordas grandes, cores fortes, tipografia
// amigável. Tom mais informal/B2C.

import Link from 'next/link';
import type { Tenant, Customer, Contract, Plan, Invoice } from '@/lib/supabase/types';
import { formatBRL, formatDate } from '@/lib/utils';
import { IconBolt, IconFile, IconHelp, IconWifi } from './icons';

interface HomeProps {
  tenant: Tenant;
  customer: Customer;
  contract: Contract | null;
  plan: Plan | null;
  openInvoice: Invoice | null;
  recentInvoices: Invoice[];
}

export function HomeV3({ tenant, customer, contract, plan, openInvoice, recentInvoices }: HomeProps) {
  const firstName = customer.name.split(' ')[0];

  return (
    <div className="max-w-md mx-auto md:max-w-3xl px-4 py-6 pb-24 md:pb-6">
      <header className="mb-6">
        <div className="text-sm text-fg-2">Oi de novo,</div>
        <h1 className="text-3xl font-bold leading-tight">
          {firstName}!
          <span className="ml-1">👋</span>
        </h1>
      </header>

      {openInvoice && (
        <Link href={`/fatura/${openInvoice.id}`}>
          <div
            className="rounded-3xl p-6 mb-6 text-white relative"
            style={{ background: tenant.primary_color }}
          >
            <div className="text-sm font-medium opacity-90">Você tem uma fatura aberta</div>
            <div className="text-5xl font-extrabold mt-3 font-mono tabular-nums tracking-tight">
              {formatBRL(openInvoice.amount_cents)}
            </div>
            <div className="text-sm mt-2 opacity-90">
              Vence em {formatDate(openInvoice.due_date)}
            </div>
            <button
              className="mt-6 w-full bg-white rounded-2xl py-3 font-bold text-base"
              style={{ color: tenant.primary_color }}
            >
              Pagar agora ✨
            </button>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <ShortcutV3 href="/fatura" icon={<IconFile />} label="2ª via" color="info" />
        <ShortcutV3 href="/suporte" icon={<IconHelp />} label="Suporte" color="warning" />
        <ShortcutV3 href="/conta" icon={<IconBolt />} label="Testar velocidade" color="success" />
        <ShortcutV3 href="/conta/plano" icon={<IconWifi />} label="Meu plano" color="brand" />
      </div>

      {contract && plan && (
        <section
          className="rounded-3xl p-6 mb-6 relative overflow-hidden border-2"
          style={{ borderColor: tenant.accent_color, background: 'rgb(var(--bg-2))' }}
        >
          <div className="text-sm font-bold uppercase tracking-wider opacity-80 mb-2">
            Seu plano agora
          </div>
          <div className="text-3xl font-extrabold mb-1">{plan.name}</div>
          <div className="text-sm text-fg-2">
            {plan.down_mbps} mega de download · {plan.up_mbps} mega de upload
          </div>
          <div className="mt-4 inline-flex items-center gap-2 bg-success/10 text-success rounded-full px-3 py-1 text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Tudo certo com a sua conexão!
          </div>
        </section>
      )}

      <h2 className="text-sm font-bold mb-3">Seu histórico</h2>
      <div className="space-y-2">
        {recentInvoices.map((inv) => (
          <Link
            key={inv.id}
            href={`/fatura/${inv.id}`}
            className={`block rounded-2xl p-4 border-2 ${
              inv.status === 'paid' ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">
                  {inv.reference_month
                    ? new Date(inv.reference_month).toLocaleDateString('pt-BR', {
                        month: 'long',
                        year: 'numeric',
                      })
                    : formatDate(inv.due_date)}
                </div>
                <div className="text-xs text-fg-2 mt-0.5">
                  {inv.status === 'paid' ? `✓ Pago em ${formatDate(inv.paid_at ?? inv.due_date)}` : `⏰ Vence ${formatDate(inv.due_date)}`}
                </div>
              </div>
              <div className="text-lg font-bold font-mono tabular-nums">{formatBRL(inv.amount_cents)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ShortcutV3({
  href,
  icon,
  label,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  color: 'info' | 'warning' | 'success' | 'brand';
}) {
  const styles = {
    info: 'bg-info/10 text-info',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
    brand: 'bg-brand/10 text-brand',
  };
  return (
    <Link href={href} className="flex items-center gap-3 bg-bg-2 rounded-2xl p-4 border border-border">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${styles[color]}`}>
        {icon}
      </div>
      <span className="text-sm font-bold">{label}</span>
    </Link>
  );
}
