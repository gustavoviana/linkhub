import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/tenant/resolve';
import { tenantCssVars } from '@/lib/tenant/theme';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();

  const cssVars = tenantCssVars(tenant, tenant.dark_mode_default);

  return (
    <div
      style={cssVars}
      data-theme={tenant.dark_mode_default ? 'dark' : 'light'}
      data-layout={tenant.layout}
      className="min-h-screen bg-bg text-fg"
    >
      {children}
    </div>
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
