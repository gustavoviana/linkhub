import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformApi } from '@/lib/auth/platform';
import { removeDomain, tenantDomain } from '@/lib/vercel/domains';
import type { Tenant } from '@/lib/supabase/types';

// Situação do provedor e condições da assinatura.
//
// Suspender aqui é o botão que corta o acesso de quem não pagou: o status do
// tenant é o que o portal e o painel consultam.

const BODY = z.object({
  status: z.enum(['active', 'trial', 'suspended', 'cancelled']).optional(),
  billing: z
    .object({
      monthly_amount_cents: z.number().int().min(0).max(100_000_00).optional(),
      billing_day: z.number().int().min(1).max(28).optional(),
      status: z.enum(['trial', 'active', 'past_due', 'cancelled']).optional(),
      trial_ends_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      started_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      notes: z.string().trim().max(1000).nullable().optional(),
    })
    .optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requirePlatformApi();
  if (auth.error) return auth.error;

  const parsed = BODY.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('id', id).maybeSingle();
  if (!tenant) return NextResponse.json({ error: 'Provedor não encontrado' }, { status: 404 });

  if (parsed.data.status) {
    const { error } = await supabase.from('tenants').update({ status: parsed.data.status } as never).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  }

  if (parsed.data.billing) {
    const { error } = await supabase
      .from('tenant_billing')
      .upsert({ tenant_id: id, ...parsed.data.billing } as never, { onConflict: 'tenant_id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  }

  await supabase.from('audit_log').insert({
    tenant_id: id,
    actor_user_id: auth.session.userId,
    action: 'platform.tenant_updated',
    resource_type: 'tenant',
    resource_id: id,
    metadata: parsed.data,
  } as never);

  return NextResponse.json({ ok: true });
}

/**
 * Exclusão do provedor. Não tem volta.
 *
 * O banco apaga em cascata: assinantes, contratos, faturas, chamados, planos,
 * a ficha do app e a chave que assina os aplicativos publicados. Por isso a
 * confirmação não é um "tem certeza?" — quem exclui precisa digitar o endereço
 * do provedor. Diálogo de sim/não vira reflexo depois do terceiro clique;
 * digitar o nome obriga a olhar para qual provedor está na tela.
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requirePlatformApi();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const confirmacao = typeof body?.confirm === 'string' ? body.confirm.trim().toLowerCase() : '';

  const supabase = createAdminClient();
  const { data } = await supabase.from('tenants').select('*').eq('id', id).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Provedor não encontrado' }, { status: 404 });
  const tenant = data as unknown as Tenant;

  if (confirmacao !== tenant.slug.toLowerCase()) {
    return NextResponse.json(
      { error: `Para excluir, digite o endereço do provedor: ${tenant.slug}` },
      { status: 400 },
    );
  }

  // O que sai junto, guardado antes de sumir: sem isto o registro de auditoria
  // não diz o tamanho do estrago.
  const [{ count: assinantes }, { count: faturas }] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
  ]);

  // Auditoria antes da exclusão: a linha tem tenant_id com FK em cascata, e
  // gravada depois ela seria apagada junto com o provedor.
  await supabase.from('audit_log').insert({
    actor_user_id: auth.session.userId,
    action: 'platform.tenant_deleted',
    resource_type: 'tenant',
    resource_id: id,
    metadata: {
      slug: tenant.slug,
      name: tenant.name,
      custom_domain: tenant.custom_domain,
      assinantes: assinantes ?? 0,
      faturas: faturas ?? 0,
    },
  } as never);

  // Domínios saem do projeto na Vercel. Falhar aqui não impede a exclusão:
  // sobra um alias órfão, que é problema bem menor do que provedor pela metade.
  await removeDomain(tenantDomain(tenant.slug)).catch(() => null);
  if (tenant.custom_domain) await removeDomain(tenant.custom_domain).catch(() => null);

  const { error } = await supabase.from('tenants').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ ok: true, slug: tenant.slug });
}
