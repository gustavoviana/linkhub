import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import LoginForm from '@/app/portal/login/login-form';
import { DEMO_HOST, DEMO_LAYOUT_COOKIE, demoTenant, resolveDemoLayout } from '@/lib/demo/tenant';
import { demoMontagemAtual } from '@/lib/demo/server';
import { DEMO_CPF } from '@/lib/demo/data';

// A porta de entrada: a mesma tela de login do portal, com o cadastro já
// preenchido e sem consulta a lugar nenhum. Qualquer número entra — quem está
// avaliando a central não tem CPF cadastrado em provedor algum, e travar a
// visita na primeira tela seria o pior lugar possível para travá-la.

// A demonstração responde em dois endereços — o subdomínio e /demo no
// domínio raiz —, e a porta de entrada é a mesma página nos dois. O canônico
// aponta para o subdomínio, que é o endereço divulgado, para os buscadores
// não tratarem os dois como páginas concorrentes.
export const metadata: Metadata = {
  alternates: { canonical: `https://${DEMO_HOST}/` },
};

export const dynamic = 'force-dynamic';

export default async function DemoLoginPage() {
  const store = await cookies();
  const montagem = await demoMontagemAtual();
  const tenant = demoTenant(resolveDemoLayout(store.get(DEMO_LAYOUT_COOKIE)?.value));

  return <LoginForm tenant={tenant} demoDestino={montagem.base} cpfInicial={DEMO_CPF} />;
}
