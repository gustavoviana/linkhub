import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getPortalSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { PUSH_COOKIE } from '@/lib/push/text';

// Inscrição do aparelho do assinante nos avisos.
//
// O assinante vem da sessão, nunca do corpo: ninguém inscreve o aparelho no
// nome de outro. O endpoint é único — se outra pessoa entrar no mesmo
// celular e ativar os avisos, a linha passa a ser dela.
//
// O id da inscrição fica num cookie httpOnly. É por ele que o /auth/logout
// tira o aparelho da lista: quem sai da conta num celular compartilhado não
// pode continuar recebendo a fatura no aparelho de outra pessoa.

export const dynamic = 'force-dynamic';

const BODY = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export async function POST(req: NextRequest) {
  const sessao = await getPortalSession().catch(() => null);
  if (!sessao?.customer) return new NextResponse('Unauthorized', { status: 401 });

  const parsed = BODY.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return new NextResponse('Inscrição inválida', { status: 400 });

  const { data, error } = await createAdminClient()
    .from('push_subscriptions')
    .upsert(
      {
        tenant_id: sessao.tenant.id,
        customer_id: sessao.customer.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
      } as never,
      { onConflict: 'endpoint' },
    )
    .select('id')
    .single();
  if (error || !data) return new NextResponse('Não foi possível ativar', { status: 500 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(PUSH_COOKIE, (data as { id: string }).id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 400,
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  const sessao = await getPortalSession().catch(() => null);
  if (!sessao?.customer) return new NextResponse('Unauthorized', { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (body.endpoint) {
    await createAdminClient()
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', body.endpoint)
      .eq('customer_id', sessao.customer.id);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(PUSH_COOKIE);
  return res;
}
