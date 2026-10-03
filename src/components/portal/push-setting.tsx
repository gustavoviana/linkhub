'use client';

// "Avisos neste aparelho", na tela Conta. É o caminho de volta para quem
// dispensou o convite, e o jeito de desligar sem mexer nas configurações do
// celular.

import { useEffect, useState } from 'react';
import type { PortalTokens } from './tokens';
import {
  DICA_PERMISSAO,
  ESPERA_DA_DICA_MS,
  ativarAvisos,
  desativarAvisos,
  estadoDosAvisos,
  mensagemDeErro,
  type EstadoDosAvisos,
} from './push';

export function PushSetting({ t, chavePublica }: { t: PortalTokens; chavePublica: string }) {
  const [estado, setEstado] = useState<EstadoDosAvisos | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [esperandoResposta, setEsperandoResposta] = useState(false);

  useEffect(() => {
    estadoDosAvisos().then(setEstado).catch(() => setEstado('indisponivel'));
  }, []);

  // iPhone fora do app instalado, navegador antigo: não há o que oferecer.
  if (!estado || estado === 'indisponivel') return null;

  const ligado = estado === 'ativo';

  async function alternar() {
    setOcupado(true);
    setErro(null);
    const dica = window.setTimeout(() => {
      if (Notification.permission === 'default') setEsperandoResposta(true);
    }, ESPERA_DA_DICA_MS);
    try {
      setEstado(ligado ? await desativarAvisos() : await ativarAvisos(chavePublica));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      window.clearTimeout(dica);
      setEsperandoResposta(false);
      setOcupado(false);
    }
  }

  const legenda =
    estado === 'negado'
      ? 'Bloqueados nas configurações do aparelho. Libere as notificações deste app para voltar a receber.'
      : erro
        ? erro
        : esperandoResposta
          ? DICA_PERMISSAO
          : ligado
          ? 'Você recebe aviso de fatura e recados importantes do provedor.'
          : 'Ative para receber aviso antes da fatura vencer.';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Avisos neste aparelho</div>
        <div style={{ fontSize: 12.5, color: t.text2, lineHeight: 1.45, marginTop: 2 }}>{legenda}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={ligado}
        aria-label="Avisos neste aparelho"
        disabled={ocupado || estado === 'negado'}
        onClick={alternar}
        style={{
          flexShrink: 0,
          width: 48,
          height: 28,
          borderRadius: 999,
          border: 'none',
          padding: 3,
          background: ligado ? t.accent : t.borderSoft,
          opacity: ocupado || estado === 'negado' ? 0.5 : 1,
          cursor: ocupado || estado === 'negado' ? 'default' : 'pointer',
          transition: 'background 160ms ease',
        }}
      >
        <span
          style={{
            display: 'block',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: ligado ? t.accentFg : t.surfaceSolid,
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            transform: ligado ? 'translateX(20px)' : 'translateX(0)',
            transition: 'transform 160ms ease',
          }}
        />
      </button>
    </div>
  );
}
