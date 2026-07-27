import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { requireTenantAdmin } from '@/lib/auth/session';
import DomainForm from './domain-form';

export const dynamic = 'force-dynamic';

export default async function DomainPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTenantAdmin(id);

  const supabase = createAdminClient();
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) return null;

  return (
    <DomainForm tenant={tenant} rootDomain={process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'linkhub.api.br'} />
  );
}
