import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Guarda de rota de API para as ações de administrador do provedor.
//
// Separado de `requireTenantAdmin`, que redireciona: redirecionar serve para
// página, e numa chamada fetch vira um 200 com HTML que o cliente tenta ler
// como JSON. Aqui o não autorizado sai como 401 ou 403, que é o que o painel
// sabe tratar.

type Guard =
  | { error: NextResponse; admin?: undefined; userId?: undefined }
  | { error?: undefined; admin: ReturnType<typeof createAdminClient>; userId: string };

export async function requireTenantOwner(tenantId: string): Promise<Guard> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: new NextResponse('Unauthorized', { status: 401 }) };

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from('tenant_admins')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .maybeSingle();

  const role = (membership as { role?: string } | null)?.role;
  if (role !== 'owner' && role !== 'admin') {
    return { error: new NextResponse('Forbidden', { status: 403 }) };
  }

  return { admin, userId: user.id };
}
