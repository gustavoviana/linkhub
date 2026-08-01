import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { requireTenantOwner } from '@/lib/auth/api-guard';
import { getDomainStatus, issueCertificate, tenantDomain } from '@/lib/vercel/domains';

// Emissão do certificado SSL, sob demanda.
//
// A Vercel emite sozinha quando o DNS fica correto, mas se o apontamento
// demorou a propagar essa janela já passou e o domínio fica sem cadeado até
// alguém pedir de novo. O botão na tela de Domínio chama aqui.

const BODY = z.object({ domain: z.string().trim().toLowerCase().min(3) });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireTenantOwner(id);
  if (auth.error) return auth.error;

  const { data } = await auth.admin.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) return new NextResponse('Not found', { status: 404 });

  const parsed = BODY.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return new NextResponse('Domínio inválido', { status: 400 });
  const { domain } = parsed.data;

  // Só os domínios deste provedor. Sem esta trava, um administrador de um
  // tenant pediria certificado para o domínio de outro.
  const permitidos = [tenantDomain(tenant.slug), tenant.custom_domain].filter(Boolean);
  if (!permitidos.includes(domain)) {
    return new NextResponse('Este domínio não pertence ao provedor', { status: 403 });
  }

  const result = await issueCertificate(domain);
  const status = await getDomainStatus(domain);

  if (domain === tenant.custom_domain && status.state === 'ready' && !tenant.custom_domain_verified) {
    await auth.admin.from('tenants').update({ custom_domain_verified: true } as never).eq('id', id);
  }

  await auth.admin.from('audit_log').insert({
    tenant_id: id,
    actor_user_id: auth.userId,
    action: 'tenant.certificate_requested',
    resource_type: 'tenant',
    resource_id: id,
    metadata: { domain, ok: result.ok, state: status.state },
  } as never);

  // Pedido recusado mas certificado já no ar: a Vercel emitiu sozinha no meio
  // do caminho, e reclamar disso só confundiria quem clicou.
  if (!result.ok && status.state !== 'ready') {
    return NextResponse.json({ error: result.message, status }, { status: 502 });
  }

  return NextResponse.json({ status });
}
