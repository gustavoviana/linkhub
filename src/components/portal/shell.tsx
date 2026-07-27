'use client';

// Casca do portal: barra lateral no desktop, barra flutuante no celular.
// A lateral vem de docs/prototipo/src/web.jsx; a inferior, dos três layouts
// mobile do protótipo.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Tenant, Customer } from '@/lib/supabase/types';
import { maskCpfCnpj, titleCaseName } from '@/lib/utils';
import { Icon, type IconName } from './icons';
import { portalTokens, type PortalTokens } from './tokens';
import { BrandMark, TabBar, initials } from './ui';

const NAV: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: '/', label: 'Visão geral', icon: 'home', match: (p) => p === '/' || p === '/portal' },
  { href: '/fatura', label: 'Faturas', icon: 'file', match: (p) => p.startsWith('/fatura') },
  { href: '/suporte', label: 'Atendimento', icon: 'help', match: (p) => p.startsWith('/suporte') },
  { href: '/conta', label: 'Meus dados', icon: 'user', match: (p) => p.startsWith('/conta') },
];

export function PortalSidebar({
  tenant,
  customer,
  t,
}: {
  tenant: Tenant;
  customer: Customer;
  t: PortalTokens;
}) {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 240,
        background: t.surfaceSolid,
        borderRight: `1px solid ${t.border}`,
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 14px',
        position: 'sticky',
        top: 0,
        height: '100vh',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px 18px' }}>
        <BrandMark tenant={tenant} t={t} size={32} showName={false} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tenant.name}
          </div>
          <div style={{ fontSize: 10, color: t.text3 }}>Central do cliente</div>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 10, color: t.text3, padding: '8px 14px 4px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Principal
        </div>
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 10,
                background: active ? t.accentSoft : 'transparent',
                color: active ? t.accent : t.text2,
                fontSize: 13,
                fontWeight: active ? 600 : 500,
              }}
            >
              <Icon name={item.icon} size={17} />
              <span style={{ flex: 1 }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', padding: 12, borderRadius: 12, background: t.surface2, border: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: t.accentGrad,
              color: t.accentFg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {initials(customer.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {titleCaseName(customer.name)}
            </div>
            <div style={{ fontSize: 10, color: t.text3, fontFamily: t.mono }}>
              {maskCpfCnpj(customer.cpf_cnpj)}
            </div>
          </div>
        </div>
        <Link
          href="/auth/logout"
          style={{
            display: 'block',
            width: '100%',
            padding: 8,
            borderRadius: 8,
            border: `1px solid ${t.border}`,
            background: t.surfaceSolid,
            color: t.text2,
            fontSize: 11,
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          Sair da conta
        </Link>
      </div>
    </aside>
  );
}

/**
 * Envolve as telas internas. `wide` desliga a coluna estreita para páginas
 * que já trazem o próprio grid (o painel web da home).
 */
export function PortalShell({
  tenant,
  customer,
  children,
  wide = false,
}: {
  tenant: Tenant;
  customer: Customer;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const t = portalTokens(tenant, tenant.dark_mode_default);

  return (
    <div style={{ background: t.bgGrad, color: t.text, minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div className="hidden lg:block">
          <PortalSidebar tenant={tenant} customer={customer} t={t} />
        </div>
        <main style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{ maxWidth: wide ? 1180 : 640, margin: '0 auto', paddingBottom: 120 }}
            className="lg:pb-8"
          >
            {children}
          </div>
        </main>
      </div>
      <div className="lg:hidden">
        <TabBar t={t} />
      </div>
    </div>
  );
}

/** Cabeçalho das telas internas, com voltar opcional. */
export function ScreenHeader({
  t,
  title,
  back,
  action,
}: {
  t: PortalTokens;
  title: string;
  back?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
      {back && (
        <Link
          href={back}
          aria-label="Voltar"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: t.surface,
            border: `1px solid ${t.border}`,
            color: t.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="chevron" size={18} style={{ transform: 'rotate(180deg)' }} />
        </Link>
      )}
      <h1 style={{ flex: 1, textAlign: back ? 'center' : 'left', fontSize: 16, fontWeight: 700, margin: 0 }}>
        {title}
      </h1>
      {back && !action && <div style={{ width: 40, flexShrink: 0 }} />}
      {action}
    </div>
  );
}
