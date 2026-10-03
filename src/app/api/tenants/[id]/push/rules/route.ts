import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTenantApi } from '@/lib/auth/api-guard';
import { HORA_MAX, HORA_MIN, REGRAS_MAX, TEXTO_MAX, TITULO_MAX } from '@/lib/push/text';

// Regras de aviso de fatura do provedor. A tela manda a lista inteira de uma
// vez — são no máximo dez — e o que sumiu dela foi apagado. O histórico das
// regras apagadas fica: o envio guarda o próprio texto.

const REGRA = z.object({
  id: z.string().uuid().optional(),
  days_offset: z.number().int().min(-30).max(60),
  send_hour: z.number().int().min(HORA_MIN).max(HORA_MAX),
  title: z.string().trim().min(1, 'Título vazio').max(TITULO_MAX),
  body: z.string().trim().min(1, 'Texto vazio').max(TEXTO_MAX),
  enabled: z.boolean(),
});

const BODY = z.object({ rules: z.array(REGRA).max(REGRAS_MAX) });

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireTenantApi(id, 'admin');
  if (auth.error) return auth.error;

  const parsed = BODY.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? 'Dados inválidos' }, { status: 400 });
  }
  const { rules } = parsed.data;
  const admin = auth.admin;

  // Id de outra regra (de outro provedor, inclusive) não entra: só os que
  // já são deste provedor continuam sendo "editar"; o resto vira regra nova.
  const { data: atuais } = await admin.from('push_rules').select('id').eq('tenant_id', id);
  const meus = new Set(((atuais ?? []) as { id: string }[]).map((r) => r.id));
  const mantidos = new Set(rules.map((r) => r.id).filter((x): x is string => !!x && meus.has(x)));

  const apagar = [...meus].filter((x) => !mantidos.has(x));
  if (apagar.length) await admin.from('push_rules').delete().in('id', apagar).eq('tenant_id', id);

  for (const r of rules) {
    const linha = {
      tenant_id: id,
      days_offset: r.days_offset,
      send_hour: r.send_hour,
      title: r.title,
      body: r.body,
      enabled: r.enabled,
    };
    const { error } =
      r.id && mantidos.has(r.id)
        ? await admin.from('push_rules').update(linha as never).eq('id', r.id).eq('tenant_id', id)
        : await admin.from('push_rules').insert(linha as never);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from('audit_log').insert({
    tenant_id: id,
    actor_user_id: auth.userId,
    action: 'tenant.push_rules_updated',
    resource_type: 'tenant',
    resource_id: id,
    metadata: { by: auth.email, ativas: rules.filter((r) => r.enabled).length },
  } as never);

  return NextResponse.json({ ok: true });
}
