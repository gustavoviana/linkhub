import 'server-only';
import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { open } from '@/lib/tenant/secret-box';

// Configuração do chat de atendimento de um provedor (tabela tenant_chat).
//
// Duas leituras com alcance diferente: `estadoDoChat` é o que pode aparecer
// em tela (ligado? qual token?), `tokenDoChat` devolve o token aberto e só
// serve para a chamada ao FiberDesk.

export interface EstadoDoChat {
  /** A migração 013 ainda não rodou neste banco. */
  missingTable: boolean;
  configurado: boolean;
  ativo: boolean;
  provider: 'fiberdesk';
  dica: string | null;
  atualizadoEm: string | null;
}

interface Linha {
  provider: 'fiberdesk';
  api_key: string;
  key_hint: string;
  enabled: boolean;
  updated_at: string;
}

export function tabelaDoChatAusente(error: { code?: string; message?: string } | null): boolean {
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    (/tenant_chat/i.test(error?.message ?? '') && /does not exist|schema cache/i.test(error?.message ?? ''))
  );
}

async function lerLinha(tenantId: string): Promise<{ linha: Linha | null; missingTable: boolean }> {
  const { data, error } = await createAdminClient()
    .from('tenant_chat' as never)
    .select('provider, api_key, key_hint, enabled, updated_at')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) {
    if (tabelaDoChatAusente(error)) return { linha: null, missingTable: true };
    throw new Error(error.message);
  }
  return { linha: (data ?? null) as Linha | null, missingTable: false };
}

export async function estadoDoChat(tenantId: string): Promise<EstadoDoChat> {
  const { linha, missingTable } = await lerLinha(tenantId);
  return {
    missingTable,
    configurado: !!linha,
    ativo: !!linha?.enabled,
    provider: linha?.provider ?? 'fiberdesk',
    dica: linha?.key_hint ?? null,
    atualizadoEm: linha?.updated_at ?? null,
  };
}

/**
 * O chat aparece na central deste provedor?
 *
 * Nunca derruba a tela de suporte: banco sem a migração ou erro de leitura
 * só escondem o botão — o assinante continua com WhatsApp, telefone e
 * chamado. Em cache por requisição: o layout e a página perguntam juntos.
 */
export const chatAtivo = cache(async (tenantId: string): Promise<boolean> => {
  try {
    const { linha } = await lerLinha(tenantId);
    return !!linha?.enabled;
  } catch {
    return false;
  }
});

/** Token aberto, só quando o chat está ligado. Uso exclusivo do servidor. */
export async function tokenDoChat(tenantId: string): Promise<string | null> {
  const { linha } = await lerLinha(tenantId);
  if (!linha?.enabled) return null;
  return open(linha.api_key);
}
