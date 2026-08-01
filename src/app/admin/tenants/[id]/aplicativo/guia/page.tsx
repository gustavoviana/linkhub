import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { requireTenantAdmin } from '@/lib/auth/session';
import { getTenantApp } from '@/lib/tenant/app-store-db';
import { appDefaults } from '@/lib/tenant/app-config';
import { buildStoreCopy, copyContext } from '@/lib/tenant/store-copy';
import { PRE_REQUISITOS, OFFICIAL_LINKS, playSteps, appleSteps } from '@/lib/tenant/store-guide';
import Guide from './guide';

export const dynamic = 'force-dynamic';

export default async function GuiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTenantAdmin(id);

  const supabase = createAdminClient();
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) return null;

  // O guia é leitura: se a migração do app ainda não rodou, os padrões da
  // marca já bastam para montar os textos.
  const { app } = await getTenantApp(tenant);
  const ctx = copyContext(tenant, app ?? appDefaults(tenant));

  return (
    <Guide
      tenantId={tenant.id}
      steps={{ play: playSteps(ctx), apple: appleSteps(ctx) }}
      prerequisites={PRE_REQUISITOS}
      copy={buildStoreCopy(ctx)}
      links={OFFICIAL_LINKS}
    />
  );
}
