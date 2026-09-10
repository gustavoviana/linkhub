import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/tenant/resolve';
import { getTenantApp } from '@/lib/tenant/app-store-db';
import { appDefaults } from '@/lib/tenant/app-config';
import { copyContext, politicaDePrivacidade } from '@/lib/tenant/store-copy';
import { lerDocumento } from '@/lib/tenant/legal';
import { LegalDoc } from '@/components/portal/legal-doc';

// Política de privacidade do provedor, no domínio dele.
//
// Página pública de propósito: as duas lojas exigem que a URL abra sem login,
// e o revisor precisa alcançá-la antes de instalar qualquer coisa. Fica fora
// do <PortalShell/> — documento não tem barra de navegação nem abas.

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const tenant = await getCurrentTenant();
  if (!tenant) return { title: 'Política de privacidade' };
  return {
    title: `Política de privacidade — ${tenant.name}`,
    description: `Como a ${tenant.name} trata os dados pessoais dos assinantes na central do cliente.`,
  };
}

export default async function PoliticaDePrivacidadePage() {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();

  // Sem ficha de app cadastrada, os padrões da marca já bastam: o documento
  // fala do provedor, e o nome do app é só o carimbo do título.
  const { app } = await getTenantApp(tenant);
  const contexto = copyContext(tenant, app ?? appDefaults(tenant));

  return (
    <LegalDoc
      tenant={tenant}
      documento={lerDocumento(politicaDePrivacidade(contexto, true))}
      outro={{ label: 'Termos de uso', href: '/termos' }}
    />
  );
}
