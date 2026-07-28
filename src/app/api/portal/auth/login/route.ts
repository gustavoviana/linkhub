import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { getAdapterForTenant } from '@/lib/erp';
import { documentVariants, isValidDocument, onlyDigits } from '@/lib/documento';
import { clientIp, rateLimit, rateLimitReset } from '@/lib/rate-limit';
import type { Customer } from '@/lib/supabase/types';

// Fluxo de login do cliente final:
//
// 1. Cliente entra com o CPF. Senha só é pedida se o provedor exigir
//    (tenants.portal_require_password) — o padrão das centrais brasileiras é
//    identificar o assinante apenas pelo CPF.
// 2. Buscamos o customer no DB (por tenant + CPF). Se não existe:
//    a. Buscamos no ERP. Se também não, 404.
//    b. Criamos o customer com os dados do ERP.
// 3. A identidade no Auth é derivada do CPF, nunca do e-mail do cadastro.
// 4. Com senha: signInWithPassword. Sem senha: sessão emitida pelo servidor
//    via link mágico gerado pela service key — o navegador nunca recebe um
//    segredo reutilizável.
//
// Sintético: o e-mail no Auth é `cliente-<slug>-<cpf>@linkhub.local`, nunca
// enviado para ninguém; serve só como identificador único.

type ServerClient = Awaited<ReturnType<typeof createClient>>;
type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Emite a sessão sem senha. O token do link mágico é gerado com a service
 * key e consumido aqui mesmo, no servidor — nunca chega ao navegador nem é
 * enviado por e-mail. O cliente sai com o cookie de sessão normal.
 */
async function signInWithoutPassword(
  sb: ServerClient,
  admin: AdminClient,
  email: string,
): Promise<string | null> {
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  const tokenHash = link?.properties?.hashed_token;

  if (!linkErr && tokenHash) {
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    if (!error) return null;
  }

  // Plano B: rotaciona a senha para um valor aleatório e entra com ele. O
  // valor morre nesta função. Cobre projetos onde o link mágico está
  // desabilitado nas configurações de Auth.
  const temporary = crypto.randomBytes(24).toString('base64url');
  const { data: found } = await admin.auth.admin.generateLink({ type: 'recovery', email });
  const userId = found?.user?.id;
  if (!userId) return 'Não foi possível iniciar a sessão.';

  const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password: temporary });
  if (updErr) return updErr.message;

  const { error: signErr } = await sb.auth.signInWithPassword({ email, password: temporary });
  return signErr ? signErr.message : null;
}

export async function POST(req: NextRequest) {
  const { cpf, password, tenant_id } = await req.json();
  if (!cpf || !tenant_id) {
    return new NextResponse('Campos faltando', { status: 400 });
  }

  // Aceita como o assinante mandar: com ponto, sem ponto, com espaço. O que
  // guardamos e comparamos são sempre os dígitos. CNPJ entra junto porque
  // provedor tem cliente pessoa jurídica, e é o mesmo campo no ERP.
  const cpfClean = onlyDigits(String(cpf));
  if (cpfClean.length !== 11 && cpfClean.length !== 14) {
    return new NextResponse('Digite os 11 números do CPF (ou 14, se for CNPJ).', { status: 400 });
  }
  if (!isValidDocument(cpfClean)) {
    return new NextResponse(
      cpfClean.length === 14
        ? 'CNPJ inválido. Confira os números e tente de novo.'
        : 'CPF inválido. Confira os números e tente de novo.',
      { status: 400 },
    );
  }

  const ip = clientIp(req.headers);

  // Dois freios. O primeiro é por assinante: sem ele dá para varrer senha de
  // um CPF à vontade. O segundo é por origem: no modo só-CPF o ataque não é
  // adivinhar senha, é varrer CPFs — e esse teto é o que corta isso.
  const limitKey = `portal-login:${tenant_id}:${cpfClean}:${ip}`;
  const limit = rateLimit(limitKey, 8, 5 * 60_000);
  const scanKey = `portal-scan:${tenant_id}:${ip}`;
  const scan = rateLimit(scanKey, 30, 10 * 60_000);
  if (!limit.allowed || !scan.allowed) {
    const wait = Math.max(limit.retryAfterSeconds, scan.retryAfterSeconds);
    return new NextResponse(
      `Muitas tentativas. Espere ${Math.ceil(wait / 60)} minuto(s) e tente de novo.`,
      { status: 429, headers: { 'Retry-After': String(wait) } },
    );
  }

  const admin = createAdminClient();

  const { data: tenantData } = await admin.from('tenants').select('*').eq('id', tenant_id).single();
  const tenant = asTenantOrNull(tenantData);
  if (!tenant) return new NextResponse('Provedor não encontrado', { status: 404 });

  // Coluna ausente (banco ainda sem a migração 005) cai no padrão: só CPF.
  const requirePassword = tenant.portal_require_password === true;
  if (requirePassword && !password) {
    return new NextResponse('Informe sua senha para entrar.', { status: 400 });
  }

  // 1. Já existe no DB?
  // Guardamos só os dígitos, mas cadastros antigos (ou vindos de uma
  // sincronização) podem estar formatados. Procura as duas escritas.
  const { data: existingRows } = await admin
    .from('customers')
    .select('*')
    .eq('tenant_id', tenant_id)
    .in('cpf_cnpj', documentVariants(cpfClean))
    .limit(1);
  let customer = (existingRows?.[0] ?? null) as Customer | null;

  // 2. Não → busca no ERP e materializa.
  if (!customer) {
    const adapter = getAdapterForTenant(tenant);
    const erpCustomer = await adapter.findCustomerByCpf(cpfClean);
    if (!erpCustomer) {
      return new NextResponse('Cliente não encontrado. Verifique seu CPF.', { status: 404 });
    }

    const insertPayload: Record<string, unknown> = {
      tenant_id,
      external_id: erpCustomer.externalId,
      cpf_cnpj: cpfClean,
      name: erpCustomer.name,
      email: erpCustomer.email ?? null,
      phone: erpCustomer.phone ?? null,
      whatsapp: erpCustomer.whatsapp ?? null,
      address_street: erpCustomer.address?.street,
      address_number: erpCustomer.address?.number,
      address_district: erpCustomer.address?.district,
      address_city: erpCustomer.address?.city,
      address_state: erpCustomer.address?.state,
      address_zip: erpCustomer.address?.zip,
      last_synced_at: new Date().toISOString(),
    };
    const { data: inserted, error: insertErr } = await admin
      .from('customers')
      .insert(insertPayload as never)
      .select('*')
      .single();
    if (insertErr) return new NextResponse(insertErr.message, { status: 500 });
    customer = inserted as Customer;
  }

  // 3. Vincula auth.user.
  //
  // A identidade no Auth é derivada do CPF, nunca do e-mail do cadastro: dois
  // assinantes podem compartilhar o mesmo e-mail (família, ou o provedor que
  // cadastrou o próprio contato em todo mundo), e aí o segundo acesso batia em
  // "e-mail já registrado" e ninguém entrava.
  let authEmail = `cliente-${tenant.slug}-${cpfClean}@linkhub.local`;

  const sb = await createClient();

  if (!customer.user_id) {
    // Primeiro acesso: cria o usuário no Supabase. No modo só-CPF a senha é
    // aleatória e descartada — ninguém precisa dela, o acesso é pelo CPF.
    const { data: created } = await admin.auth.admin.createUser({
      email: authEmail,
      password: requirePassword ? password : crypto.randomBytes(24).toString('base64url'),
      email_confirm: true,
      user_metadata: { tenant_id, customer_id: customer.id, cpf: cpfClean },
    });

    let userId = created?.user?.id ?? null;
    if (!userId) {
      // O acesso já existia sem vínculo no cadastro — acontece quando o
      // cliente é removido e volta numa ressincronização do ERP. Reaproveitar
      // é o certo: antes o Supabase devolvia "already been registered" em
      // inglês na cara do assinante e ele não entrava nunca mais.
      const { data: existing } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: authEmail,
      });
      userId = existing?.user?.id ?? null;
    }
    if (!userId) {
      return new NextResponse('Não foi possível liberar seu acesso. Fale com o provedor.', { status: 500 });
    }

    await (admin.from('customers').update({ user_id: userId } as never)).eq('id', customer.id);
    customer.user_id = userId;
  } else {
    // Já existe vínculo: usa o e-mail real do usuário, que pode ter sido
    // criado por uma regra anterior à desta versão.
    const { data: linked } = await admin.auth.admin.getUserById(customer.user_id);
    if (linked?.user?.email) authEmail = linked.user.email;
  }

  // 4. Sessão.
  if (requirePassword) {
    const { error: loginErr } = await sb.auth.signInWithPassword({ email: authEmail, password });
    if (loginErr) return new NextResponse('CPF ou senha incorretos', { status: 401 });
  } else {
    const err = await signInWithoutPassword(sb, admin, authEmail);
    if (err) return new NextResponse(err, { status: 500 });
  }

  rateLimitReset(limitKey);

  await admin.from('audit_log').insert({
    tenant_id,
    actor_user_id: customer.user_id,
    action: 'portal.login',
    resource_type: 'customer',
    resource_id: customer.id,
    metadata: { mode: requirePassword ? 'cpf_senha' : 'cpf', ip },
  } as never);

  return NextResponse.json({ ok: true });
}
