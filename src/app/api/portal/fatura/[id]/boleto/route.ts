import { NextResponse, type NextRequest } from 'next/server';
import { requireTenant } from '@/lib/tenant/resolve';
import { getCurrentCustomer } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdapterForTenant } from '@/lib/erp';

// Baixa o PDF do boleto direto do ERP.
//
// O IXC devolve o arquivo em base64 pelo get_boleto; o link público não
// existe. Passamos pelo servidor para não expor credencial e para conferir
// que a fatura é mesmo do assinante logado.

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const tenant = await requireTenant();
  const customer = await getCurrentCustomer(tenant.id);
  if (!customer) return new NextResponse('Sessão expirada', { status: 401 });

  const admin = createAdminClient();
  const { data: invoice } = await admin.from('invoices').select('*').eq('id', id).single();
  if (!invoice) return new NextResponse('Fatura não encontrada', { status: 404 });

  const { data: contract } = await admin
    .from('contracts')
    .select('customer_id')
    .eq('id', (invoice as { contract_id: string }).contract_id)
    .single();
  if ((contract as { customer_id?: string } | null)?.customer_id !== customer.id) {
    return new NextResponse('Fatura não encontrada', { status: 404 });
  }

  const externalId = (invoice as { external_id?: string | null }).external_id;
  if (!externalId) return new NextResponse('Boleto indisponível', { status: 404 });

  const adapter = getAdapterForTenant(tenant);
  const base64 = await adapter.getInvoiceBoletoPdf?.(externalId).catch(() => null);
  if (!base64) return new NextResponse('Boleto indisponível para esta fatura', { status: 404 });

  const pdf = Buffer.from(base64, 'base64');
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="boleto-${externalId}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
