import type { Tenant, TenantLayout } from '@/lib/supabase/types';

// O provedor da demonstração.
//
// Não existe no banco: é montado aqui, em memória, a cada requisição de
// /demo. Isso é de propósito — a demonstração fica de pé sem depender de
// Supabase, de ERP ou de alguém lembrar de criar uma linha em produção, e
// nenhum dado de provedor real passa por ela.
//
// A marca é genérica ("Sua Logo") porque o que a demonstração vende é o
// produto, não uma operação: quem abre o link precisa enxergar o próprio
// nome ali.

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'linkhub.api.br').toLowerCase();

/** O endereço próprio da demonstração — o que a landing divulga. */
export const DEMO_HOST = `demo.${ROOT_DOMAIN}`;

/**
 * Onde a demonstração está montada no pedido que está sendo atendido.
 *
 * Ela tem dois endereços: `demo.linkhub.api.br`, que é o divulgado, e
 * `/demo` no domínio raiz, que é por onde a landing entra e o único que
 * existe em desenvolvimento (não há subdomínio em localhost). São as mesmas
 * telas — só o prefixo dos links muda, e é isto aqui.
 */
export interface DemoMontagem {
  /** A porta de entrada: a tela de login. */
  entrada: string;
  /** Prefixo das telas internas da central. */
  base: string;
  /** Destino do formulário "Sair". */
  sair: string;
}

const NO_SUBDOMINIO: DemoMontagem = { entrada: '/', base: '/central', sair: '/sair' };
const NO_DOMINIO_RAIZ: DemoMontagem = { entrada: '/demo', base: '/demo/central', sair: '/demo/sair' };

/** true quando o pedido chegou pelo subdomínio da demonstração. */
export function ehHostDaDemo(host: string | null | undefined): boolean {
  return (host ?? '').split(':')[0]!.toLowerCase() === DEMO_HOST;
}

export function demoMontagem(host: string | null | undefined): DemoMontagem {
  return ehHostDaDemo(host) ? NO_SUBDOMINIO : NO_DOMINIO_RAIZ;
}

/** Layout escolhido pelo visitante na barra da demonstração. */
export const DEMO_LAYOUT_COOKIE = 'demo_layout';

export const DEMO_LAYOUTS: { key: TenantLayout; label: string; hint: string }[] = [
  { key: 'v1', label: 'Clean', hint: 'Clean Minimal — sóbrio, cartões brancos' },
  { key: 'v2', label: 'Premium', hint: 'Neo Premium — vidro e gradiente, nasce escuro' },
  { key: 'v3', label: 'Bold', hint: 'Friendly Bold — cores fortes, cantos largos' },
];

export function resolveDemoLayout(value: string | undefined): TenantLayout {
  return value === 'v2' || value === 'v3' ? value : 'v1';
}

// Uma cor por layout. O V2 nasce escuro e o V3 é quente: repetir o mesmo
// índigo nos três faria a troca de layout parecer só um ajuste de canto.
const CORES: Record<TenantLayout, { primary: string; accent: string; dark: boolean }> = {
  v1: { primary: '#5b5bd6', accent: '#7c6cf0', dark: false },
  v2: { primary: '#7c5cff', accent: '#22d3ee', dark: true },
  v3: { primary: '#f97316', accent: '#fb923c', dark: false },
};

const STAMP = '2026-01-01T12:00:00.000Z';

export function demoTenant(layout: TenantLayout = 'v1'): Tenant {
  const cor = CORES[layout];
  return {
    id: 'demo-tenant',
    slug: 'demo',
    name: 'Sua Logo',
    legal_name: 'Provedor de Demonstração LTDA',
    cnpj: null,
    status: 'active',
    layout,
    primary_color: cor.primary,
    accent_color: cor.accent,
    dark_mode_default: cor.dark,
    // A demonstração entra com qualquer número: pedir senha aqui só criaria
    // um campo a mais para o visitante inventar o que digitar.
    portal_require_password: false,
    logo_url: '/demo/sua-logo.svg',
    logo_dark_url: '/demo/sua-logo-clara.svg',
    favicon_url: null,
    login_image_url: null,
    login_headline: 'A sua central do assinante, com a sua marca.',
    login_subtitle:
      'Esta é uma demonstração. Entre com qualquer número e navegue à vontade — faturas, Pix, boleto, consumo e suporte estão todos aqui.',
    support_phone: '(54) 3000-0000',
    support_whatsapp: '5554000000000',
    support_email: 'contato@seuprovedor.com.br',
    erp_type: 'mock',
    erp_config: {},
    erp_last_sync_at: null,
    erp_last_sync_status: null,
    erp_last_sync_error: null,
    custom_domain: null,
    custom_domain_verified: false,
    created_at: STAMP,
    updated_at: STAMP,
  };
}
