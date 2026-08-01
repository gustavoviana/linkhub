import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { requireTenantOwner } from '@/lib/auth/api-guard';
import { addDomain, getDomainStatus, removeDomain, tenantDomain } from '@/lib/vercel/domains';

// Provisionamento de domínio do provedor.
//
// POST  → registra o subdomínio (e o domínio próprio, se enviado) na Vercel
// GET   → estado atual: apontamento do DNS, verificação e certificado
// DELETE→ remove o domínio próprio

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireTenantOwner(id);
  if (auth.error) return auth.error;

  const { data } = await auth.admin.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) return new NextResponse('Not found', { status: 404 });

  const sub = await getDomainStatus(tenantDomain(tenant.slug));
  const custom = tenant.custom_domain ? await getDomainStatus(tenant.custom_domain) : null;

  // É aqui, no "Conferir apontamento" da tela, que o domínio próprio
  // finalmente vira verificado no cadastro.
  if (custom?.state === 'ready' && !tenant.custom_domain_verified) {
    await auth.admin.from('tenants').update({ custom_domain_verified: true } as never).eq('id', id);
  } else if (custom && custom.state !== 'ready' && tenant.custom_domain_verified) {
    // Caiu: DNS removido ou certificado vencido. Deixar marcado como
    // verificado esconderia a queda de quem precisa agir.
    await auth.admin.from('tenants').update({ custom_domain_verified: false } as never).eq('id', id);
  }

  return NextResponse.json({ subdomain: sub, custom });
}

const BODY = z.object({
  custom_domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/, 'Domínio inválido')
    .optional()
    .nullable(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireTenantOwner(id);
  if (auth.error) return auth.error;
  const admin = auth.admin;

  const { data } = await admin.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) return new NextResponse('Not found', { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = BODY.safeParse(body);
  if (!parsed.success) {
    return new NextResponse(parsed.error.issues[0]?.message ?? 'Dados inválidos', { status: 400 });
  }

  // 1. Subdomínio do provedor — sempre.
  const subdomain = await addDomain(tenantDomain(tenant.slug));

  // 2. Domínio próprio, quando informado.
  let custom = null;
  const wanted = parsed.data.custom_domain?.trim() || null;
  if (wanted && wanted !== tenant.custom_domain) {
    // Trocou o nome (corrigiu uma letra, por exemplo): o anterior sai do
    // projeto. Sem isso ele fica de alias órfão na Vercel para sempre.
    if (tenant.custom_domain) await removeDomain(tenant.custom_domain);
    custom = await addDomain(wanted);
    await admin
      .from('tenants')
      .update({
        custom_domain: wanted,
        custom_domain_verified: custom.state === 'ready',
      } as never)
      .eq('id', id);
  } else if (tenant.custom_domain) {
    custom = await getDomainStatus(tenant.custom_domain);
    if (custom.state === 'ready' && !tenant.custom_domain_verified) {
      await admin.from('tenants').update({ custom_domain_verified: true } as never).eq('id', id);
    }
  }

  await admin.from('audit_log').insert({
    tenant_id: id,
    actor_user_id: auth.userId,
    action: 'tenant.domain_provisioned',
    resource_type: 'tenant',
    resource_id: id,
    metadata: { subdomain: subdomain.state, custom: custom?.state ?? null },
  } as never);

  return NextResponse.json({ subdomain, custom });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireTenantOwner(id);
  if (auth.error) return auth.error;
  const admin = auth.admin;

  const { data } = await admin.from('tenants').select('custom_domain').eq('id', id).single();
  const current = (data as { custom_domain?: string | null } | null)?.custom_domain;
  if (current) await removeDomain(current);

  await admin
    .from('tenants')
    .update({ custom_domain: null, custom_domain_verified: false } as never)
    .eq('id', id);

  return NextResponse.json({ ok: true });
}
