import { NextResponse, type NextRequest } from 'next/server';
import { parseUsageRange } from '@/lib/erp/usage';
import { demoUsage } from '@/lib/demo/data';

// Consumo por período para o gráfico da demonstração.
//
// Mesma resposta que /api/portal/consumo devolve, sem sessão e sem ERP: o
// componente do gráfico é o mesmo dos dois lados e só troca o endereço.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const range = parseUsageRange(req.nextUrl.searchParams.get('range'));
  return NextResponse.json(
    { range, usage: demoUsage(range) },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
