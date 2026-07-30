import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Viewport } from 'next';
import { getCurrentTenant } from '@/lib/tenant/resolve';
import { PortalThemeProvider } from '@/components/portal/theme';
import { RegisterSW } from '@/components/portal/register-sw';
import { PORTAL_THEME_COOKIE, resolveDark } from '@/lib/portal/theme-cookie';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();

  // O tema vem do cookie já no servidor: assim a primeira pintura sai certa,
  // sem o flash de claro→escuro que uma leitura de localStorage causaria.
  const store = await cookies();
  const dark = resolveDark(store.get(PORTAL_THEME_COOKIE)?.value, tenant);

  return (
    <PortalThemeProvider tenant={tenant} initialDark={dark}>
      {children}
      <RegisterSW />
    </PortalThemeProvider>
  );
}

export async function generateViewport(): Promise<Viewport> {
  const tenant = await getCurrentTenant();
  return {
    themeColor: tenant?.primary_color ?? '#6d4ae0',
    // A central roda em tela cheia no app: o conteúdo precisa poder ocupar
    // a área do notch, e a barra de status já é tratada nas telas.
    viewportFit: 'cover',
  };
}

export async function generateMetadata() {
  const tenant = await getCurrentTenant();
  if (!tenant) return { title: 'Portal não encontrado' };
  return {
    title: `${tenant.name} — Central do Cliente`,
    description: `Central do cliente ${tenant.name}. Consulte faturas, pague com Pix e abra chamados.`,
    manifest: '/manifest.webmanifest',
    applicationName: tenant.name,
    appleWebApp: {
      capable: true,
      title: tenant.name,
      statusBarStyle: 'default' as const,
    },
    icons: {
      icon: tenant.favicon_url ? [{ url: tenant.favicon_url }] : [{ url: '/icons/icon-192.png' }],
      apple: [{ url: '/icons/apple-touch-icon.png' }],
    },
  };
}
