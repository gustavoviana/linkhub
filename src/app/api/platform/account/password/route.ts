import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformApi } from '@/lib/auth/platform';

// Troca da própria senha do super administrador.
//
// Exige a senha atual, mesmo com a sessão já aberta. O motivo é o notebook
// esquecido aberto: sem essa checagem, quem senta na cadeira troca a senha e
// fica com a conta que controla todos os provedores.
//
// A conferência é um login de verdade num cliente isolado (sem persistir
// sessão), porque o Supabase não expõe "confira esta senha" — e comparar hash
// por conta própria seria reescrever a parte mais sensível do Auth.

const BODY = z.object({
  current_password: z.string().min(1, 'Informe a senha atual'),
  new_password: z
    .string()
    .min(12, 'A senha nova precisa de pelo menos 12 caracteres')
    .max(72, 'Senha longa demais'),
});

export async function POST(req: NextRequest) {
  const auth = await requirePlatformApi();
  if (auth.error) return auth.error;

  const parsed = BODY.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 });
  }
  const { current_password, new_password } = parsed.data;

  if (current_password === new_password) {
    return NextResponse.json({ error: 'A senha nova precisa ser diferente da atual.' }, { status: 400 });
  }

  const verificador = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { error: erroLogin } = await verificador.auth.signInWithPassword({
    email: auth.session.email,
    password: current_password,
  });
  if (erroLogin) {
    return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(auth.session.userId, {
    password: new_password,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  await admin.from('audit_log').insert({
    actor_user_id: auth.session.userId,
    action: 'platform.own_password_changed',
    resource_type: 'user',
    resource_id: auth.session.userId,
  } as never);

  return NextResponse.json({ ok: true });
}
