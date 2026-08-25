import 'server-only';
import type { createAdminClient } from '@/lib/supabase/admin';

// O que fazer com o que já foi sincronizado quando a integração de ERP muda.
//
// Tudo que mora em `customers`, `contracts`, `plans` e `invoices` é cópia do
// ERP, endereçada pelos ids que aquele ERP usa. Trocar a integração para outro
// sistema não invalidava nada: os dados do ERP anterior continuavam no
// provedor, e como o login e a central leem o banco antes de perguntar ao ERP,
// era esse acervo velho que aparecia — enquanto os assinantes de verdade nunca
// entravam. Foi o que aconteceu com a LM NET, que ficou com o cliente, o
// contrato e as 60 faturas de outro provedor usado num teste de integração.

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Campos que identificam a *instalação* do ERP — o sistema em que os ids
 * externos fazem sentido. Trocar um deles significa apontar para outro
 * sistema: os ids guardados deixam de valer. Trocar só o segredo (rotação de
 * token, senha nova) mantém a instalação, e com ela os ids.
 */
const CAMPOS_DE_IDENTIDADE: Record<string, string[]> = {
  ixc: ['baseUrl'],
  sgp: ['baseUrl', 'app'],
  ispfy: ['baseUrl'],
  hubsoft: ['baseUrl', 'clientId', 'username'],
  mk_solutions: ['baseUrl', 'user'],
};

function normalizar(valor: unknown): string {
  return String(valor ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
}

/** Chave estável da instalação de ERP, para comparar antes e depois de salvar. */
export function identidadeDoErp(
  erpType: string,
  bloco: Record<string, unknown> | undefined | null,
): string {
  const campos = CAMPOS_DE_IDENTIDADE[erpType] ?? ['baseUrl'];
  return [erpType, ...campos.map((c) => normalizar(bloco?.[c]))].join('|');
}

/** Alguma credencial mudou, ainda que a instalação seja a mesma? */
export function credencialMudou(
  anterior: Record<string, unknown> | undefined | null,
  atual: Record<string, unknown> | undefined | null,
): boolean {
  const chaves = new Set([...Object.keys(anterior ?? {}), ...Object.keys(atual ?? {})]);
  for (const chave of chaves) {
    if (String(anterior?.[chave] ?? '') !== String(atual?.[chave] ?? '')) return true;
  }
  return false;
}

export interface ResumoDaLimpeza {
  customers: number;
  contracts: number;
  invoices: number;
  plans: number;
}

/**
 * Apaga o acervo copiado do ERP anterior. Não há o que preservar: os ids
 * externos apontam para um sistema que não é mais o do provedor.
 *
 * `customers` leva `contracts` e, com eles, `invoices` — é cascata declarada no
 * schema. `plans` não pende de cliente nenhum, então sai à parte. Chamados de
 * suporte ficam: o schema desliga o vínculo (`on delete set null`) em vez de
 * apagar, porque atendimento é registro do provedor, não cópia do ERP.
 */
export async function limparCacheDoErp(admin: Admin, tenantId: string): Promise<ResumoDaLimpeza> {
  const contar = async (tabela: 'customers' | 'contracts' | 'invoices' | 'plans') => {
    const { count } = await admin
      .from(tabela)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    return count ?? 0;
  };

  const resumo: ResumoDaLimpeza = {
    customers: await contar('customers'),
    contracts: await contar('contracts'),
    invoices: await contar('invoices'),
    plans: await contar('plans'),
  };

  await admin.from('customers').delete().eq('tenant_id', tenantId);
  await admin.from('plans').delete().eq('tenant_id', tenantId);

  await admin
    .from('tenants')
    .update({
      erp_last_sync_at: null,
      erp_last_sync_status: null,
      erp_last_sync_error: null,
    } as never)
    .eq('id', tenantId);

  return resumo;
}

/**
 * Mesma instalação, credencial nova: os ids continuam valendo, então não há o
 * que apagar — só marcar o que está em cache como vencido. Sem isso a central
 * respeitaria o TTL de 5 minutos por contrato e o painel seguiria exibindo a
 * data da última sincronização como se ela valesse para a credencial nova.
 */
export async function marcarCacheVencido(admin: Admin, tenantId: string): Promise<void> {
  await admin.from('contracts').update({ last_synced_at: null } as never).eq('tenant_id', tenantId);
  await admin.from('tenants').update({ erp_last_sync_at: null } as never).eq('id', tenantId);
}
