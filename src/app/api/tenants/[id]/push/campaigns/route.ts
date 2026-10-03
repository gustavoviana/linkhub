import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTenantApi } from '@/lib/auth/api-guard';
import { enviarCampanha } from '@/lib/push/dispatch';
import { pushConfigurado } from '@/lib/push/send';
import { DESTINOS, TEXTO_MAX, TITULO_MAX } from '@/lib/push/text';

// Mensagem manual para todos os aparelhos do provedor, agora ou agendada.
//
// "Agora" sai dentro deste pedido — o provedor quer ver o "enviado para N"
// na hora, não esperar o próximo quarto de hora. Agendada fica na fila do
// /api/cron/push.

export const maxDuration = 60;

const BODY = z.object({
  title: z.string().trim().min(1, 'Escreva o título').max(TITULO_MAX),
  body: z.string().trim().min(1, 'Escreva o texto').max(TEXTO_MAX),
  url: z.enum(DESTINOS.map((d) => d.url) as [string, ...string[]]),
  /** ISO. Ausente = agora. */
  scheduled_at: z.string().datetime({ offset: true }).optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireTenantApi(id, 'admin');
  if (auth.error) return auth.error;
  if (!pushConfigurado()) {
    return NextResponse.json({ error: 'O envio de notificações ainda não está configurado.' }, { status: 503 });
  }

  const parsed = BODY.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 });
  }
  const { title, body, url, scheduled_at } = parsed.data;

  const quando = scheduled_at ? new Date(scheduled_at) : new Date();
  const agendada = quando.getTime() > Date.now() + 60_000;
  if (scheduled_at && !agendada && quando.getTime() < Date.now() - 60_000) {
    return NextResponse.json({ error: 'Esse horário já passou.' }, { status: 400 });
  }

  const { data, error } = await auth.admin
    .from('push_campaigns')
    .insert({
      tenant_id: id,
      kind: 'manual',
      title,
      body,
      url,
      status: 'scheduled',
      scheduled_at: agendada ? quando.toISOString() : new Date().toISOString(),
      created_by: auth.userId,
    } as never)
    .select('id')
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Falha ao criar' }, { status: 500 });
  const campanhaId = (data as { id: string }).id;

  await auth.admin.from('audit_log').insert({
    tenant_id: id,
    actor_user_id: auth.userId,
    action: agendada ? 'tenant.push_scheduled' : 'tenant.push_sent',
    resource_type: 'push_campaign',
    resource_id: campanhaId,
    metadata: { by: auth.email, title, scheduled_at: agendada ? quando.toISOString() : null },
  } as never);

  if (agendada) return NextResponse.json({ ok: true, agendada: true });
  const r = await enviarCampanha(auth.admin, campanhaId);
  return NextResponse.json({ ok: true, agendada: false, enviados: r?.enviados ?? 0, falhas: r?.falhas ?? 0 });
}
