import { NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/auth/session';
import { tokenDoChat } from '@/lib/chat/config';
import { pedirLinkDoChat } from '@/lib/chat/fiberdesk';
import { rateLimit } from '@/lib/rate-limit';

// Botão "Falar no chat" da central.
//
// O assinante vem da sessão, nunca do corpo: o link que volta daqui entra no
// atendimento COMO aquela pessoa, então ninguém pode pedir o link de outro
// CPF. O token do provedor fica neste servidor; o navegador só recebe a URL
// pessoal, que vale 15 minutos.

export const dynamic = 'force-dynamic';

export async function POST() {
  const sessao = await getPortalSession().catch(() => null);
  if (!sessao?.customer) return new NextResponse('Sessão expirada. Entre novamente.', { status: 401 });
  const { tenant, customer } = sessao;

  // Cada toque cria um link no FiberDesk. Vinte por dez minutos cobre quem
  // sai e volta para o chat várias vezes, e corta um script em loop.
  const limite = rateLimit(`chat:${customer.id}`, 20, 10 * 60_000);
  if (!limite.allowed) {
    return new NextResponse('Muitas tentativas seguidas. Aguarde alguns minutos.', { status: 429 });
  }

  let token: string | null;
  try {
    token = await tokenDoChat(tenant.id);
  } catch {
    token = null;
  }
  if (!token) return new NextResponse('O chat de atendimento não está disponível agora.', { status: 404 });

  const link = await pedirLinkDoChat(token, {
    cpfCnpj: customer.cpf_cnpj,
    telefone: customer.phone,
    nome: customer.name,
  });

  if (!link.ok) {
    // O motivo técnico (token revogado, FiberDesk fora) é do provedor, não do
    // assinante: fica no log, e a tela mostra um texto que ele entende.
    console.error(`[chat] tenant ${tenant.id}: ${link.motivo}`);
    return new NextResponse('Não conseguimos abrir o chat agora. Tente de novo em instantes.', { status: 502 });
  }

  return NextResponse.json({ url: link.url });
}
