// Layout V1 — Clean Minimal. Hierarquia tipográfica, muito espaço em branco,
// cards com bordas finas e sem sombra.

import Link from 'next/link';
import type { Tenant, Customer, Contract, Plan, Invoice } from '@/lib/supabase/types';
import { formatBRL, formatDate } from '@/lib/utils';
import { IconBolt, IconFile, IconHelp, IconWifi, IconArrow } from './icons';
import { Badge } from '@/components/ui/badge';

interface HomeProps {
  tenant: Tenant;
  customer: Customer;
  contract: Contract | null;
  plan: Plan | null;
  openInvoice: Invoice | null;
  recentInvoices: Invoice[];
}

export function HomeV1({ tenant, customer, contract, plan, openInvoice, recentInvoices }: HomeProps) {
  const firstName = customer.name.split(' ')[0];

  return (
    <div className="max-w-md mx-auto md:max-w-3xl px-4 py-6 pb-24 md:pb-6">
      <header className="flex items-center justify-between mb-8">
        <div>
          <div className="text-xs text-fg-2">Olá,</div>
          <h1 className="text-2xl font-bold tracking-tight">{firstName} 👋</h1>
        </div>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm"
          style={{ background: 'rgb(var(--brand) / 0.1)', color: 'rgb(var(--brand))' }}
        >
          {customer.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
        </div>
      </header>

      {openInvoice && (
        <Link href={`/fatura/${openInvoice.id}`} className="block mb-6">
          <div
            className="rounded-2xl p-6 text-white relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, rgb(var(--brand)), rgb(var(--accent)))` }}
          >
            <div className="relative z-10">
              <div className="text-xs opacity-80 uppercase tracking-wider font-semibold">
                Próxima fatura
              </div>
              <div className="text-3xl font-bold mt-2 font-mono tabular-nums">
                {formatBRL(openInvoice.amount_cents)}
              </div>
              <div className="text-sm opacity-90 mt-1">
                Vence {formatDate(openInvoice.due_date)}
                {plan && ` · ${plan.name}`}
              </div>
              <button
                className="mt-4 inline-flex items-center gap-2 bg-white text-fg font-medium px-4 py-2 rounded-lg text-sm"
                style={{ color: tenant.primary_color }}
              >
                Pagar com Pix <IconArrow size={14} />
              </button>
            </div>
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
          </div>
        </Link>
      )}

      <div className="grid grid-cols-4 gap-2 mb-6">
        <ShortcutV1 href="/fatura" icon={<IconFile size={20} />} label="2ª via" />
        <ShortcutV1 href="/suporte" icon={<IconHelp size={20} />} label="Suporte" />
        <ShortcutV1 href="/conta" icon={<IconBolt size={20} />} label="Velocidade" />
        <ShortcutV1 href="/conta/plano" icon={<IconWifi size={20} />} label="Plano" />
      </div>

      {contract && plan && (
        <section className="bg-bg-2 border border-border rounded-xl p-5 mb-6">
          <header className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <IconWifi size={16} />
              <span className="font-semibold text-sm">Sua conexão</span>
            </div>
            <Badge tone="success">online</Badge>
          </header>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Download" value={`${plan.down_mbps ?? '—'}`} unit="Mbps" />
            <Stat label="Upload" value={`${plan.up_mbps ?? '—'}`} unit="Mbps" />
            <Stat label="Plano" value={plan.name} small />
            <Stat label="Vencimento" value={`dia ${contract.due_day ?? plan.name}`} small />
          </div>
        </section>
      )}

      <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-2 mb-3">
        Últimas faturas
      </h2>
      <div className="space-y-2">
        {recentInvoices.map((inv) => (
          <Link
            key={inv.id}
            href={`/fatura/${inv.id}`}
            className="flex items-center gap-3 bg-bg-2 border border-border rounded-xl p-4"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs ${
                inv.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
              }`}
            >
              {inv.status === 'paid' ? '✓' : '!'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">
                {inv.reference_month
                  ? new Date(inv.reference_month).toLocaleDateString('pt-BR', {
                      month: 'long',
                      year: 'numeric',
                    })
                  : formatDate(inv.due_date)}
              </div>
              <div className="text-xs text-fg-2">{formatBRL(inv.amount_cents)}</div>
            </div>
            <IconArrow size={14} className="text-fg-3" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function ShortcutV1({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 py-3 bg-bg-2 border border-border rounded-xl hover:border-fg-3 transition-colors"
    >
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center"
        style={{ background: 'rgb(var(--brand) / 0.1)', color: 'rgb(var(--brand))' }}
      >
        {icon}
      </div>
      <span className="text-[11px] font-medium">{label}</span>
    </Link>
  );
}

function Stat({ label, value, unit, small }: { label: string; value: string; unit?: string; small?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-2">{label}</div>
      <div className={`font-semibold ${small ? 'text-sm' : 'text-lg'} font-mono mt-1`}>
        {value}
        {unit && <span className="text-xs text-fg-2 ml-1 font-sans">{unit}</span>}
      </div>
    </div>
  );
}
