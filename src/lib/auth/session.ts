import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Tenant, TenantAdmin, Customer, AdminRole } from '@/lib/supabase/types';

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .maybeSingle();
  return (data ?? null) as Customer | null;
}
