'use client';

// Convite para ativar os avisos de fatura.
//
// Mesmo formato e mesmo lugar do convite de instalar — e por isso os dois
// nunca aparecem juntos. Quem está no navegador do celular vê primeiro o de
// instalar; este só entra depois que o assinante instalou ou dispensou
// aquele. Dentro do app da Play, onde instalar não faz sentido, é o único.
//
// "Agora não" guarda a dispensa por 30 dias. Quem negou a permissão no
// aparelho nunca mais vê o convite: pedir de novo não abre a pergunta, e o
// caminho de volta fica na tela Conta.

import { useCallback, useEffect, useState } from 'react';
import type { Tenant } from '@/lib/supabase/types';
import { usePortalTokens } from './theme';
import { Icon } from './icons';
import { convitePendente, jaEhAplicativo, semAnimacao, vidro } from './install-prompt';
import { ativarAvisos, estadoDosAvisos } from './push';

const CHAVE_DISPENSA = 'portal.avisos.dispensado';
const DIAS_DE_ESPERA = 30;
const ATRASO_MS = 4000;
const DURACAO_MS = 260;

function dispensadoHaPouco(): boolean {
  try {
    const quando = Number(window.localStorage.getItem(CHAVE_DISPENSA));
    return Number.isFinite(quando) && quando > 0 && Date.now() - quando < DIAS_DE_ESPERA * 86_400_000;
  } catch {
    return false;
  }
}

function dispensar() {
  try {
    window.localStorage.setItem(CHAVE_DISPENSA, String(Date.now()));
  } catch {
    /* navegação privada: o convite volta na próxima visita, e tudo bem */
  }
}

export function PushPrompt({ tenant, chavePublica }: { tenant: Tenant; chavePublica: string }) {
  const t = usePortalTokens(tenant);
  const [visivel, setVisivel] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [ativando, setAtivando] = useState(false);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (dispensadoHaPouco()) return;
    // No navegador do celular, o convite de instalar tem a vez.
    const celular = window.matchMedia('(max-width: 1023px)').matches;
    if (celular && !jaEhAplicativo() && convitePendente()) return;

    let cancelado = false;
    let timer = 0;
    estadoDosAvisos().then((estado) => {
      if (cancelado || estado !== 'inativo') return;
      timer = window.setTimeout(() => {
        setVisivel(true);
        window.requestAnimationFrame(() => setAberto(true));
      }, ATRASO_MS);
    });
    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, []);

  const fechar = useCallback((lembrar: boolean) => {
    if (lembrar) dispensar();
    setAberto(false);
    window.setTimeout(() => setVisivel(false), semAnimacao() ? 0 : DURACAO_MS);
  }, []);

  const ativar = useCallback(async () => {
    setAtivando(true);
    setErro(false);
    try {
      const estado = await ativarAvisos(chavePublica);
      // Ativou, ou negou na pergunta do aparelho: em ambos o assunto acabou.
      // Só "fechou a pergunta sem responder" deixa o convite voltar depois.
      if (estado === 'inativo') dispensar();
      fechar(false);
    } catch {
      setErro(true);
    } finally {
      setAtivando(false);
    }
  }, [chavePublica, fechar]);

  if (!visivel) return null;
  const reduzido = semAnimacao();

  return (
    <div
      role="dialog"
      aria-label="Ativar avisos de fatura"
      className="lg:!bottom-6 lg:!left-auto lg:!right-6"
      style={{
        position: 'fixed',
        bottom: 104,
        left: 14,
        right: 14,
        maxWidth: 420,
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
        <span
          style={{
            flexShrink: 0,
            width: 44,
            height: 44,
            borderRadius: t.radiusSm,
            display: 'grid',
            placeItems: 'center',
            background: t.accentSoft,
            color: t.accent,
          }}
        >
          <Icon name="bell" size={20} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 650, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
            Receba um aviso antes da sua fatura vencer
          </div>
          <div style={{ fontSize: 12.5, color: t.text2, lineHeight: 1.45, marginTop: 3 }}>
            {erro
              ? 'Não deu para ativar agora. Tente de novo em instantes.'
              : 'O aviso chega no celular, com o Pix a um toque. Você desliga quando quiser em Conta.'}
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

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          type="button"
          onClick={ativar}
          disabled={ativando}
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
            cursor: ativando ? 'default' : 'pointer',
            opacity: ativando ? 0.7 : 1,
          }}
        >
          <Icon name="bell" size={16} />
          {ativando ? 'Ativando…' : 'Ativar avisos'}
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
    </div>
  );
}
