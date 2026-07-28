'use client';

import { NavLink as Link } from './nav-link';
import { usePathname } from 'next/navigation';
import type { Tenant, Customer, Contract, Plan, Invoice } from '@/lib/supabase/types';
import type { ErpConnection, ErpUsagePoint } from '@/lib/erp/types';
import { Icon, type IconName } from './icons';
import { type PortalTokens, rgba } from './tokens';

export interface PortalScreenProps {
  tenant: Tenant;
  customer: Customer;
  contract: Contract | null;
  plan: Plan | null;
  openInvoice: Invoice | null;
  recentInvoices: Invoice[];
  connection?: ErpConnection | null;
  usage?: ErpUsagePoint[];
}

/** "vencida em 10/07" / "vence em 4 dias" — sempre com a data original. */
export function invoiceStanding(invoice: Invoice): {
  overdue: boolean;
  label: string;
  days: number;
} {
  const days = daysUntil(invoice.due_date);
  if (invoice.status === 'paid') return { overdue: false, label: 'paga', days };
  if (days < 0) {
    return {
      overdue: true,
      label: days === -1 ? 'vencida há 1 dia' : `vencida há ${Math.abs(days)} dias`,
      days,
    };
  }
  if (days === 0) return { overdue: false, label: 'vence hoje', days };
  if (days === 1) return { overdue: false, label: 'vence amanhã', days };
  return { overdue: false, label: `vence em ${days} dias`, days };
}

export function formatBytes(bytes?: number | null): string {
  if (bytes == null || Number.isNaN(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[i]}`;
}

export function formatUptime(seconds?: number | null): string {
  if (!seconds || seconds < 0) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function daysUntil(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const due = new Date(y, (m ?? 1) - 1, d ?? 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

/** Marca do provedor: logo enviada ou o quadrado com a inicial. */
export function BrandMark({
  tenant,
  t,
  size = 32,
  showName = true,
}: {
  tenant: Tenant;
  t: PortalTokens;
  size?: number;
  showName?: boolean;
}) {
  if (tenant.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={tenant.logo_url}
        alt={tenant.name}
        style={{ height: size, maxWidth: size * 5, objectFit: 'contain' }}
      />
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: t.layout === 'v3' ? size * 0.36 : size * 0.28,
          background: t.accentGrad,
          color: t.accentFg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.44,
          fontWeight: 800,
        }}
      >
        {tenant.name[0]?.toUpperCase()}
      </div>
      {showName && (
        <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em' }}>
          {tenant.name}
        </span>
      )}
    </div>
  );
}

const TABS: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: '/', label: 'Início', icon: 'home', match: (p) => p === '/' || p === '/portal' },
  { href: '/fatura', label: 'Faturas', icon: 'file', match: (p) => p.startsWith('/fatura') },
  { href: '/suporte', label: 'Suporte', icon: 'help', match: (p) => p.startsWith('/suporte') },
  { href: '/conta', label: 'Conta', icon: 'user', match: (p) => p.startsWith('/conta') },
];

/**
 * Material de vidro da barra de navegação, no espírito do iOS.
 *
 * Três detalhes fazem parecer vidro em vez de um fosco qualquer:
 * a saturação alta, que deixa a cor do que está atrás vazar; o fio de luz na
 * borda de cima, que simula a quina do painel pegando luz; e, no escuro, um
 * ganho de brilho — sem ele um fundo translúcido escuro sobre conteúdo escuro
 * vira só uma mancha.
 *
 * O fundo vem de `surfaceSolid` com alfa próprio: `t.surface` é opaco no V1 e
 * no V3, e com fundo opaco o `backdrop-filter` não tem o que desfocar.
 */
function glassBar(t: PortalTokens) {
  return {
    background: rgba(t.surfaceSolid, t.dark ? 0.62 : 0.7),
    // Lido pelo @supports em globals.css quando o navegador não desfoca.
    ['--glass-solid' as string]: t.surfaceSolid,
    backdropFilter: t.dark
      ? 'blur(24px) saturate(180%) brightness(1.25)'
      : 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: t.dark
      ? 'blur(24px) saturate(180%) brightness(1.25)'
      : 'blur(24px) saturate(180%)',
    border: `1px solid ${rgba(t.text, t.dark ? 0.12 : 0.08)}`,
    boxShadow: t.dark
      ? '0 14px 34px -10px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.09)'
      : '0 14px 34px -14px rgba(15,16,27,0.28), inset 0 1px 0 rgba(255,255,255,0.85)',
  } as const;
}

/**
 * Barra inferior — cada layout tem a sua no protótipo: V1 cápsula flutuante
 * com rótulos, V2 pílula compacta só de ícones, V3 barra larga com pílulas
 * coloridas.
 */
export function TabBar({ t }: { t: PortalTokens }) {
  const pathname = usePathname();

  if (t.layout === 'v2') {
    return (
      <nav
        className="portal-glass"
        style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 6px',
          ...glassBar(t),
          borderRadius: 28,
          display: 'flex',
          gap: 4,
          zIndex: 30,
        }}
      >
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              style={{
                width: 56,
                height: 44,
                borderRadius: 22,
                background: active ? t.accentGrad : 'transparent',
                color: active ? t.accentFg : t.text2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: active ? `0 8px 16px -4px ${rgba(t.accent, 0.5)}` : 'none',
              }}
            >
              <Icon name={tab.icon} size={20} />
            </Link>
          );
        })}
      </nav>
    );
  }

  if (t.layout === 'v3') {
    return (
      <nav
        className="portal-glass"
        style={{
          position: 'fixed',
          bottom: 14,
          left: 14,
          right: 14,
          padding: 6,
          ...glassBar(t),
          borderRadius: 24,
          display: 'flex',
          justifyContent: 'space-around',
          zIndex: 30,
          maxWidth: 520,
          marginInline: 'auto',
        }}
      >
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: 1,
                padding: '10px 4px',
                borderRadius: 18,
                background: active ? t.accentGrad : 'transparent',
                color: active ? t.accentFg : t.text3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Icon name={tab.icon} size={18} />
              <span style={{ fontSize: 10, fontWeight: 700 }}>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      className="portal-glass"
      style={{
        position: 'fixed',
        bottom: 18,
        left: 14,
        right: 14,
        padding: '8px 6px',
        ...glassBar(t),
        borderRadius: 22,
        display: 'flex',
        justifyContent: 'space-around',
        zIndex: 30,
        maxWidth: 520,
        marginInline: 'auto',
      }}
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '8px 14px',
              borderRadius: 14,
              background: active ? t.accentSoft : 'transparent',
              color: active ? t.accent : t.text3,
            }}
          >
            <Icon name={tab.icon} size={18} />
            <span style={{ fontSize: 10, fontWeight: 600 }}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Área do QR do Pix. Mostra o QR que o ERP mandou; quando o ERP só envia o
 * copia-e-cola, não desenhamos um QR falso — o cliente escanearia e não
 * pagaria nada. Nesse caso o copia-e-cola vira o caminho principal.
 */
export function PixQr({
  invoice,
  t,
  size = 188,
}: {
  invoice: Invoice;
  t: PortalTokens;
  size?: number;
}) {
  const src = invoice.pix_qr_code;
  const isImage = !!src && (src.startsWith('http') || src.startsWith('data:image'));

  return (
    <div
      style={{
        width: size,
        height: size,
        margin: '0 auto 14px',
        background: '#fff',
        border: `1px solid ${t.border}`,
        borderRadius: t.radiusSm,
        padding: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src!} alt="QR Code do Pix" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      ) : (
        <div style={{ textAlign: 'center', color: '#525866', padding: 8 }}>
          <Icon name="qr" size={34} color="#8a90a0" />
          <div style={{ fontSize: 11, marginTop: 8, lineHeight: 1.4 }}>
            {invoice.pix_copy_paste
              ? 'Use o Pix copia e cola abaixo'
              : 'Pix indisponível para esta fatura'}
          </div>
        </div>
      )}
    </div>
  );
}

export function SectionTitle({ children, action, t }: { children: React.ReactNode; action?: React.ReactNode; t: PortalTokens }) {
  return (
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
        alignItems: 'center',
      }}
    >
      <span>{children}</span>
      {action}
    </div>
  );
}
