'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Tenant, Customer, Contract, Plan, Invoice } from '@/lib/supabase/types';
import { Icon, type IconName } from './icons';
import { type PortalTokens, rgba } from './tokens';

export interface PortalScreenProps {
  tenant: Tenant;
  customer: Customer;
  contract: Contract | null;
  plan: Plan | null;
  openInvoice: Invoice | null;
  recentInvoices: Invoice[];
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
 * Barra inferior — cada layout tem a sua no protótipo: V1 cápsula flutuante
 * com rótulos, V2 pílula compacta só de ícones, V3 barra larga com pílulas
 * coloridas.
 */
export function TabBar({ t }: { t: PortalTokens }) {
  const pathname = usePathname();

  if (t.layout === 'v2') {
    return (
      <nav
        style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 6px',
          background: t.surface,
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          border: `1px solid ${t.border}`,
          borderRadius: 28,
          display: 'flex',
          gap: 4,
          boxShadow: '0 16px 40px -8px rgba(0,0,0,0.4)',
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
        style={{
          position: 'fixed',
          bottom: 14,
          left: 14,
          right: 14,
          padding: 6,
          background: t.surface,
          borderRadius: 24,
          display: 'flex',
          justifyContent: 'space-around',
          boxShadow: `0 -4px 20px ${rgba(t.accent, 0.14)}`,
          border: `1px solid ${t.border}`,
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
      style={{
        position: 'fixed',
        bottom: 18,
        left: 14,
        right: 14,
        padding: '8px 6px',
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 22,
        display: 'flex',
        justifyContent: 'space-around',
        boxShadow: t.dark ? '0 -4px 18px rgba(0,0,0,0.5)' : '0 -4px 16px rgba(15,16,27,0.06)',
        backdropFilter: 'blur(20px)',
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
