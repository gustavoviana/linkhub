import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformApi } from '@/lib/auth/platform';
import { gerarSenha } from '@/lib/platform/password';

// Senha do administrador de um provedor.
//
// Duas coisas acontecem aqui: gerar uma senha nova para quem esqueceu, e
// convidar um responsável novo. Nos dois casos a senha aparece uma vez na tela
// de quem pediu e não fica guardada em lugar nenhum — o Supabase só guarda o
// hash, e é assim que deve ser.

const BODY = z.object({
  /** Redefinir a senha de um administrador que já existe. */
  user_id: z.string().uuid().optional(),
  /** Ou criar um administrador novo para este provedor. */
  email: z.string().trim().toLowerCase().email().optional(),
  role: z.enum(['owner', 'admin', 'support', 'viewer']).default('admin'),
  /**
   * Senha escolhida no gerador da tela. Ausente = o servidor gera.
   *
   * O mínimo de 12 é do painel, não do Supabase, que aceita 6: senha de
   * administrador de provedor com 6 caracteres cai em ataque de dicionário
   * antes do fim do café.
   */
  password: z.string().min(12, 'A senha precisa de pelo menos 12 caracteres').max(72).optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requirePlatformApi();
  if (auth.error) return auth.error;

  const parsed = BODY.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 });
  }
  const { user_id, email, role } = parsed.data;
  if (!user_id && !email) {
    return NextResponse.json({ error: 'Informe o administrador ou um e-mail.' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: tenant } = await supabase.from('tenants').select('id, name').eq('id', id).maybeSingle();
  if (!tenant) return NextResponse.json({ error: 'Provedor não encontrado' }, { status: 404 });

  const senha = parsed.data.password ?? gerarSenha();

  // Redefinir a senha de quem já administra este provedor.
  if (user_id) {
    // A trava que importa: o super admin redefine a senha de quem administra
    // ESTE provedor. Sem ela, o id de qualquer usuário do sistema serviria.
    const { data: vinculo } = await supabase
      .from('tenant_admins')
      .select('user_id')
      .eq('tenant_id', id)
      .eq('user_id', user_id)
      .maybeSingle();
    if (!vinculo) {
      return NextResponse.json({ error: 'Esse usuário não administra este provedor.' }, { status: 403 });
    }

    const { data, error } = await supabase.auth.admin.updateUserById(user_id, { password: senha });
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });

    await supabase.from('audit_log').insert({
      tenant_id: id,
      actor_user_id: auth.session.userId,
      action: 'platform.admin_password_reset',
      resource_type: 'user',
      resource_id: user_id,
      metadata: { email: data.user?.email },
    } as never);

    return NextResponse.json({ email: data.user?.email ?? null, password: senha });
  }

  // Administrador novo.
  const { data: criado, error: erroUsuario } = await supabase.auth.admin.createUser({
    email: email!,
    password: senha,
    email_confirm: true,
  });

  let novoId = criado?.user?.id ?? null;
  let senhaGerada: string | null = senha;

  if (!novoId) {
    const jaExiste = /already|registered|exists/i.test(erroUsuario?.message ?? '');
    if (!jaExiste) {
      return NextResponse.json({ error: erroUsuario?.message ?? 'Não foi possível criar o usuário.' }, { status: 502 });
    }
    const { data: lista } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    novoId = lista?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    senhaGerada = null; // conta existente mantém a senha dela
    if (!novoId) {
      return NextResponse.json({ error: 'E-mail já cadastrado, mas não foi possível localizá-lo.' }, { status: 502 });
    }
  }

  const { error: erroVinculo } = await supabase.from('tenant_admins').upsert(
    {
      tenant_id: id,
      user_id: novoId,
      role,
      accepted_at: new Date().toISOString(),
    } as never,
    { onConflict: 'tenant_id,user_id' },
  );
  if (erroVinculo) return NextResponse.json({ error: erroVinculo.message }, { status: 502 });

  await supabase.from('audit_log').insert({
    tenant_id: id,
    actor_user_id: auth.session.userId,
    action: 'platform.admin_added',
    resource_type: 'user',
    resource_id: novoId,
    metadata: { email, role },
  } as never);

  return NextResponse.json({ email, password: senhaGerada });
}
