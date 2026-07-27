import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { asTenants } from '@/lib/supabase/helpers';
import { getAdapterForTenant } from '@/lib/erp';

// Sincronização periódica com o ERP de cada provedor.
//
// Antes disso, o catálogo só era atualizado quando alguém clicava no botão, e
// as faturas só quando o cliente abria o portal — quem entrava depois do
// vencimento via dado velho. Roda pela Vercel Cron (ver vercel.json).
//
// Proteção: em produção exige o header da Vercel Cron ou o CRON_SECRET. Sem
// isso, qualquer um poderia disparar sincronizações e derrubar o ERP do
// provedor a pedidos.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (secret && auth === `Bearer ${secret}`) return true;
  // A Vercel assina as chamadas de cron com este header.
  if (req.headers.get('x-vercel-cron')) return true;
  return process.env.NODE_ENV !== 'production' && !secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return new NextResponse('Unauthorized', { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from('tenants')
    .select('*')
    .neq('erp_type', 'mock')
    .in('status', ['active', 'trial']);

  const tenants = asTenants(data);
  const report: { tenant: string; plans?: number; invoices?: number; error?: string }[] = [];

  for (const tenant of tenants) {
    const adapter = getAdapterForTenant(tenant);
    try {
      // 1. Catálogo de planos.
      const plans = await adapter.listPlans();
      for (const p of plans) {
        await admin.from('plans').upsert(
          {
            tenant_id: tenant.id,
            external_id: p.externalId,
            name: p.name,
            description: p.description,
            down_mbps: p.downMbps,
            up_mbps: p.upMbps,
            price_cents: p.priceCents,
            fidelity_months: p.fidelityMonths,
            active: true,
          },
          { onConflict: 'tenant_id,external_id' },
        );
      }

      // 2. Faturas dos contratos ativos — é o dado que envelhece mais rápido.
      const { data: contracts } = await admin
        .from('contracts')
        .select('id, external_id')
        .eq('tenant_id', tenant.id)
        .eq('status', 'active')
        .limit(500);

      let invoiceCount = 0;
      for (const contract of (contracts ?? []) as { id: string; external_id: string | null }[]) {
        if (!contract.external_id) continue;
        const invoices = await adapter.listInvoicesByContract(contract.external_id);
        for (const inv of invoices) {
          await admin.from('invoices').upsert(
            {
              tenant_id: tenant.id,
              contract_id: contract.id,
              external_id: inv.externalId,
              reference_month: inv.referenceMonth,
              due_date: inv.dueDate,
              amount_cents: inv.amountCents,
              status: inv.status,
              pix_copy_paste: inv.pixCopyPaste,
              pix_qr_code: inv.pixQrCode,
              boleto_line: inv.boletoLine,
              boleto_pdf_url: inv.boletoPdfUrl,
              nfe_url: inv.nfeUrl,
              paid_at: inv.paidAt,
              paid_amount_cents: inv.paidAmountCents,
              paid_method: inv.paidMethod,
              last_synced_at: new Date().toISOString(),
            },
            { onConflict: 'tenant_id,external_id' },
          );
          invoiceCount++;
        }
      }

      await admin
        .from('tenants')
        .update({
          erp_last_sync_at: new Date().toISOString(),
          erp_last_sync_status: 'ok',
          erp_last_sync_error: null,
        } as never)
        .eq('id', tenant.id);

      report.push({ tenant: tenant.slug, plans: plans.length, invoices: invoiceCount });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // Erro de um provedor não pode parar a fila dos outros.
      await admin
        .from('tenants')
        .update({
          erp_last_sync_at: new Date().toISOString(),
          erp_last_sync_status: 'error',
          erp_last_sync_error: message.slice(0, 500),
        } as never)
        .eq('id', tenant.id);
      report.push({ tenant: tenant.slug, error: message });
    }
  }

  return NextResponse.json({ ok: true, tenants: tenants.length, report });
}
