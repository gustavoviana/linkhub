'use client';

import type { Tenant } from '@/lib/supabase/types';
import type { PreviewData } from '@/lib/tenant/preview-data';
import type { PreviewScreen } from '@/lib/tenant/preview-screens';
import type { StoreAsset, StoreFormat } from '@/lib/tenant/store-formats';
import { SCREEN_ANCHOR } from '@/lib/tenant/preview-screens';
import { safeTopFor } from '@/lib/tenant/store-formats';
import { tenantCssText } from '@/lib/tenant/theme';
import { portalTokens, rgba } from '@/components/portal/tokens';
import { PreviewContext } from '@/components/portal/nav-link';
import { PreviewScreenView } from '@/components/portal/preview-screens';
import { HomeIndicator, StatusBar } from '@/components/portal/device-chrome';

// A tela como ela vai para a loja: a central inteira ocupando a janela toda,
// com a barra de status do aparelho por cima. Nada de moldura de celular
// desenhada — screenshot de loja é a captura da tela, e o print de verdade do
// iPhone também não traz a pílula preta (o recorte é físico).

export function StoreShotView({
  tenant,
  data,
  screen,
  format,
}: {
  tenant: Tenant;
  data: PreviewData;
  screen: PreviewScreen;
  format: StoreFormat;
}) {
  const dark = tenant.dark_mode_default;
  const t = portalTokens(tenant, dark);
  const ios = format.chrome === 'ios';

  // Na entrada do V3 a faixa da marca sobe até o topo: ali a barra de status
  // fica sobre a cor de destaque e precisa da tinta que contrasta com ela.
  const onAccent = tenant.layout === 'v3' && screen === 'entrada';
  const scrolled = Boolean(SCREEN_ANCHOR[screen]);

  return (
    <PreviewContext.Provider value>
      <style>{`
        :root{${tenantCssText(tenant, dark)}}
        html,body{margin:0;padding:0;overflow:hidden}
        ${ios ? '.store-shot nav{padding-bottom:16px}' : ''}
      `}</style>
      <div
        data-theme={dark ? 'dark' : 'light'}
        data-layout={tenant.layout}
        className="store-shot bg-bg text-fg"
        style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}
      >
        <PreviewScreenView
          tenant={tenant}
          data={data}
          screen={screen}
          safeTop={safeTopFor(format.chrome)}
        />
        {/* Preso na tela, não no conteúdo: a tela de consumo rola a página e
            o cromo do aparelho tem que ficar onde está. */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
          {/* Numa tela rolada o conteúdo passa por baixo da barra de status.
              O vidro é o que o iOS faz nessa hora — sem ele a hora fica em
              cima de um card, com cara de imagem mal tirada. */}
          {scrolled && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: safeTopFor(format.chrome),
                background: rgba(t.surfaceSolid, t.dark ? 0.66 : 0.72),
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              }}
            />
          )}
          <StatusBar color={onAccent ? t.accentFg : t.text} variant={format.chrome} />
          {ios && <HomeIndicator color={t.text} />}
        </div>
      </div>
    </PreviewContext.Provider>
  );
}

/**
 * Ícone e capa da ficha da loja, montados com a marca do provedor: logo
 * enviada, ou a inicial no gradiente das cores dele.
 */
export function StoreAssetView({ tenant, asset }: { tenant: Tenant; asset: StoreAsset }) {
  const t = portalTokens(tenant, false);
  const isIcon = asset.kind === 'icone';
  const side = Math.min(asset.width, asset.height);

  // Ícone é quadrado: a marca quadrada (a mesma da aba do navegador) cai
  // muito melhor nele do que uma logo deitada, que encolheria até sumir.
  // Na capa vale a logo deitada mesmo, que é onde ela nasceu.
  const art = isIcon ? (tenant.favicon_url ?? tenant.logo_url) : tenant.logo_url;

  return (
    <>
      <style>{`html,body{margin:0;padding:0;overflow:hidden;background:${t.accent}}`}</style>
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: t.accentGrad,
          color: t.accentFg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: side * 0.06,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* O mesmo brilho de canto dos cabeçalhos coloridos da central. */}
        <div
          style={{
            position: 'absolute',
            top: -side * 0.3,
            right: -side * 0.2,
            width: side * 0.9,
            height: side * 0.9,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.14)',
          }}
        />
        {art ? (
          // Com marca enviada não repetimos o nome do lado: a logo quase
          // sempre já tem o nome escrito nela.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={art}
            alt=""
            style={{
              position: 'relative',
              maxWidth: isIcon ? '70%' : '62%',
              maxHeight: isIcon ? '70%' : '62%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <span
            style={{
              position: 'relative',
              fontSize: side * (isIcon ? 0.5 : 0.3),
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              padding: `0 ${side * 0.08}px`,
              textAlign: 'center',
            }}
          >
            {isIcon ? (tenant.name[0]?.toUpperCase() ?? '?') : tenant.name}
          </span>
        )}
      </div>
    </>
  );
}
