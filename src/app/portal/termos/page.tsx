import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/tenant/resolve';
import { getTenantApp } from '@/lib/tenant/app-store-db';
import { appDefaults } from '@/lib/tenant/app-config';
import { copyContext } from '@/lib/tenant/store-copy';
import { lerDocumento, termosDeUso } from '@/lib/tenant/legal';
import { LegalDoc } from '@/components/portal/legal-doc';

// Termos de uso do aplicativo, no domínio do provedor.
//
// As lojas não exigem esta página como exigem a de privacidade, mas ela é o
// que separa o app com regras escritas do app sem nenhuma — e a ficha da Play
// tem campo próprio para ela.

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const tenant = await getCurrentTenant();
  if (!tenant) return { title: 'Termos de uso' };
  return {
    title: `Termos de uso — ${tenant.name}`,
    description: `As regras de uso do aplicativo e da central do cliente da ${tenant.name}.`,
  };
}

export default async function TermosDeUsoPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();

  const { app } = await getTenantApp(tenant);
  const contexto = copyContext(tenant, app ?? appDefaults(tenant));

  return (
    <LegalDoc
      tenant={tenant}
      documento={lerDocumento(termosDeUso(contexto, true))}
      outro={{ label: 'Política de privacidade', href: '/privacidade' }}
    />
  );
}
