import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processarFila } from '@/lib/push/dispatch';

// Rodada das notificações push.
//
// Quem chama é o pg_cron do Supabase, a cada 15 minutos (migração 012) —
// não a Vercel Cron, que no plano gratuito só roda uma vez por dia, e aviso
// de "vence hoje" marcado para as 9h não pode sair às 23h.
//
// Exige o CRON_SECRET. Só o header x-vercel-cron não basta: qualquer um
// consegue mandar um header, e esta rota envia notificação para assinantes.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function autorizado(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

async function rodar(req: NextRequest) {
  if (!autorizado(req)) return new NextResponse('Unauthorized', { status: 401 });
  const resultado = await processarFila(createAdminClient());
  return NextResponse.json(resultado);
}

export const GET = rodar;
export const POST = rodar;
