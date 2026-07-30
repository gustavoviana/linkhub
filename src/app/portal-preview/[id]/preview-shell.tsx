'use client';

import { useEffect, useState } from 'react';
import type { Tenant } from '@/lib/supabase/types';
import type { PreviewData } from '@/lib/tenant/preview-data';
import type { PreviewScreen } from '@/lib/tenant/preview-screens';
import { PreviewContext } from '@/components/portal/nav-link';
import { PortalThemeProvider } from '@/components/portal/theme';
import { PreviewScreenView } from '@/components/portal/preview-screens';
import {
  PREVIEW_READY,
  PREVIEW_UPDATE,
  type PreviewTheme,
} from '@/lib/tenant/preview-protocol';

export function PreviewShell({ tenant, data }: { tenant: Tenant; data: PreviewData }) {
  const [theme, setTheme] = useState<PreviewTheme>(tenant);
  const [screen, setScreen] = useState<PreviewScreen>('inicio');

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

  return (
    <PreviewContext.Provider value>
      {/* O mesmo provider do portal: é ele que faz o botão de claro/escuro
          existir, então o mockup mostra a central inteira, botão incluído.
          A key remonta quando o provedor troca o padrão no formulário. */}
      <PortalThemeProvider
        key={String(merged.dark_mode_default)}
        tenant={merged}
        initialDark={merged.dark_mode_default}
      >
        {/* Levanta a barra de navegação acima do indicador de home do iPhone. */}
        <style>{`.preview-viewport nav{padding-bottom:16px}`}</style>
        <div className="preview-viewport">
          <PreviewScreenView tenant={merged} data={data} screen={screen} />
        </div>
      </PortalThemeProvider>
    </PreviewContext.Provider>
  );
}
