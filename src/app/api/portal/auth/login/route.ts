import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { getAdapterForTenant } from '@/lib/erp';
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

  const cpfClean = String(cpf).replace(/\D/g, '');
  if (cpfClean.length < 11) {
    return new NextResponse('CPF inválido', { status: 400 });
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
  const syntheticEmail = customer.email
    ? customer.email
    : `cliente-${tenant.slug}-${cpfClean}@linkhub.local`;

  const sb = await createClient();

  if (!customer.user_id) {
    // Primeiro acesso: cria usuário Supabase com a senha fornecida.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
      user_metadata: { tenant_id, customer_id: customer.id, cpf: cpfClean },
    });
    if (createErr || !created.user) {
      return new NextResponse(createErr?.message ?? 'Erro ao criar acesso', { status: 500 });
    }
    await (admin.from('customers').update({ user_id: created.user.id } as never)).eq('id', customer.id);
    customer.user_id = created.user.id;
  }

  // 4. Login.
  const { error: loginErr } = await sb.auth.signInWithPassword({
    email: syntheticEmail,
    password,
  });
  if (loginErr) {
    return new NextResponse('CPF ou senha incorretos', { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
