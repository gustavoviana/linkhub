'use client';

// As telas da central montadas fora do roteador, com o assinante de vitrine.
//
// Um lugar só, usado por dois: o mockup da página de marca e a exportação de
// screenshots para as lojas. Cada tela monta exatamente o que a rota real
// monta (mesma casca, mesmos componentes) — se divergisse, o provedor
// publicaria na loja uma imagem de um app que não existe.

import { useEffect } from 'react';
import type { Tenant } from '@/lib/supabase/types';
import type { PreviewData } from '@/lib/tenant/preview-data';
import { SCREEN_ANCHOR, type PreviewScreen } from '@/lib/tenant/preview-screens';
import { PortalShell } from './shell';
import { HomeV1 } from './home-v1';
import { HomeV2 } from './home-v2';
import { HomeV3 } from './home-v3';
import { TabBar } from './ui';
import { InvoiceScreen } from './invoice-screen';
import { usePortalTokens } from './theme';
import { SAFE_TOP } from './device-chrome';
import LoginForm from '@/app/portal/login/login-form';
import { InvoiceHeader } from '@/app/portal/fatura/[id]/invoice-header';
import { InvoiceList } from '@/app/portal/fatura/invoice-list';
import { AccountScreen } from '@/app/portal/conta/account-screen';
import { SupportScreen } from '@/app/portal/suporte/support-screen';

/**
 * A tela da entrada desenha a faixa da marca colando no topo (V3) ou usa o
 * respiro que já tem; as outras precisam começar abaixo da barra de status.
 */
function needsSafeTop(screen: PreviewScreen) {
  return screen !== 'entrada';
}

export function PreviewScreenView({
  tenant,
  data,
  screen,
  safeTop = SAFE_TOP,
}: {
  tenant: Tenant;
  data: PreviewData;
  screen: PreviewScreen;
  /** Altura reservada para a barra de status do aparelho. */
  safeTop?: number;
}) {
  // "Consumo" é a home rolada até o gráfico. Rolar aqui, e não só na hora da
  // captura, faz o mockup mostrar a mesma coisa que vai para a loja.
  const anchor = SCREEN_ANCHOR[screen];
  useEffect(() => {
    if (!anchor) {
      window.scrollTo(0, 0);
      return;
    }
    const target = document.querySelector(anchor);
    target?.scrollIntoView({ block: 'center' });
  }, [anchor, screen]);

  return (
    <div style={{ paddingTop: needsSafeTop(screen) ? safeTop : 0, minHeight: '100vh' }}>
      <Screen tenant={tenant} data={data} screen={screen} />
    </div>
  );
}

function Screen({
  tenant,
  data,
  screen,
}: {
  tenant: Tenant;
  data: PreviewData;
  screen: PreviewScreen;
}) {
  const t = usePortalTokens(tenant);

  if (screen === 'entrada') return <LoginForm tenant={tenant} />;

  if (screen === 'inicio' || screen === 'consumo') {
    const Home = tenant.layout === 'v2' ? HomeV2 : tenant.layout === 'v3' ? HomeV3 : HomeV1;
    // A home real não usa PortalShell no celular — o layout já traz o próprio
    // fundo e a barra fica por fora.
    return (
      <>
        <Home
          tenant={tenant}
          customer={data.customer}
          contract={data.contract}
          plan={data.plan}
          openInvoice={data.openInvoice}
          recentInvoices={data.recentInvoices}
          connection={data.connection}
          usage={data.usage}
        />
        <TabBar t={t} path="/" />
      </>
    );
  }

  if (screen === 'pagamento') {
    return (
      <PortalShell tenant={tenant} customer={data.customer} activePath="/fatura">
        <InvoiceHeader tenant={tenant} />
        <InvoiceScreen tenant={tenant} invoice={data.openInvoice} plan={data.plan} />
      </PortalShell>
    );
  }

  if (screen === 'faturas') {
    return (
      <PortalShell tenant={tenant} customer={data.customer} activePath="/fatura">
        {/* A tela de faturas lista tudo, aberta e pagas — a home é que separa. */}
        <InvoiceList tenant={tenant} invoices={[data.openInvoice, ...data.recentInvoices]} />
      </PortalShell>
    );
  }

  if (screen === 'suporte') {
    return (
      <PortalShell tenant={tenant} customer={data.customer} activePath="/suporte">
        <SupportScreen tenant={tenant} tickets={data.tickets} />
      </PortalShell>
    );
  }

  return (
    <PortalShell tenant={tenant} customer={data.customer} activePath="/conta">
      <AccountScreen
        tenant={tenant}
        customer={data.customer}
        contract={data.contract}
        plan={data.plan}
      />
    </PortalShell>
  );
}
