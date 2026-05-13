// Layout V2 — Neo Premium. Mais denso, sombras suaves, cards elevados,
// tipografia compacta. Hierarquia por contraste e cor da marca.

import Link from 'next/link';
import type { Tenant, Customer, Contract, Plan, Invoice } from '@/lib/supabase/types';
import { formatBRL, formatDate } from '@/lib/utils';
import { IconBolt, IconFile, IconHelp, IconWifi, IconArrow } from './icons';

interface HomeProps {
  tenant: Tenant;
  customer: Customer;
  contract: Contract | null;
  plan: Plan | null;
  openInvoice: Invoice | null;
  recentInvoices: Invoice[];
}

export function HomeV2({ tenant, customer, contract, plan, openInvoice, recentInvoices }: HomeProps) {
  const firstName = customer.name.split(' ')[0];

  return (
    <div className="max-w-md mx-auto md:max-w-3xl px-4 py-4 pb-24 md:pb-6">
      <header className="bg-bg-2 -mx-4 px-4 py-4 mb-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logo_url} alt={tenant.name} className="w-8 h-8 rounded-md object-cover" />
          ) : (
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white"
              style={{ background: tenant.primary_color }}
            >
              {tenant.name[0]}
            </div>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-fg-3 font-semibold">Bem-vindo</div>
            <div className="text-sm font-semibold">{firstName}</div>
          </div>
        </div>
      </header>

      {openInvoice && (
        <Link href={`/fatura/${openInvoice.id}`}>
          <div
            className="rounded-xl p-5 mb-5 shadow-lg relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, rgb(var(--brand)), rgb(var(--accent)))` }}
          >
            <div className="relative z-10 text-white">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs uppercase tracking-wider opacity-80 font-semibold">A pagar</span>
                <span className="text-xs opacity-90">
                  Vence {formatDate(openInvoice.due_date)}
                </span>
              </div>
              <div className="text-4xl font-bold font-mono tabular-nums">
                {formatBRL(openInvoice.amount_cents)}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-5">
                <button
                  className="bg-white text-center font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2"
                  style={{ color: tenant.primary_color }}
                >
                  Pix instantâneo
                </button>
                <button className="bg-white/15 border border-white/30 text-white text-center font-medium py-2.5 rounded-lg text-sm">
                  Boleto / PDF
                </button>
              </div>
            </div>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-4 gap-2 mb-5">
        <ShortcutV2 href="/fatura" icon={<IconFile size={18} />} label="2ª via" />
        <ShortcutV2 href="/suporte" icon={<IconHelp size={18} />} label="Suporte" />
        <ShortcutV2 href="/conta" icon={<IconBolt size={18} />} label="Velocidade" />
        <ShortcutV2 href="/conta/plano" icon={<IconWifi size={18} />} label="Plano" />
      </div>

      {contract && plan && (
        <section className="bg-bg-2 rounded-xl p-5 mb-5 shadow-sm">
          <header className="flex items-center justify-between mb-4">
            <div className="text-xs uppercase tracking-wider text-fg-2 font-semibold">Conexão ao vivo</div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-medium text-success">Estável</span>
            </div>
          </header>
          <div className="grid grid-cols-4 gap-3">
            <BlockV2 v={`${plan.down_mbps ?? '—'}`} l="Mbps ↓" />
            <BlockV2 v={`${plan.up_mbps ?? '—'}`} l="Mbps ↑" />
            <BlockV2 v={'14ms'} l="Latência" />
            <BlockV2 v={'-18.4'} l="Sinal" />
          </div>
        </section>
      )}

      <section className="bg-bg-2 rounded-xl p-5 shadow-sm">
        <header className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Histórico de faturas</h2>
          <Link href="/fatura" className="text-xs text-brand">
            Ver tudo
          </Link>
        </header>
        <div className="-mx-2">
          {recentInvoices.map((inv) => (
            <Link
              key={inv.id}
              href={`/fatura/${inv.id}`}
              className="flex items-center gap-3 px-2 py-3 hover:bg-bg-3 rounded-md"
            >
              <div
                className={`w-2 h-10 rounded-full ${
                  inv.status === 'paid' ? 'bg-success' : 'bg-warning'
                }`}
              />
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {inv.reference_month
                    ? new Date(inv.reference_month).toLocaleDateString('pt-BR', {
                        month: 'long',
                        year: 'numeric',
                      })
                    : formatDate(inv.due_date)}
                </div>
                <div className="text-xs text-fg-2">
                  {inv.status === 'paid' ? `Pago em ${formatDate(inv.paid_at ?? inv.due_date)}` : `Vence ${formatDate(inv.due_date)}`}
                </div>
              </div>
              <div className="text-sm font-mono font-semibold tabular-nums">
                {formatBRL(inv.amount_cents)}
              </div>
              <IconArrow size={14} className="text-fg-3" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function ShortcutV2({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 py-3 bg-bg-2 rounded-xl shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="text-brand">{icon}</div>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

function BlockV2({ v, l }: { v: string; l: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-mono font-bold tabular-nums">{v}</div>
      <div className="text-[10px] text-fg-2 mt-0.5">{l}</div>
    </div>
  );
}
