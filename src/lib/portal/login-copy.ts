import type { Tenant } from '@/lib/supabase/types';

// Texto da tela de entrada.
//
// O padrão vale para todo provedor que não escrever o seu — e vive aqui, no
// código, e não como default de coluna: mudar a redação padrão passa a valer
// para todo mundo que nunca editou, sem migração e sem reescrever linha do
// banco. Quem editou continua com o texto dele.

export const LOGIN_HEADLINE_PADRAO = 'Controle sua conta em um único lugar.';
export const LOGIN_SUBTITLE_PADRAO =
  'Faturas, 2ª via, pagamento por Pix e suporte — tudo em uma tela.';

/** O que a tela de entrada mostra: o texto do provedor ou o padrão. */
export function loginCopy(tenant: Pick<Tenant, 'login_headline' | 'login_subtitle'>) {
  return {
    headline: tenant.login_headline?.trim() || LOGIN_HEADLINE_PADRAO,
    subtitle: tenant.login_subtitle?.trim() || LOGIN_SUBTITLE_PADRAO,
  };
}

/**
 * Os três atrativos ao lado do formulário.
 *
 * Fixos de propósito: descrevem o que a central faz, não a marca de quem a
 * usa — o provedor edita o título e a chamada, que é onde a voz dele importa.
 */
export const LOGIN_DESTAQUES: { icon: 'barcode' | 'pix' | 'help'; label: string }[] = [
  { icon: 'barcode', label: '2ª via na hora' },
  { icon: 'pix', label: 'Pix em minutos' },
  { icon: 'help', label: 'Suporte sem fila' },
];
