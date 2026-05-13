import 'server-only';
import { headers } from 'next/headers';
import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Tenant } from '@/lib/supabase/types';

// Resolve o tenant do request corrente a partir do header `x-tenant-slug`
// (setado pelo middleware). Usa service-role pra ler tenants — RLS já
// libera SELECT público, mas o admin client evita conflitos de cookie.
//
// cache() deduplica por request: chamadas múltiplas no mesmo render só
// batem no DB uma vez.

export const getCurrentTenant = cache(async (): Promise<Tenant | null> => {
  const h = await headers();
  const slug = h.get('x-tenant-slug');
  if (!slug) return null;

  const supabase = createAdminClient();

  if (slug.startsWith('__custom__:')) {
    const domain = slug.slice('__custom__:'.length);
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .eq('custom_domain', domain)
      .eq('custom_domain_verified', true)
      .single();
    return (data ?? null) as Tenant | null;
  }

  const { data } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single();
  return (data ?? null) as Tenant | null;
});

export async function requireTenant(): Promise<Tenant> {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant not found for this host');
  return tenant;
}
