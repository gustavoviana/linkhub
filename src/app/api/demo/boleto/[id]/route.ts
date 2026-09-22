import { NextResponse, type NextRequest } from 'next/server';
import { demoTenant } from '@/lib/demo/tenant';
import { demoInvoice } from '@/lib/demo/data';
import { demoBoletoPdf } from '@/lib/demo/boleto-pdf';

// O PDF do boleto de exemplo.
//
// Fatura paga não tem boleto para baixar — nem aqui, nem no portal —, então
// só as em aberto passam. O arquivo se anuncia como demonstração em três
// pontos da folha: ele vai parar na pasta de downloads de quem visitou.

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // O layout não muda o boleto, então o provedor padrão basta.
  const tenant = demoTenant();
  const invoice = demoInvoice(tenant, id);
  if (!invoice || !invoice.boleto_line) {
    return new NextResponse('Boleto indisponível para esta fatura', { status: 404 });
  }

  const pdf = demoBoletoPdf(invoice, 'Marina Duarte', tenant.name);

  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="boleto-demonstracao-${id}.pdf"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
