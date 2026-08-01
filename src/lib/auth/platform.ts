import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from './session';

// Quem é super administrador da plataforma.
//
// A pergunta é sempre respondida no servidor, contra a tabela
// `platform_admins`, que não tem policy nenhuma: a chave anônima do navegador
// não lê essa tabela nem para conferir se ela própria está lá. Não existe
// papel "super" dentro de tenant_admins de propósito — se existisse, qualquer
// caminho que escreve papel de equipe viraria uma escada para a plataforma
// inteira.

export interface PlatformSession {
  userId: string;
  email: string;
}

/** Erro de tabela ausente: a migração 009 ainda não rodou neste banco. */
export function isMissingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === '42P01' || /relation .*platform_admins.* does not exist/i.test(error.message ?? '');
}

export const getPlatformSession = cache(async (): Promise<PlatformSession | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('platform_admins')
    .select('user_id, email')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data) return null;
  const row = data as { user_id: string; email: string };
  return { userId: row.user_id, email: row.email };
});

/** Guarda das páginas do painel da plataforma. */
export async function requirePlatformAdmin(): Promise<PlatformSession> {
  const user = await getUser();
  if (!user) redirect('/login?next=/plataforma');

  const session = await getPlatformSession();
  // Logado, mas sem acesso: vai para o painel do provedor. Devolver 403 aqui
  // contaria que a rota existe para quem só errou o endereço.
  if (!session) redirect('/admin');
  return session;
}

/** Guarda das rotas de API do painel da plataforma. */
export async function requirePlatformApi(): Promise<
  { error: NextResponse; session?: undefined } | { error?: undefined; session: PlatformSession }
> {
  const user = await getUser();
  if (!user) return { error: new NextResponse('Unauthorized', { status: 401 }) };

  const session = await getPlatformSession();
  if (!session) return { error: new NextResponse('Forbidden', { status: 403 }) };
  return { session };
}

/** Existe algum super administrador cadastrado? Usado para detectar a migração pendente. */
export async function platformTablesReady(): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('platform_admins').select('user_id').limit(1);
  return !isMissingTable(error as { code?: string; message?: string } | null);
}
