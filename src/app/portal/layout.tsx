import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/tenant/resolve';
import { PortalThemeProvider } from '@/components/portal/theme';
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
    </PortalThemeProvider>
  );
}

export async function generateMetadata() {
  const tenant = await getCurrentTenant();
  if (!tenant) return { title: 'Portal não encontrado' };
  return {
    title: `${tenant.name} — Central do Cliente`,
    description: `Central do cliente ${tenant.name}. Consulte faturas, pague com Pix e abra chamados.`,
    icons: tenant.favicon_url ? [{ url: tenant.favicon_url }] : undefined,
  };
}
