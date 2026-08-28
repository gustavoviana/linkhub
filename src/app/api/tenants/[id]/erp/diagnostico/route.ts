import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { getAdapterForTenant } from '@/lib/erp';
import type { ErpCheck } from '@/lib/erp/types';

// Diagnóstico da integração, recurso por recurso.
//
// O "Testar conexão" consulta uma tabela de cadastro e responde sim ou não pela
// integração inteira. Foi assim que a LM NET passou semanas com o painel verde
// e a central sem faturas e sem gráfico: o financeiro e o RADIUS do IXC estavam
// fora do alcance do usuário da API, e nada na tela dizia isso — cada falha
// virava uma tela vazia, igualzinha a "este assinante não tem fatura".
//
// Aqui cada recurso responde por si, e a consulta é a mesma que a central faz.
// Com o CPF de um assinante o caminho inteiro é percorrido, o que separa as
// duas causas que dão a mesma tela vazia: permissão negada na tabela, ou tabela
// liberada cujo filtro não encontra nada.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const admin = createAdminClient();
  const { data: isAdmin } = await admin
    .from('tenant_admins')
    .select('id')
    .eq('tenant_id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!isAdmin) return new NextResponse('Forbidden', { status: 403 });

  const { data } = await admin.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) return new NextResponse('Not found', { status: 404 });

  // Só os dígitos: o adapter já tenta as duas escritas do documento, e o que
  // chega da tela costuma vir formatado.
  const body = await req.json().catch(() => ({}));
  const cpf = String(body?.cpf ?? '').replace(/\D/g, '') || undefined;

  // Diagnostica a integração salva, não a que está na tela: é a salva que os
  // assinantes usam, e é dela que se quer saber.
  const adapter = getAdapterForTenant(tenant);

  if (!adapter.diagnose) {
    // ERP sem diagnóstico detalhado ainda responde o que sabe, em vez de
    // deixar a tela sem resposta nenhuma.
    const resultado = await adapter.testConnection();
    const checks: ErpCheck[] = [
      {
        resource: adapter.name,
        feature: 'Integração',
        status: resultado.ok ? 'ok' : 'recusado',
        detail: resultado.ok
          ? 'Este ERP ainda não tem diagnóstico por recurso: a resposta cobre só a credencial.'
          : resultado.message,
      },
    ];
    return NextResponse.json({ erp: adapter.name, detalhado: false, checks });
  }

  try {
    const checks = await adapter.diagnose(cpf);
    return NextResponse.json({ erp: adapter.name, detalhado: true, checks });
  } catch (e) {
    // Uma falha aqui é da própria checagem, não da integração — dizer
    // "recusado" mandaria o provedor mexer no ERP por causa de um erro nosso.
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ erro: message.slice(0, 300) }, { status: 502 });
  }
}
