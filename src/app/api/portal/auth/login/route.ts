import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { getAdapterForTenant } from '@/lib/erp';
import { isValidCpf } from '@/lib/utils';
import { clientIp, rateLimit, rateLimitReset } from '@/lib/rate-limit';
import type { Customer } from '@/lib/supabase/types';

// Fluxo de login do cliente final:
//
// 1. Cliente entra com CPF + senha.
// 2. Buscamos o customer no DB (por tenant + CPF). Se não existe:
//    a. Buscamos no ERP. Se também não, 404.
//    b. Criamos o customer com os dados do ERP.
// 3. Se customer.user_id existe → tenta auth.signInWithPassword com o
//    e-mail vinculado.
// 4. Se customer.user_id é null → cria o user no Supabase (admin) na 1ª vez,
//    salva user_id no customer e loga.
//
// Sintético: quando o ERP não tem e-mail, geramos um endereço estável
// `cliente-<slug>-<cpf>@linkhub.local` (não verificado, só pra Auth).

export async function POST(req: NextRequest) {
  const { cpf, password, tenant_id } = await req.json();
  if (!cpf || !password || !tenant_id) {
    return new NextResponse('Campos faltando', { status: 400 });
  }

  // Só CPF: é como as centrais dos provedores identificam o assinante, e é o
  // número que o cliente sabe de cor.
  const cpfClean = String(cpf).replace(/\D/g, '');
  if (cpfClean.length !== 11 || !isValidCpf(cpfClean)) {
    return new NextResponse('CPF inválido. Confira os números e tente de novo.', { status: 400 });
  }

  // O CPF é público; a senha é o único segredo. Sem freio, dá para varrer
  // senha de um assinante à vontade.
  const limitKey = `portal-login:${tenant_id}:${cpfClean}:${clientIp(req.headers)}`;
  const limit = rateLimit(limitKey, 8, 5 * 60_000);
  if (!limit.allowed) {
    return new NextResponse(
      `Muitas tentativas. Espere ${Math.ceil(limit.retryAfterSeconds / 60)} minuto(s) e tente de novo.`,
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const admin = createAdminClient();

  const { data: tenantData } = await admin.from('tenants').select('*').eq('id', tenant_id).single();
  const tenant = asTenantOrNull(tenantData);
  if (!tenant) return new NextResponse('Provedor não encontrado', { status: 404 });

  // 1. Já existe no DB?
  const { data: existing } = await admin
    .from('customers')
    .select('*')
    .eq('tenant_id', tenant_id)
    .eq('cpf_cnpj', cpfClean)
    .maybeSingle();
  let customer = existing as Customer | null;

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
    // Primeiro acesso: cria usuário Supabase com a senha fornecida.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: { tenant_id, customer_id: customer.id, cpf: cpfClean },
    });
    if (createErr || !created.user) {
      return new NextResponse(createErr?.message ?? 'Erro ao criar acesso', { status: 500 });
    }
    await (admin.from('customers').update({ user_id: created.user.id } as never)).eq('id', customer.id);
    customer.user_id = created.user.id;
  } else {
    // Já existe vínculo: usa o e-mail real do usuário, que pode ter sido
    // criado por uma regra anterior à desta versão.
    const { data: linked } = await admin.auth.admin.getUserById(customer.user_id);
    if (linked?.user?.email) authEmail = linked.user.email;
  }

  // 4. Login.
  const { error: loginErr } = await sb.auth.signInWithPassword({
    email: authEmail,
    password,
  });
  if (loginErr) {
    return new NextResponse('CPF ou senha incorretos', { status: 401 });
  }

  rateLimitReset(limitKey);
  return NextResponse.json({ ok: true });
}
