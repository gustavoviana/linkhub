import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTenantApi } from '@/lib/auth/api-guard';
import { seal } from '@/lib/tenant/secret-box';
import { tabelaDoChatAusente, tokenDoChat } from '@/lib/chat/config';
import { dicaDoToken, pedirLinkDoChat, tokenFiberdeskValido } from '@/lib/chat/fiberdesk';

// Chat de atendimento do provedor: guardar o token, ligar/desligar, testar.
//
// O token entra por aqui e não volta nunca: a tela recebe só a dica
// ("fdapp_a1b2…"). Trocar é colar outro por cima.

const MIGRACAO =
  'O banco ainda não tem a tabela tenant_chat. Rode a migração 20261016_013 no SQL Editor do Supabase.';

const PUT_BODY = z.object({
  api_key: z.string().trim().max(200).optional(),
  enabled: z.boolean().optional(),
});

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireTenantApi(id, 'admin');
  if (auth.error) return auth.error;
  const { admin } = auth;

  const parsed = PUT_BODY.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return new NextResponse('Dados inválidos', { status: 400 });
  const { api_key, enabled } = parsed.data;

  if (api_key && !tokenFiberdeskValido(api_key)) {
    return new NextResponse('Esse não parece um token do FiberDesk. Ele começa com fdapp_ e é bem longo.', {
      status: 400,
    });
  }

  const { data: atual, error: erroLeitura } = await admin
    .from('tenant_chat' as never)
    .select('tenant_id')
    .eq('tenant_id', id)
    .maybeSingle();
  if (erroLeitura) {
    if (tabelaDoChatAusente(erroLeitura)) return new NextResponse(MIGRACAO, { status: 409 });
    return new NextResponse(erroLeitura.message, { status: 500 });
  }
  if (!atual && !api_key) return new NextResponse('Cole o token gerado no FiberDesk.', { status: 400 });

  const mudanca: Record<string, unknown> = { tenant_id: id, provider: 'fiberdesk' };
  if (api_key) {
    mudanca.api_key = seal(api_key);
    mudanca.key_hint = dicaDoToken(api_key);
  }
  // Token novo liga o chat, a menos que tenham pedido o contrário: colar o
  // token e o botão não aparecer seria a primeira pergunta no suporte.
  if (enabled !== undefined) mudanca.enabled = enabled;
  else if (api_key) mudanca.enabled = true;

  const { error } = atual
    ? await admin.from('tenant_chat' as never).update(mudanca as never).eq('tenant_id', id)
    : await admin.from('tenant_chat' as never).insert(mudanca as never);
  if (error) return new NextResponse(error.message, { status: 500 });

  await admin.from('audit_log').insert({
    tenant_id: id,
    actor_user_id: auth.userId,
    action: api_key ? 'chat.key_saved' : 'chat.updated',
    resource_type: 'tenant_chat',
    resource_id: id,
    metadata: { enabled: mudanca.enabled ?? null, hint: mudanca.key_hint ?? null },
  } as never);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireTenantApi(id, 'admin');
  if (auth.error) return auth.error;
  const { admin } = auth;

  const { error } = await admin.from('tenant_chat' as never).delete().eq('tenant_id', id);
  if (error) {
    if (tabelaDoChatAusente(error)) return new NextResponse(MIGRACAO, { status: 409 });
    return new NextResponse(error.message, { status: 500 });
  }

  await admin.from('audit_log').insert({
    tenant_id: id,
    actor_user_id: auth.userId,
    action: 'chat.key_removed',
    resource_type: 'tenant_chat',
    resource_id: id,
    metadata: {},
  } as never);

  return NextResponse.json({ ok: true });
}

/**
 * Teste de ponta a ponta com o token salvo.
 *
 * Pede um link de verdade para o CPF informado. O FiberDesk valida o corpo
 * antes da chave e cria o contato quando ele não existe — por isso o teste
 * usa o CPF de uma pessoa real (o do próprio provedor serve), e não um
 * "000.000.000-00" que viraria contato fantasma no inbox.
 */
const POST_BODY = z.object({ cpf_cnpj: z.string().trim().min(11).max(20) });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireTenantApi(id, 'admin');
  if (auth.error) return auth.error;

  const parsed = POST_BODY.safeParse(await req.json().catch(() => ({})));
  const doc = parsed.success ? parsed.data.cpf_cnpj.replace(/\D/g, '') : '';
  if (doc.length !== 11 && doc.length !== 14) {
    return new NextResponse('Informe um CPF ou CNPJ completo para o teste.', { status: 400 });
  }

  let token: string | null;
  try {
    token = await tokenDoChat(id);
  } catch (e) {
    return new NextResponse((e as Error).message, { status: 500 });
  }
  if (!token) return new NextResponse('Salve o token e deixe o chat ligado antes de testar.', { status: 400 });

  const link = await pedirLinkDoChat(token, { cpfCnpj: doc });
  if (!link.ok) return new NextResponse(link.motivo, { status: link.status === 401 ? 400 : 502 });
  return NextResponse.json({ url: link.url, expiresAt: link.expiresAt });
}
