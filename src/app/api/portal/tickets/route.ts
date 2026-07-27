import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Customer } from '@/lib/supabase/types';

// Chamados abertos pelo cliente final no portal.
//
// A identificação vem da sessão, nunca do corpo do pedido: o cliente só
// consegue abrir chamado para o próprio cadastro.

const BODY = z.object({
  tenant_id: z.string().uuid(),
  subject: z.string().trim().min(5, 'Descreva o assunto em pelo menos 5 caracteres').max(140),
  category: z.string().trim().max(40).optional(),
  message: z.string().trim().max(2000).optional(),
});

async function currentCustomer(tenantId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from('customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .maybeSingle();
  return (data ?? null) as Customer | null;
}

export async function POST(req: NextRequest) {
  const parsed = BODY.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return new NextResponse(parsed.error.issues[0]?.message ?? 'Dados inválidos', { status: 400 });
  }
  const { tenant_id, subject, category, message } = parsed.data;

  const customer = await currentCustomer(tenant_id);
  if (!customer) return new NextResponse('Sessão expirada. Entre novamente.', { status: 401 });

  const admin = createAdminClient();

  // Contrato mais recente, para o atendimento saber de qual ponto se trata.
  const { data: contract } = await admin
    .from('contracts')
    .select('id')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Protocolo curto e legível ao telefone.
  const protocol = `${new Date().getFullYear()}${String(Date.now()).slice(-8)}`;

  const { data: ticket, error } = await admin
    .from('support_tickets')
    .insert({
      tenant_id,
      customer_id: customer.id,
      contract_id: (contract as { id?: string } | null)?.id ?? null,
      protocol,
      subject,
      category: category ?? null,
      status: 'open',
      priority: 'normal',
      channel: 'portal',
    } as never)
    .select('*')
    .single();

  if (error) return new NextResponse(error.message, { status: 500 });

  await admin.from('audit_log').insert({
    tenant_id,
    actor_user_id: null,
    action: 'ticket.opened',
    resource_type: 'support_ticket',
    resource_id: (ticket as { id: string }).id,
    metadata: { protocol, subject, message: message ?? null },
  } as never);

  return NextResponse.json({ ok: true, ticket });
}
