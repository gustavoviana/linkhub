import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Toque numa notificação. O service worker chama isto antes de abrir a tela,
// e é daqui que sai a coluna "tocaram" do histórico do provedor.
//
// Sem sessão de propósito: o toque pode abrir a central de quem já saiu da
// conta. O id da entrega é um uuid aleatório que só existiu dentro da
// notificação — adivinhar um serve, no máximo, para somar um toque.

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { d } = (await req.json().catch(() => ({}))) as { d?: string };
  if (d && /^[0-9a-f-]{36}$/i.test(d)) {
    await createAdminClient()
      .from('push_deliveries')
      .update({ clicked_at: new Date().toISOString() } as never)
      .eq('id', d)
      .is('clicked_at', null);
  }
  return new NextResponse(null, { status: 204 });
}
