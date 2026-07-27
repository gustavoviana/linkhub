'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { tenantThemeVars } from '@/lib/tenant/theme';
import {
  PREVIEW_READY,
  PREVIEW_UPDATE,
  type PreviewScreen,
  type PreviewTheme,
} from '@/lib/tenant/preview-protocol';
import { cn } from '@/lib/utils';

// Mockup de iPhone 16 Pro Max em escala. As medidas são as reais do aparelho
// em pontos — a tela é um iframe de 440×956 reduzido por transform, então o
// que aparece aqui é o portal de verdade renderizando em largura de celular,
// com os breakpoints se comportando como no aparelho.

const VIEWPORT_W = 440;
const VIEWPORT_H = 956;
const SCALE = 0.62;
const SCREEN_W = VIEWPORT_W * SCALE;
const SCREEN_H = VIEWPORT_H * SCALE;
const BEZEL = 9;

const SCREENS: { id: PreviewScreen; label: string }[] = [
  { id: 'home', label: 'Início' },
  { id: 'login', label: 'Entrada' },
];

export function PhonePreview({ tenantId, theme }: { tenantId: string; theme: PreviewTheme }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [readyToken, setReadyToken] = useState(0);
  const [screen, setScreen] = useState<PreviewScreen>('home');

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
      <div className="flex items-center gap-1 p-1 mb-4 bg-bg-3 rounded-md">
        {SCREENS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScreen(s.id)}
            className={cn(
              'flex-1 text-xs font-medium py-1.5 rounded transition-colors',
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
              width: VIEWPORT_W,
              height: VIEWPORT_H,
              transform: `scale(${SCALE})`,
              transformOrigin: 'top left',
            }}
          />

          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pointer-events-none select-none"
            style={{ height: 27, color: screenFg }}
          >
            {/* 9:41 — a hora que a Apple usa em todo material do iPhone. */}
            <span className="text-[11px] font-semibold tracking-tight">9:41</span>
            <StatusIcons color={screenFg} />
          </div>

          <div
            className="absolute rounded-full bg-black"
            style={{
              width: 125 * SCALE,
              height: 37 * SCALE,
              top: 7,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />

          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 140 * SCALE,
              height: 4,
              bottom: 7,
              left: '50%',
              transform: 'translateX(-50%)',
              background: screenFg,
              opacity: 0.35,
            }}
          />
        </div>
      </div>

      <p className="text-xs text-fg-2 text-center mt-4 leading-relaxed">
        Prévia real da central, com dados de exemplo.
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

function StatusIcons({ color }: { color: string }) {
  return (
    <span className="flex items-center gap-1">
      <svg width="15" height="10" viewBox="0 0 17 11" fill={color} aria-hidden>
        <rect x="0" y="7.5" width="3" height="3.5" rx="1" opacity="0.95" />
        <rect x="4.5" y="5.5" width="3" height="5.5" rx="1" opacity="0.95" />
        <rect x="9" y="3" width="3" height="8" rx="1" opacity="0.95" />
        <rect x="13.5" y="0.5" width="3" height="10.5" rx="1" opacity="0.4" />
      </svg>
      <svg width="13" height="10" viewBox="0 0 15 11" fill="none" stroke={color} aria-hidden>
        <path d="M1 3.6a9.5 9.5 0 0 1 13 0" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M3.6 6.4a5.8 5.8 0 0 1 7.8 0" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="7.5" cy="9.3" r="1.1" fill={color} stroke="none" />
      </svg>
      <svg width="19" height="10" viewBox="0 0 25 12" aria-hidden>
        <rect
          x="0.6"
          y="0.6"
          width="21"
          height="10.8"
          rx="3"
          fill="none"
          stroke={color}
          strokeOpacity="0.4"
          strokeWidth="1.2"
        />
        <rect x="2.4" y="2.4" width="14" height="7.2" rx="1.8" fill={color} />
        <path d="M23 4.2v3.6a2 2 0 0 0 0-3.6Z" fill={color} fillOpacity="0.5" />
      </svg>
    </span>
  );
}
