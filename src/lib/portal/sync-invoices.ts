import 'server-only';
import type { createAdminClient } from '@/lib/supabase/admin';
import type { ErpAdapter } from '@/lib/erp';
import type { Contract } from '@/lib/supabase/types';
import { mensalidadeDeFaturas } from './mensalidade';

// Atualização das faturas de um contrato a partir do ERP.
//
// Isto costumava rodar no meio do render da central: a cada 5 minutos o
// assinante azarado pagava a conta — a ida até o ERP mais a gravação de dezenas
// de faturas — antes de ver qualquer pixel. Agora mora aqui, para ser chamado
// de onde não trava a tela: a rota /api/portal/sync, depois que a página já
// pintou, e o cron.

export const SYNC_TTL_MS = 5 * 60_000;

type Admin = ReturnType<typeof createAdminClient>;

export function precisaAtualizar(lastSyncedAt: string | null | undefined): boolean {
  const t = lastSyncedAt ? new Date(lastSyncedAt).getTime() : 0;
  return Date.now() - t > SYNC_TTL_MS;
}

/**
 * Traz as faturas do ERP e grava numa tacada só. Devolve quantas vieram.
 *
 * Gravar uma a uma custava ~15s com 60 faturas: cada upsert é uma viagem até o
 * banco. Erro do ERP não propaga — a central continua mostrando o que já tem.
 */
export async function sincronizarFaturas(
  admin: Admin,
  tenantId: string,
  contract: Pick<Contract, 'id' | 'external_id'> & { monthly_price_cents?: number | null },
  adapter: ErpAdapter,
): Promise<number> {
  if (!contract.external_id) return 0;

  try {
    const fresh = await adapter.listInvoicesByContract(contract.external_id);
    const agora = new Date().toISOString();

    if (fresh.length) {
      await admin.from('invoices').upsert(
        fresh.map((inv) => ({
          tenant_id: tenantId,
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
          last_synced_at: agora,
        })) as never,
        { onConflict: 'tenant_id,external_id' },
      );
    }

    // Marca a passagem mesmo sem faturas: senão um contrato novo bate no ERP
    // a cada carregamento de tela, para sempre.
    const patch: Record<string, unknown> = { last_synced_at: agora };

    // ERP que não informa o valor do plano (o SGP é um) deixava a mensalidade
    // em R$ 0,00 na central. O histórico responde: é o valor que se repete.
    if (!contract.monthly_price_cents) {
      const mensalidade = mensalidadeDeFaturas(
        fresh
          .filter((i) => i.status !== 'cancelled')
          .sort((a, b) => (b.dueDate ?? '').localeCompare(a.dueDate ?? ''))
          .slice(0, 6)
          .map((i) => i.amountCents),
      );
      if (mensalidade) patch.monthly_price_cents = mensalidade;
    }

    await admin.from('contracts').update(patch as never).eq('id', contract.id);
    return fresh.length;
  } catch (e) {
    console.error('[portal] invoice sync failed', e);
    return 0;
  }
}
