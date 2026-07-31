import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenant } from '@/lib/tenant/resolve';
import type { Tenant, TenantAdmin, Customer, AdminRole } from '@/lib/supabase/types';

/**
 * Usuário da sessão, uma vez por requisição.
 *
 * `getUser()` do Supabase valida o token no servidor deles — é rede, não
 * leitura de cookie. Sem o cache(), a mesma pergunta ia duas ou três vezes no
 * mesmo render, e cada ida custa a viagem inteira.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}

export async function getUserTenants(): Promise<Array<{ admin: TenantAdmin; tenant: Tenant }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('tenant_admins')
    .select('*, tenant:tenants(*)')
    .eq('user_id', user.id);

  return ((data ?? []) as any[]).map((row) => ({
    admin: { ...row, tenant: undefined } as TenantAdmin,
    tenant: row.tenant as Tenant,
  }));
}

export async function requireTenantAdmin(tenantId: string, minRole: AdminRole = 'admin'): Promise<TenantAdmin> {
  const user = await requireUser();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('tenant_admins')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .single();
  if (!data) redirect('/admin');
  const row = data as unknown as TenantAdmin;
  const rank: Record<AdminRole, number> = { viewer: 0, support: 1, admin: 2, owner: 3 };
  if (rank[row.role] < rank[minRole]) redirect('/admin');
  return row;
}

export async function getCurrentCustomer(tenantId: string): Promise<Customer | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .maybeSingle();
  return (data ?? null) as Customer | null;
}

/**
 * Provedor e assinante da requisição — o começo de toda tela da central.
 *
 * As duas primeiras perguntas não dependem uma da outra: qual provedor é este
 * host, e quem está logado. Em fila, custavam duas viagens até o Supabase antes
 * de a página buscar qualquer dado; juntas, custam uma. Só a busca do cadastro
 * do assinante precisa esperar, porque depende das duas respostas.
 */
export async function getPortalSession(): Promise<{ tenant: Tenant; customer: Customer | null }> {
  const [tenant] = await Promise.all([requireTenant(), getUser()]);
  // getUser() já resolveu acima e está em cache nesta requisição.
  const customer = await getCurrentCustomer(tenant.id);
  return { tenant, customer };
}
