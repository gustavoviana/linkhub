import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AdminRole } from '@/lib/supabase/types';
import { getUser } from './session';
import { getPlatformSession, mfaPendente } from './platform';

// Quem pode administrar um provedor.
//
// Duas portas: estar em tenant_admins daquele provedor, ou ser super
// administrador da plataforma. A segunda não vira linha em tenant_admins de
// propósito (ver migração 009) — é decidida aqui, no servidor, a cada
// requisição. O super administrador entra como dono, e com a mesma trava de
// segundo fator que o /plataforma exige: sem ela, uma senha roubada abriria o
// painel de todos os provedores por esta porta lateral.

export const RANK: Record<AdminRole, number> = { viewer: 0, support: 1, admin: 2, owner: 3 };

export interface TenantAccess {
  userId: string;
  email: string | null;
  role: AdminRole;
  /** Entrou como super administrador, sem vínculo com o provedor. */
  viaPlatform: boolean;
}

type Resultado =
  | { kind: 'anon' }
  | { kind: 'negado' }
  | { kind: 'mfa' }
  | { kind: 'ok'; access: TenantAccess };

export const resolveTenantAccess = cache(async (tenantId: string): Promise<Resultado> => {
  const user = await getUser();
  if (!user) return { kind: 'anon' };

  const { data } = await createAdminClient()
    .from('tenant_admins')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .maybeSingle();

  const role = (data as { role?: AdminRole } | null)?.role;
  if (role) return { kind: 'ok', access: { userId: user.id, email: user.email ?? null, role, viaPlatform: false } };

  if (!(await getPlatformSession())) return { kind: 'negado' };
  if (await mfaPendente()) return { kind: 'mfa' };
  return { kind: 'ok', access: { userId: user.id, email: user.email ?? null, role: 'owner', viaPlatform: true } };
});

/** Guarda das páginas do painel do provedor. */
export async function requireTenantAdmin(
  tenantId: string,
  minRole: AdminRole = 'admin',
): Promise<TenantAccess> {
  const r = await resolveTenantAccess(tenantId);
  if (r.kind === 'anon') redirect('/login');
  if (r.kind === 'mfa') redirect('/plataforma/verificar');
  if (r.kind === 'negado' || RANK[r.access.role] < RANK[minRole]) redirect('/admin');
  return r.access;
}
