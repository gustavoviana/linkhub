import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { requireTenantAdmin } from '@/lib/auth/tenant-access';
import { getTenantApp, hasPublishedBuild, listBuilds } from '@/lib/tenant/app-store-db';
import { appDefaults, tenantOrigin } from '@/lib/tenant/app-config';
import { MigrationNotice } from './migration-notice';
import AppForm from './app-form';

export const dynamic = 'force-dynamic';

export default async function AppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireTenantAdmin(id);

  const supabase = createAdminClient();
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) return null;

  const { app, missingTable } = await getTenantApp(tenant);
  if (missingTable) return <MigrationNotice />;

  const [builds, published] = await Promise.all([listBuilds(id), hasPublishedBuild(id)]);
  const base = app ?? appDefaults(tenant);

  // A keystore e a senha não saem do servidor: a tela só precisa saber se
  // existem.
  const safeApp = { ...base, keystore_data: base.keystore_data ? 'set' : null, keystore_password: null };

  return (
    <AppForm
      tenant={tenant}
      app={safeApp}
      saved={Boolean(app)}
      builds={builds}
      published={published}
      isPlatformAdmin={access.viaPlatform}
      isOwner={access.role === 'owner'}
      origin={tenantOrigin(tenant)}
      // Sem a migração 014 as colunas novas não existem: a tela avisa.
      versionsReady={app ? 'store_version_floor' in app : true}
    />
  );
}
