import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTenantApi } from '@/lib/auth/api-guard';
import { documentVariants } from '@/lib/documento';
import { enviar, pushConfigurado, type Aparelho } from '@/lib/push/send';
import { DESTINOS, TEXTO_MAX, TITULO_MAX, preencher } from '@/lib/push/text';

// "Enviar teste": a notificação vai na hora para os aparelhos de um CPF, com
// os dados reais da próxima fatura em aberto dele. Não entra no histórico nem
// conta como aviso dado — a regra continua valendo para aquela fatura.

const BODY = z.object({
  cpf: z.string().trim().min(11, 'Informe o CPF ou CNPJ'),
  title: z.string().trim().min(1).max(TITULO_MAX),
  body: z.string().trim().min(1).max(TEXTO_MAX),
  /** Ausente = aviso de fatura (o toque abre a fatura). */
  url: z.enum(DESTINOS.map((d) => d.url) as [string, ...string[]]).optional(),
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
  const { cpf, title, body, url } = parsed.data;
  const admin = auth.admin;

  const { data: cliente } = await admin
    .from('customers')
    .select('id, name')
    .eq('tenant_id', id)
    .in('cpf_cnpj', documentVariants(cpf))
    .maybeSingle();
  if (!cliente) return NextResponse.json({ error: 'Nenhum assinante com esse CPF entrou na central.' }, { status: 404 });
  const { id: clienteId, name } = cliente as { id: string; name: string | null };

  const { data: aparelhos } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('customer_id', clienteId);
  if (!aparelhos?.length) {
    return NextResponse.json(
      { error: 'Esse assinante ainda não ativou os avisos em nenhum aparelho.' },
      { status: 404 },
    );
  }

  // A fatura mais próxima em aberto, para o teste mostrar {valor} e
  // {vencimento} de verdade — e abrir uma fatura que existe.
  const { data: contratos } = await admin.from('contracts').select('id').eq('customer_id', clienteId);
  const { data: fatura } = await admin
    .from('invoices')
    .select('id, amount_cents, due_date')
    .in('contract_id', ((contratos ?? []) as { id: string }[]).map((c) => c.id))
    .in('status', ['open', 'overdue', 'partial'])
    .order('due_date')
    .limit(1)
    .maybeSingle();
  const f = fatura as { id: string; amount_cents: number; due_date: string } | null;

  const dados = { nome: name, valorCents: f?.amount_cents, vencimento: f?.due_date };
  const destino = url ?? (f ? `/fatura/${f.id}` : '/fatura');

  let enviados = 0;
  for (const a of aparelhos as Aparelho[]) {
    const { resultado } = await enviar(admin, a, {
      title: preencher(title, dados),
      body: preencher(body, dados),
      url: destino,
    });
    if (resultado === 'sent') enviados++;
  }

  if (!enviados) {
    return NextResponse.json({ error: 'O aparelho não aceitou o envio. Peça para ativar os avisos de novo.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, enviados });
}
