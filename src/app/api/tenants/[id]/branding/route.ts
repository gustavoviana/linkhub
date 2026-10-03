import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTenantApi } from '@/lib/auth/api-guard';

// Gravação de "Marca & visual".
//
// Antes era um UPDATE do navegador via RLS. Passou para o servidor pelo mesmo
// motivo do upload de imagens: o super administrador não está em
// tenant_admins. A gravação aqui é com service role, que o trigger
// trg_tenants_protect deixa passar — por isso o schema abaixo é a lista
// fechada do que este formulário pode tocar. Slug, status, domínio e ERP
// ficam de fora.

const url = z.string().trim().url().max(1000).nullable();
const texto = (max: number) => z.string().trim().max(max).nullable();
const cor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const BODY = z.object({
  name: z.string().trim().min(1).max(120),
  primary_color: cor,
  accent_color: cor,
  dark_mode_default: z.boolean(),
  layout: z.enum(['v1', 'v2', 'v3']),
  logo_url: url,
  logo_dark_url: url,
  login_image_url: url,
  login_headline: texto(120),
  login_subtitle: texto(240),
  favicon_url: url,
  support_phone: texto(40),
  support_whatsapp: texto(40),
  support_email: z.string().trim().email().max(160).nullable(),
});

/** Colunas que dependem de migração ainda não aplicada em todo banco. */
const COLUNAS_NOVAS = ['logo_dark_url', 'login_image_url', 'login_headline', 'login_subtitle'] as const;

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireTenantApi(id, 'admin');
  if (auth.error) return auth.error;

  const parsed = BODY.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `Campo inválido em "${first.path.join('.')}": ${first.message}` },
      { status: 400 },
    );
  }

  const update: Record<string, unknown> = { ...parsed.data };
  let { error } = await auth.admin.from('tenants').update(update as never).eq('id', id);

  // Banco ainda sem as migrações 007/008: em vez de perder o que o provedor
  // acabou de ajustar, salva o resto e diz o que ficou de fora.
  const faltando = COLUNAS_NOVAS.filter((c) => error?.message.includes(c));
  if (faltando.length) {
    for (const c of COLUNAS_NOVAS) delete update[c];
    ({ error } = await auth.admin.from('tenants').update(update as never).eq('id', id));
    if (!error) return NextResponse.json({ ok: true, parcial: true });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await auth.admin.from('audit_log').insert({
    tenant_id: id,
    actor_user_id: auth.userId,
    action: 'tenant.branding_updated',
    resource_type: 'tenant',
    resource_id: id,
    metadata: { by: auth.email },
  } as never);

  return NextResponse.json({ ok: true });
}
