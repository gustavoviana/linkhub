import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { requireTenantApi } from '@/lib/auth/api-guard';

// Redefinição de senha do cliente final, feita pelo provedor.
//
// O cliente entra por CPF e o e-mail no Auth é sintético, então não existe
// "recuperar por e-mail" do lado dele. Quem redefine é o provedor — igual ao
// que acontece hoje no balcão e no telefone. A senha nova aparece uma única
// vez para ser passada ao cliente, e nunca é guardada em lugar nenhum.

function generatePassword() {
  // Sem caracteres ambíguos (0/O, 1/l): a senha vai ser ditada por telefone.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(10);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; customerId: string }> },
) {
  const { id, customerId } = await ctx.params;

  const auth = await requireTenantApi(id, 'support');
  if (auth.error) return auth.error;
  const { admin } = auth;

  const { data: customer } = await admin
    .from('customers')
    .select('id, tenant_id, user_id, name')
    .eq('id', customerId)
    .single();

  const row = customer as { tenant_id?: string; user_id?: string | null; name?: string } | null;
  if (!row || row.tenant_id !== id) return new NextResponse('Cliente não encontrado', { status: 404 });
  if (!row.user_id) {
    return new NextResponse(
      'Este cliente ainda não acessou o portal. A senha é definida por ele no primeiro acesso.',
      { status: 409 },
    );
  }

  const password = generatePassword();
  const { error } = await admin.auth.admin.updateUserById(row.user_id, { password });
  if (error) return new NextResponse(error.message, { status: 500 });

  await admin.from('audit_log').insert({
    tenant_id: id,
    actor_user_id: auth.userId,
    action: 'customer.password_reset',
    resource_type: 'customer',
    resource_id: customerId,
    metadata: { by: auth.email },
  } as never);

  return NextResponse.json({ ok: true, password });
}
