import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { requireTenantAdmin } from '@/lib/auth/session';
import { getTenantApp, listBuilds } from '@/lib/tenant/app-store-db';
import { appDefaults, tenantOrigin } from '@/lib/tenant/app-config';
import { MigrationNotice } from './migration-notice';
import AppForm from './app-form';

export const dynamic = 'force-dynamic';

export default async function AppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTenantAdmin(id);

  const supabase = createAdminClient();
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) return null;

  const { app, missingTable } = await getTenantApp(tenant);
  if (missingTable) return <MigrationNotice />;

  const builds = await listBuilds(id);

  return (
    <AppForm
      tenant={tenant}
      app={app ?? appDefaults(tenant)}
      saved={Boolean(app)}
      builds={builds}
      origin={tenantOrigin(tenant)}
    />
  );
}
