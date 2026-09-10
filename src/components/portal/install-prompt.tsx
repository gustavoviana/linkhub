'use client';

// Convite para instalar a central na tela inicial do celular.
//
// Instalar um PWA não é a mesma coisa nos dois sistemas, e é isso que dita o
// formato daqui:
//
// - Android: o Chrome avisa que dá para instalar pelo evento
//   `beforeinstallprompt`. Guardamos o evento e chamamos o instalador nativo
//   no clique — instalação de verdade, num toque.
// - iPhone: a Apple não expõe esse evento. O máximo possível é ensinar o
//   caminho (Compartilhar › Adicionar à Tela de Início), então lá o banner
//   vira instrução em vez de botão.
//
// Quem já está dentro do app instalado — PWA ou o pacote da Play, que roda em
// `standalone` — nunca vê nada disso.

import { useCallback, useEffect, useState } from 'react';
import type { Tenant } from '@/lib/supabase/types';
import { usePortalTokens } from './theme';
import { Icon } from './icons';
import type { PortalTokens } from './tokens';

/** Momento em que o assinante dispensou o convite. */
const CHAVE_DISPENSA = 'portal.instalar.dispensado';
/** Marca de que a instalação aconteceu — some para sempre. */
const CHAVE_INSTALADO = 'portal.instalar.instalado';

const DIAS_DE_ESPERA = 30;
/** Respiro antes de aparecer: o assinante abriu a central para ver a conta,
 *  não para ser convidado a instalar. Deixa ele chegar na tela primeiro. */
const ATRASO_MS = 4000;
const DURACAO_MS = 260;

/** O evento do Chrome não está na lib padrão do TypeScript. */
interface EventoDeInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Modo = 'oculto' | 'android' | 'ios';

function leia(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    // Navegação privada e cookies bloqueados derrubam o localStorage. Sem
    // memória, o pior caso é o convite reaparecer — nunca uma tela quebrada.
    return null;
  }
}

function grave(chave: string, valor: string) {
  try {
    window.localStorage.setItem(chave, valor);
  } catch {
    /* idem */
  }
}

/** Já está rodando como aplicativo? Vale para o PWA e para o pacote da Play. */
function jaEhAplicativo(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function ehIPhone(): boolean {
  const ua = window.navigator.userAgent;
  // O iPad moderno se apresenta como Mac; o toque é o que o entrega.
  const iPadDisfarcado = ua.includes('Macintosh') && window.navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadDisfarcado;
}

function convitePendente(): boolean {
  if (leia(CHAVE_INSTALADO)) return false;
  const quando = Number(leia(CHAVE_DISPENSA));
  if (!Number.isFinite(quando) || quando <= 0) return true;
  return Date.now() - quando > DIAS_DE_ESPERA * 86_400_000;
}

function semAnimacao(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Mesmo vidro da barra de abas logo abaixo — as duas peças flutuam sobre o
 *  mesmo conteúdo e destoariam se uma fosse sólida. */
function vidro(t: PortalTokens) {
  const hex = t.surfaceSolid.replace('#', '');
  const canal = (i: number) => parseInt(hex.slice(i, i + 2), 16) || 0;
  const [r, g, b] = hex.length >= 6 ? [canal(0), canal(2), canal(4)] : [255, 255, 255];
  return {
    background: `rgba(${r}, ${g}, ${b}, ${t.dark ? 0.86 : 0.92})`,
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: `1px solid ${t.border}`,
    boxShadow: t.dark
      ? '0 18px 40px -12px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.08)'
      : '0 18px 40px -16px rgba(15,16,27,0.3), inset 0 1px 0 rgba(255,255,255,0.9)',
  };
}

/** Ícone de compartilhar do iOS. Não está no conjunto do portal porque só
 *  serve aqui, e desenhado é melhor do que descrito em palavras. */
function IconeCompartilhar({ size = 15, color }: { size?: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline', verticalAlign: '-2px', margin: '0 1px' }}
      aria-hidden
    >
      <path d="M12 15V3" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" />
    </svg>
  );
}

export function InstallPrompt({ tenant }: { tenant: Tenant }) {
  const t = usePortalTokens(tenant);
  const [modo, setModo] = useState<Modo>('oculto');
  const [aberto, setAberto] = useState(false);
  const [evento, setEvento] = useState<EventoDeInstalacao | null>(null);
  const [temIcone, setTemIcone] = useState(true);

  useEffect(() => {
    if (jaEhAplicativo() || !convitePendente()) return;

    let timer = 0;
    const mostrar = (proximo: Modo) => {
      timer = window.setTimeout(() => {
        setModo(proximo);
        // Um quadro depois, para o navegador ter o estado fechado para animar.
        window.requestAnimationFrame(() => setAberto(true));
      }, ATRASO_MS);
    };

    const aoPoderInstalar = (e: Event) => {
      // Sem isto o Chrome mostra a própria tarja, e ficariam dois convites.
      e.preventDefault();
      setEvento(e as EventoDeInstalacao);
      mostrar('android');
    };

    const aoInstalar = () => {
      grave(CHAVE_INSTALADO, String(Date.now()));
      setAberto(false);
      setModo('oculto');
    };

    window.addEventListener('beforeinstallprompt', aoPoderInstalar);
    window.addEventListener('appinstalled', aoInstalar);

    // No iPhone nenhum evento vai chegar: ou convidamos por conta própria, ou
    // o assinante nunca descobre que dá para instalar.
    if (ehIPhone()) mostrar('ios');

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', aoPoderInstalar);
      window.removeEventListener('appinstalled', aoInstalar);
    };
  }, []);

  const fechar = useCallback((lembrar: boolean) => {
    if (lembrar) grave(CHAVE_DISPENSA, String(Date.now()));
    setAberto(false);
    if (semAnimacao()) {
      setModo('oculto');
      return;
    }
    window.setTimeout(() => setModo('oculto'), DURACAO_MS);
  }, []);

  const instalar = useCallback(async () => {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    setEvento(null);
    // Recusou agora: guarda a dispensa e não insiste. Aceitou: o evento
    // `appinstalled` fecha o banner e encerra o assunto de vez.
    fechar(outcome === 'dismissed');
  }, [evento, fechar]);

  if (modo === 'oculto') return null;

  const reduzido = semAnimacao();

  return (
    <div
      role="dialog"
      aria-label="Instalar a central no celular"
      style={{
        position: 'fixed',
        // Acima da barra de abas, que fica entre 14 e 20px do rodapé conforme
        // o layout do provedor e tem cerca de 60px de altura. Os 104 deixam
        // uma folga de mais ou menos 16px entre as duas peças flutuantes.
        bottom: 104,
        left: 14,
        right: 14,
        maxWidth: 520,
        marginInline: 'auto',
        zIndex: 31,
        borderRadius: t.radius,
        padding: 14,
        ...vidro(t),
        color: t.text,
        opacity: aberto ? 1 : 0,
        transform: aberto ? 'translateY(0)' : 'translateY(16px)',
        transition: reduzido
          ? 'none'
          : `opacity ${DURACAO_MS}ms ease, transform ${DURACAO_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* O ícone que a rota /icons monta para este provedor — o mesmo que
            vai aparecer na tela inicial. Mostrar a logo solta aqui prometia
            uma coisa e o celular entregava outra, além de cortar marca
            deitada dentro do quadrado. */}
{temIcone && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/icons/icon-192.png"
            alt=""
            width={44}
            height={44}
            onError={() => setTemIcone(false)}
            style={{
              flexShrink: 0,
              width: 44,
              height: 44,
              borderRadius: t.radiusSm,
              objectFit: 'cover',
              border: `1px solid ${t.borderSoft}`,
            }}
          />
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 650, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
            Instale a central no seu celular
          </div>
          <div style={{ fontSize: 12.5, color: t.text2, lineHeight: 1.45, marginTop: 3 }}>
            {modo === 'ios' ? (
              <>
                Toque em <IconeCompartilhar color={t.text2} /> na barra do navegador e escolha{' '}
                <strong style={{ color: t.text, fontWeight: 600 }}>Adicionar à Tela de Início</strong>.
              </>
            ) : (
              <>Fatura, Pix e suporte a um toque, direto da tela inicial — sem ocupar espaço.</>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => fechar(true)}
          aria-label="Dispensar"
          style={{
            flexShrink: 0,
            width: 28,
            height: 28,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 999,
            border: 'none',
            background: 'transparent',
            color: t.text3,
            cursor: 'pointer',
          }}
        >
          <Icon name="x" size={15} />
        </button>
      </div>

      {modo === 'android' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            onClick={instalar}
            style={{
              flex: 1,
              height: 40,
              borderRadius: t.radiusSm,
              border: 'none',
              background: t.accent,
              color: t.accentFg,
              fontSize: 13.5,
              fontWeight: 650,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              cursor: 'pointer',
            }}
          >
            <Icon name="download" size={16} />
            Instalar
          </button>
          <button
            type="button"
            onClick={() => fechar(true)}
            style={{
              height: 40,
              padding: '0 14px',
              borderRadius: t.radiusSm,
              border: `1px solid ${t.border}`,
              background: 'transparent',
              color: t.text2,
              fontSize: 13.5,
              fontWeight: 550,
              cursor: 'pointer',
            }}
          >
            Agora não
          </button>
        </div>
      )}
    </div>
  );
}
