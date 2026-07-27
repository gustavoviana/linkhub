'use client';

import { useEffect, useState } from 'react';
import type { Tenant, TenantLayout } from '@/lib/supabase/types';
import type { PreviewData } from '@/lib/tenant/preview-data';
import { tenantCssText } from '@/lib/tenant/theme';
import { portalTokens } from '@/components/portal/tokens';
import { TabBar } from '@/components/portal/ui';
import { HomeV1 } from '@/components/portal/home-v1';
import { HomeV2 } from '@/components/portal/home-v2';
import { HomeV3 } from '@/components/portal/home-v3';
import LoginForm from '@/app/portal/login/login-form';
import {
  PREVIEW_READY,
  PREVIEW_UPDATE,
  type PreviewScreen,
  type PreviewTheme,
} from '@/lib/tenant/preview-protocol';

export function PreviewShell({ tenant, data }: { tenant: Tenant; data: PreviewData }) {
  const [theme, setTheme] = useState<PreviewTheme>(tenant);
  const [screen, setScreen] = useState<PreviewScreen>('home');

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== PREVIEW_UPDATE) return;
      if (event.data.theme) setTheme(event.data.theme as PreviewTheme);
      if (event.data.screen) setScreen(event.data.screen as PreviewScreen);
    }
    window.addEventListener('message', onMessage);
    // Avisa o painel que já dá pra mandar o estado do formulário.
    window.parent?.postMessage({ type: PREVIEW_READY }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const merged: Tenant = { ...tenant, ...theme };
  const dark = merged.dark_mode_default;
  const Layout = pickLayout(merged.layout);

  return (
    <>
      <style>{`
        :root{${tenantCssText(merged, dark)}}
        /* Levanta a barra de navegação acima do indicador de home do iPhone. */
        .preview-viewport nav{padding-bottom:16px}
      `}</style>
      <div
        data-theme={dark ? 'dark' : 'light'}
        data-layout={merged.layout}
        className="preview-viewport min-h-screen bg-bg text-fg"
      >
        {screen === 'login' ? (
          <LoginForm tenant={merged} />
        ) : (
          <main className="min-h-screen pt-11">
            <Layout
              tenant={merged}
              customer={data.customer}
              contract={data.contract}
              plan={data.plan}
              openInvoice={data.openInvoice}
              recentInvoices={data.recentInvoices}
            />
            <TabBar t={portalTokens(merged, dark)} />
          </main>
        )}
      </div>
    </>
  );
}

function pickLayout(layout: TenantLayout) {
  if (layout === 'v2') return HomeV2;
  if (layout === 'v3') return HomeV3;
  return HomeV1;
}
