import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { requireTenantAdmin } from '@/lib/auth/session';
import { maskErpConfig } from '@/lib/erp/crypto';
import ErpForm from './erp-form';

export default async function ErpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTenantAdmin(id);
  const supabase = createAdminClient();
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) return null;

  // O formulário nunca recebe as credenciais — só as URLs/usuários e a
  // informação de quais segredos já estão salvos.
  const masked = maskErpConfig(tenant.erp_config);

  return <ErpForm tenant={{ ...tenant, erp_config: {} }} masked={masked} />;
}
