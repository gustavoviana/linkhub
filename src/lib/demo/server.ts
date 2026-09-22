import 'server-only';
import { cookies, headers } from 'next/headers';
import {
  DEMO_LAYOUT_COOKIE,
  demoMontagem,
  demoTenant,
  resolveDemoLayout,
  type DemoMontagem,
} from './tenant';
import { buildDemoData, type DemoData } from './data';
import type { Tenant } from '@/lib/supabase/types';

// O que toda tela da demonstração precisa: o provedor fictício no layout que
// o visitante escolheu na barra, e o cadastro do assinante.
//
// Montar isto custa alguns milissegundos de CPU e nenhuma ida à rede, então
// cada tela chama à vontade — não há o que guardar em cache.

export async function demoContexto(): Promise<{ tenant: Tenant; data: DemoData }> {
  const store = await cookies();
  const tenant = demoTenant(resolveDemoLayout(store.get(DEMO_LAYOUT_COOKIE)?.value));
  return { tenant, data: buildDemoData(tenant) };
}

/**
 * Onde a demonstração está montada neste pedido.
 *
 * Sai do host e não de uma constante porque a mesma central atende dois
 * endereços: `demo.linkhub.api.br`, onde a central é a raiz, e `/demo` no
 * domínio principal. É daqui que os links internos saem com o prefixo certo
 * — errar isto manda o visitante para 404 no primeiro clique.
 */
export async function demoMontagemAtual(): Promise<DemoMontagem> {
  const h = await headers();
  // Atrás do proxy da Vercel o host original vem em `x-forwarded-host`; o
  // `host` cru pode já ser o interno.
  return demoMontagem(h.get('x-forwarded-host') ?? h.get('host'));
}
