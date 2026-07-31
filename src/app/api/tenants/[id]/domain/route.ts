import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { addDomain, getDomainStatus, removeDomain, tenantDomain } from '@/lib/vercel/domains';

// Provisionamento de domínio do provedor.
//
// POST  → registra o subdomínio (e o domínio próprio, se enviado) na Vercel
// GET   → estado atual, com os registros DNS pendentes
// DELETE→ remove o domínio próprio

async function requireOwner(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new NextResponse('Unauthorized', { status: 401 }) };

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from('tenant_admins')
    .select('role')
    .eq('tenant_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  const role = (membership as { role?: string } | null)?.role;
  if (role !== 'owner' && role !== 'admin') {
    return { error: new NextResponse('Forbidden', { status: 403 }) };
  }
  return { admin, user };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireOwner(id);
  if ('error' in auth) return auth.error;

  const { data } = await auth.admin!.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) return new NextResponse('Not found', { status: 404 });

  const sub = await getDomainStatus(tenantDomain(tenant.slug));
  const custom = tenant.custom_domain ? await getDomainStatus(tenant.custom_domain) : null;

  // O certificado costuma sair depois do clique em "Provisionar agora"; é aqui,
  // no polling da tela, que o domínio próprio finalmente vira verificado.
  if (custom?.state === 'ready' && !tenant.custom_domain_verified) {
    await auth.admin!.from('tenants').update({ custom_domain_verified: true } as never).eq('id', id);
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
  const auth = await requireOwner(id);
  if ('error' in auth) return auth.error;
  const admin = auth.admin!;

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
    actor_user_id: auth.user!.id,
    action: 'tenant.domain_provisioned',
    resource_type: 'tenant',
    resource_id: id,
    metadata: { subdomain: subdomain.state, custom: custom?.state ?? null },
  } as never);

  return NextResponse.json({ subdomain, custom });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireOwner(id);
  if ('error' in auth) return auth.error;
  const admin = auth.admin!;

  const { data } = await admin.from('tenants').select('custom_domain').eq('id', id).single();
  const current = (data as { custom_domain?: string | null } | null)?.custom_domain;
  if (current) await removeDomain(current);

  await admin
    .from('tenants')
    .update({ custom_domain: null, custom_domain_verified: false } as never)
    .eq('id', id);

  return NextResponse.json({ ok: true });
}
