import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { limparCacheDoErp } from '@/lib/erp/cache';

// Descarta o que foi sincronizado do ERP e manda buscar tudo de novo.
//
// Salvar a integração já faz isso sozinho quando ela passa a apontar para outro
// sistema. Isto aqui é para o estrago que ficou de antes: provedor que testou a
// integração com a credencial de outro ERP herdou o cliente, o contrato e as
// faturas daquele outro sistema, e nada apagava. Sem uma saída no painel, só
// mexendo no banco.
//
// Nada aqui é dado nosso: cliente, contrato, plano e fatura voltam do ERP na
// próxima visita do assinante (ou no próximo cron). Chamado de suporte fica —
// o schema desliga o vínculo em vez de apagar.

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from('tenant_admins')
    .select('role')
    .eq('tenant_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  // Apagar acervo é coisa de dono da conta, não de quem só consulta.
  const role = (membership as { role?: string } | null)?.role;
  if (role !== 'owner' && role !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const removidos = await limparCacheDoErp(admin, id);

  await admin.from('audit_log').insert({
    tenant_id: id,
    actor_user_id: user.id,
    action: 'tenant.erp_cache_cleared',
    resource_type: 'tenant',
    resource_id: id,
    metadata: { removidos },
  } as never);

  return NextResponse.json({ ok: true, removidos });
}
