import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformApi } from '@/lib/auth/platform';
import { gerarSenha } from '@/lib/platform/password';
import { addDomain, tenantDomain } from '@/lib/vercel/domains';
import type { Tenant } from '@/lib/supabase/types';

// Criação de provedor pelo super administrador.
//
// Não usa a RPC `create_tenant_with_owner`: aquela vincula quem chamou como
// dono, e aqui quem chama é o super admin, que não deve virar administrador do
// provedor. Aqui o dono é o e-mail do cliente, com um usuário novo e senha
// gerada — que aparece uma vez só na tela e nunca mais.

const SLUGS_RESERVADOS = new Set([
  'www', 'admin', 'app', 'portal', 'api', 'auth', 'login', 'signup',
  'dashboard', 'assets', 'static', 'plataforma', 'super',
]);

const BODY = z.object({
  name: z.string().trim().min(2, 'Informe o nome do provedor').max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,40}$/, 'Endereço inválido: use letras, números e hífen'),
  legal_name: z.string().trim().max(120).optional().nullable(),
  cnpj: z.string().trim().max(20).optional().nullable(),
  owner_email: z.string().trim().toLowerCase().email('E-mail do responsável inválido'),
  monthly_amount_cents: z.number().int().min(0).max(100_000_00).default(0),
  billing_day: z.number().int().min(1).max(28).default(10),
});

export async function POST(req: NextRequest) {
  const auth = await requirePlatformApi();
  if (auth.error) return auth.error;

  const parsed = BODY.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 });
  }
  const body = parsed.data;

  if (SLUGS_RESERVADOS.has(body.slug)) {
    return NextResponse.json({ error: `O endereço "${body.slug}" é reservado.` }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: existente } = await supabase.from('tenants').select('id').eq('slug', body.slug).maybeSingle();
  if (existente) {
    return NextResponse.json({ error: `Já existe um provedor no endereço "${body.slug}".` }, { status: 409 });
  }

  // 1. Usuário do responsável. Se o e-mail já tem conta, reaproveita: pode ser
  // um cliente que já administra outro provedor.
  const senha = gerarSenha();
  let userId: string | null = null;
  let senhaGerada: string | null = senha;

  const { data: criado, error: erroUsuario } = await supabase.auth.admin.createUser({
    email: body.owner_email,
    password: senha,
    email_confirm: true,
  });

  if (criado?.user) {
    userId = criado.user.id;
  } else {
    const jaExiste = /already|registered|exists/i.test(erroUsuario?.message ?? '');
    if (!jaExiste) {
      return NextResponse.json(
        { error: erroUsuario?.message ?? 'Não foi possível criar o usuário do responsável.' },
        { status: 502 },
      );
    }
    // E-mail conhecido: mantém a senha atual dele e avisa a tela.
    const { data: lista } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    userId = lista?.users.find((u) => u.email?.toLowerCase() === body.owner_email)?.id ?? null;
    senhaGerada = null;
    if (!userId) {
      return NextResponse.json({ error: 'E-mail já cadastrado, mas não foi possível localizá-lo.' }, { status: 502 });
    }
  }

  // 2. Provedor.
  const { data: tenantRow, error: erroTenant } = await supabase
    .from('tenants')
    .insert({
      slug: body.slug,
      name: body.name,
      legal_name: body.legal_name || null,
      cnpj: body.cnpj || null,
      status: 'trial',
    } as never)
    .select()
    .single();

  if (erroTenant || !tenantRow) {
    return NextResponse.json({ error: erroTenant?.message ?? 'Não foi possível criar o provedor.' }, { status: 502 });
  }
  const tenant = tenantRow as unknown as Tenant;

  // 3. Vínculo do responsável como dono.
  await supabase.from('tenant_admins').insert({
    tenant_id: tenant.id,
    user_id: userId,
    role: 'owner',
    accepted_at: new Date().toISOString(),
  } as never);

  // 4. Assinatura.
  await supabase.from('tenant_billing').insert({
    tenant_id: tenant.id,
    monthly_amount_cents: body.monthly_amount_cents,
    billing_day: body.billing_day,
    status: 'trial',
  } as never);

  await supabase.from('audit_log').insert({
    tenant_id: tenant.id,
    actor_user_id: auth.session.userId,
    action: 'platform.tenant_created',
    resource_type: 'tenant',
    resource_id: tenant.id,
    metadata: { slug: tenant.slug, owner_email: body.owner_email },
  } as never);

  // 5. Subdomínio na Vercel. Falhar aqui não desfaz o provedor: dá para
  // provisionar depois pela aba Domínio, e desfazer seria pior.
  const domain = await addDomain(tenantDomain(tenant.slug)).catch(() => null);

  return NextResponse.json({
    tenant,
    owner: { email: body.owner_email, password: senhaGerada },
    domain: domain?.state ?? null,
  });
}
