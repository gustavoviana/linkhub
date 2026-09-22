import { cookies } from 'next/headers';
import type { Metadata, Viewport } from 'next';
import { PortalThemeProvider } from '@/components/portal/theme';
import { PortalRuntimeProvider } from '@/components/portal/runtime';
import { DemoBar } from '@/components/demo/demo-bar';
import { DEMO_LAYOUT_COOKIE, demoTenant, resolveDemoLayout } from '@/lib/demo/tenant';
import { demoMontagemAtual } from '@/lib/demo/server';
import { PORTAL_THEME_COOKIE, resolveDark } from '@/lib/portal/theme-cookie';

// A central de demonstração.
//
// Monta exatamente os componentes do portal de verdade — mesma casca, mesmas
// telas, mesmo gráfico — trocando só de onde vêm os dados e onde as rotas
// moram. Se aqui fosse uma cópia, ela envelheceria: o provedor mostraria ao
// cliente dele uma central que já não existe.
//
// Fora do middleware de tenant de propósito: sem sessão, sem banco e sem
// ERP. Responde em `demo.linkhub.api.br`, o endereço divulgado, e também em
// `/demo` no domínio raiz — por isso o prefixo dos links vem da montagem do
// pedido, e não de uma constante.

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Central do Assinante — Demonstração | LinkHub',
  description:
    'Veja por dentro a central do cliente do LinkHub: faturas, 2ª via com Pix e boleto, consumo de rede e suporte. Entre com qualquer número.',
  // O provedor manda este link para o cliente dele: a aba não pode abrir com
  // o quadradinho vazio do navegador.
  icons: { icon: [{ url: '/demo/icone.svg', type: 'image/svg+xml' }] },
};

export function generateViewport(): Viewport {
  return { themeColor: '#0d0f17', viewportFit: 'cover' };
}

export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const montagem = await demoMontagemAtual();
  const layout = resolveDemoLayout(store.get(DEMO_LAYOUT_COOKIE)?.value);
  const tenant = demoTenant(layout);
  const dark = resolveDark(store.get(PORTAL_THEME_COOKIE)?.value, tenant);

  return (
    <PortalRuntimeProvider value={{ base: montagem.base, demo: true, logoutAction: montagem.sair }}>
      {/* A key remonta o tema quando o visitante troca de layout: o V2 nasce
          escuro e o V1 claro, e sem isso a troca ficava presa no tema
          anterior até alguém mexer no botão de sol. */}
      <PortalThemeProvider key={layout} tenant={tenant} initialDark={dark}>
        <DemoBar layout={layout} sair={montagem.sair} />
        {children}
      </PortalThemeProvider>
    </PortalRuntimeProvider>
  );
}
