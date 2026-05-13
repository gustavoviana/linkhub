import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { requireTenantAdmin } from '@/lib/auth/session';
import ErpForm from './erp-form';

export default async function ErpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTenantAdmin(id);
  const supabase = createAdminClient();
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) return null;
  return <ErpForm tenant={tenant} />;
}
