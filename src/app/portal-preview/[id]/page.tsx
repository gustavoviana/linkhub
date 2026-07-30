import { notFound } from 'next/navigation';
import { requireTenantAdmin } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { buildPreviewData } from '@/lib/tenant/preview-data';
import { PreviewShell } from './preview-shell';

// Renderizado dentro do iframe do mockup, em /admin/tenants/[id]/branding.
//
// Fica fora de /admin de propósito: as rotas de lá herdam o cabeçalho e as
// abas do painel, que não podem aparecer dentro da tela do celular. Continua
// protegido — requireTenantAdmin corta quem não administra o provedor.

export const dynamic = 'force-dynamic';

export const metadata = { robots: { index: false, follow: false } };

export default async function PortalPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTenantAdmin(id);

  const supabase = createAdminClient();
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) notFound();

  // Assinante de vitrine, fictício: é o mesmo que sai nos screenshots das
  // lojas, e mandar cliente real para uma imagem pública seria vazamento.
  return <PreviewShell tenant={tenant} data={buildPreviewData(tenant)} />;
}
