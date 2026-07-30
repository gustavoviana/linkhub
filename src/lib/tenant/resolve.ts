import 'server-only';
import { cookies, headers } from 'next/headers';
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

/**
 * Resolve o provedor pelo host, sem depender do middleware.
 *
 * As rotas de imagem (`/icons/*.png`) ficam fora do matcher do middleware —
 * de propósito, senão cada ícone carregaria o cookie de sessão do Supabase e
 * o Chrome do build do Android engasgaria nele. Sem o header, o jeito é ler
 * o host aqui.
 */
export const resolveTenantByHost = cache(async (devSlugHint?: string | null): Promise<Tenant | null> => {
  const h = await headers();
  const fromMiddleware = h.get('x-tenant-slug');
  if (fromMiddleware) return getCurrentTenant();

  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(':')[0]!.toLowerCase();
  const supabase = createAdminClient();
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'linkhub.api.br').toLowerCase();

  if (host.endsWith(`.${rootDomain}`)) {
    const slug = host.slice(0, -(rootDomain.length + 1));
    if (slug && !ROOT_HOSTS.has(slug)) {
      const { data } = await supabase.from('tenants').select('*').eq('slug', slug).maybeSingle();
      if (data) return data as Tenant;
    }
  }

  if (host && host !== rootDomain && !host.startsWith('localhost') && !host.endsWith('.vercel.app')) {
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .eq('custom_domain', host)
      .eq('custom_domain_verified', true)
      .maybeSingle();
    if (data) return data as Tenant;
  }

  // Em dev o subdomínio não existe: vale o mesmo cookie que o middleware
  // grava, ou o `?tenant=` que as rotas de imagem repassam (elas ficam fora
  // do middleware e por isso não recebem o cookie do gerador do app).
  if (process.env.NODE_ENV !== 'production') {
    const slug = devSlugHint ?? (await cookies()).get('dev_tenant')?.value;
    if (slug) {
      const { data } = await supabase.from('tenants').select('*').eq('slug', slug).maybeSingle();
      if (data) return data as Tenant;
    }
  }

  return null;
});

const ROOT_HOSTS = new Set(['www', 'app', 'admin', 'api', 'auth']);

export async function requireTenant(): Promise<Tenant> {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant not found for this host');
  return tenant;
}
