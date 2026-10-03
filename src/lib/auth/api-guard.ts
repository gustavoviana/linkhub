import 'server-only';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AdminRole } from '@/lib/supabase/types';
import { RANK, resolveTenantAccess } from './tenant-access';

// Guarda de rota de API para as ações de administrador do provedor.
//
// Separado de `requireTenantAdmin`, que redireciona: redirecionar serve para
// página, e numa chamada fetch vira um 200 com HTML que o cliente tenta ler
// como JSON. Aqui o não autorizado sai como 401 ou 403, que é o que o painel
// sabe tratar. Super administrador da plataforma passa como dono — a regra
// mora em `resolveTenantAccess`, a mesma das páginas.

type Guard =
  | { error: NextResponse; admin?: undefined; userId?: undefined; email?: undefined; role?: undefined }
  | { error?: undefined; admin: ReturnType<typeof createAdminClient>; userId: string; email: string | null; role: AdminRole };

export async function requireTenantApi(tenantId: string, minRole: AdminRole = 'admin'): Promise<Guard> {
  const r = await resolveTenantAccess(tenantId);
  if (r.kind === 'anon') return { error: new NextResponse('Unauthorized', { status: 401 }) };
  if (r.kind === 'mfa') {
    return { error: new NextResponse('Verificação em duas etapas pendente', { status: 403 }) };
  }
  if (r.kind === 'negado' || RANK[r.access.role] < RANK[minRole]) {
    return { error: new NextResponse('Forbidden', { status: 403 }) };
  }
  return { admin: createAdminClient(), userId: r.access.userId, email: r.access.email, role: r.access.role };
}

/** Dono ou administrador do provedor. */
export function requireTenantOwner(tenantId: string): Promise<Guard> {
  return requireTenantApi(tenantId, 'admin');
}
