'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { tenantThemeVars } from '@/lib/tenant/theme';
import { PREVIEW_SCREENS, type PreviewScreen } from '@/lib/tenant/preview-screens';
import {
  PREVIEW_READY,
  PREVIEW_UPDATE,
  type PreviewTheme,
} from '@/lib/tenant/preview-protocol';
import {
  DynamicIsland,
  HomeIndicator,
  IPHONE_16_PRO_MAX,
  StatusBar,
} from '@/components/portal/device-chrome';
import { cn } from '@/lib/utils';

// Mockup de iPhone 16 Pro Max em escala. As medidas são as reais do aparelho
// em pontos — a tela é um iframe de 440×956 reduzido por transform, então o
// que aparece aqui é o portal de verdade renderizando em largura de celular,
// com os breakpoints se comportando como no aparelho.

const SCALE = 0.62;
const SCREEN_W = IPHONE_16_PRO_MAX.width * SCALE;
const SCREEN_H = IPHONE_16_PRO_MAX.height * SCALE;
const BEZEL = 9;

export function PhonePreview({ tenantId, theme }: { tenantId: string; theme: PreviewTheme }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [readyToken, setReadyToken] = useState(0);
  const [screen, setScreen] = useState<PreviewScreen>('inicio');

  // Serializado pra o efeito não disparar a cada render do formulário.
  const themeKey = JSON.stringify(theme);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === PREVIEW_READY) setReadyToken((t) => t + 1);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (readyToken === 0) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: PREVIEW_UPDATE, theme: JSON.parse(themeKey), screen },
      window.location.origin,
    );
  }, [readyToken, themeKey, screen]);

  // A barra de status e o indicador de home são cromo do aparelho, não do
  // app — ficam fora do iframe e por isso precisam das cores do tema aqui.
  const vars = useMemo(
    () => tenantThemeVars(theme, theme.dark_mode_default),
    [theme.primary_color, theme.accent_color, theme.dark_mode_default], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const screenBg = `rgb(${vars['--bg']})`;
  const screenFg = `rgb(${vars['--fg']})`;

  return (
    <div className="w-[304px]">
      <div className="flex flex-wrap gap-1 p-1 mb-4 bg-bg-3 rounded-md">
        {PREVIEW_SCREENS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScreen(s.id)}
            className={cn(
              'flex-1 basis-[30%] text-xs font-medium py-1.5 rounded transition-colors',
              screen === s.id ? 'bg-bg-2 text-fg shadow-sm' : 'text-fg-2 hover:text-fg',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div
        className="relative mx-auto"
        style={{
          width: SCREEN_W + BEZEL * 2,
          height: SCREEN_H + BEZEL * 2,
          borderRadius: 54,
          // Titânio escovado: as faixas claras e escuras alternadas são o que
          // diferencia de um retângulo preto qualquer.
          background:
            'linear-gradient(148deg, #dcdce1 0%, #9a9aa2 16%, #62626a 38%, #c2c2c9 58%, #6f6f77 82%, #d2d2d8 100%)',
          boxShadow: '0 18px 40px -12px rgb(0 0 0 / 0.35), 0 2px 6px rgb(0 0 0 / 0.18)',
        }}
      >
        <SideButton className="left-[-2px] top-[110px] h-[26px]" />
        <SideButton className="left-[-2px] top-[152px] h-[44px]" />
        <SideButton className="left-[-2px] top-[206px] h-[44px]" />
        <SideButton className="right-[-2px] top-[168px] h-[64px]" />

        <div
          className="absolute overflow-hidden"
          style={{
            inset: BEZEL,
            borderRadius: 45,
            background: screenBg,
            boxShadow: 'inset 0 0 0 1.5px rgb(0 0 0 / 0.9)',
          }}
        >
          <iframe
            ref={iframeRef}
            src={`/portal-preview/${tenantId}`}
            title="Prévia da central do cliente"
            className="block border-0"
            style={{
              width: IPHONE_16_PRO_MAX.width,
              height: IPHONE_16_PRO_MAX.height,
              transform: `scale(${SCALE})`,
              transformOrigin: 'top left',
            }}
          />

          <StatusBar color={screenFg} scale={SCALE} />
          <DynamicIsland scale={SCALE} />
          <HomeIndicator color={screenFg} scale={SCALE} />
        </div>
      </div>

      <p className="text-xs text-fg-2 text-center mt-4 leading-relaxed">
        Prévia real da central, com sua marca e um cliente de exemplo.
        <br />
        Acompanha o que você edita — salve para publicar.
      </p>
    </div>
  );
}

function SideButton({ className }: { className: string }) {
  return (
    <div
      className={cn('absolute w-[3px] rounded-full', className)}
      style={{ background: 'linear-gradient(180deg, #8c8c94, #5e5e66)' }}
    />
  );
}
