'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePortalRuntime } from './runtime';
import type { PortalTokens } from './tokens';

/**
 * O provedor ligou o chat (tenant_chat)?
 *
 * Decidido uma vez no layout da central e lido pelo menu lateral e pelos
 * atalhos da tela inicial, que aparecem em toda tela e não recebem dados da
 * página. Fora do provider (demonstração, prévia do painel) vale `false`.
 */
const ChatAtivoContext = createContext(false);

export function ChatProvider({ ativo, children }: { ativo: boolean; children: React.ReactNode }) {
  return <ChatAtivoContext.Provider value={ativo}>{children}</ChatAtivoContext.Provider>;
}

export function useChatAtivo() {
  return useContext(ChatAtivoContext);
}

/**
 * Pede ao servidor o link pessoal do chat e abre.
 *
 * Na mesma janela, e não num iframe nem em aba nova: o atendimento recusa ser
 * embutido (X-Frame-Options), e aba aberta depois de um fetch é bloqueada como
 * pop-up. No app Android, endereço fora da central abre numa aba por cima, e o
 * voltar devolve o cliente para cá.
 */
export function useChat() {
  const { demo } = usePortalRuntime();
  const [abrindo, setAbrindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function abrir() {
    setErro(null);
    if (demo) {
      setErro('Na demonstração o chat não abre. Na central do provedor, o cliente entra no atendimento já identificado.');
      return;
    }
    setAbrindo(true);
    const r = await fetch('/api/portal/chat', { method: 'POST' }).catch(() => null);
    if (!r) {
      setAbrindo(false);
      return setErro('Não conseguimos falar com o servidor. Confira sua conexão.');
    }
    if (!r.ok) {
      setAbrindo(false);
      return setErro((await r.text()) || 'Não conseguimos abrir o chat agora.');
    }
    const { url } = (await r.json()) as { url: string };
    // `abrindo` fica ligado: a página está saindo, e o botão não pode
    // aceitar um segundo toque que geraria outro link.
    window.location.assign(url);
    // Quem volta pelo botão do navegador recebe esta página do cache, com o
    // estado congelado em "Abrindo…". Ao reaparecer, o botão se solta.
    window.addEventListener('pageshow', () => setAbrindo(false), { once: true });
  }

  return { abrir, abrindo, erro };
}

export type ChatDoPortal = ReturnType<typeof useChat>;

/**
 * Aviso de erro para os atalhos sem espaço embaixo (menu, ícones da tela
 * inicial). Flutua acima da barra do celular e some sozinho.
 */
export function ChatErro({ t, erro }: { t: PortalTokens; erro: string | null }) {
  const [visivel, setVisivel] = useState<string | null>(null);
  useEffect(() => {
    if (!erro) return;
    setVisivel(erro);
    const id = window.setTimeout(() => setVisivel(null), 6000);
    return () => window.clearTimeout(id);
  }, [erro]);
  if (!visivel) return null;
  return (
    <div
      role="alert"
      onClick={() => setVisivel(null)}
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 'calc(96px + env(safe-area-inset-bottom))',
        margin: '0 auto',
        maxWidth: 420,
        zIndex: 60,
        padding: '12px 14px',
        borderRadius: 12,
        background: t.surfaceSolid,
        border: `1px solid ${t.danger}`,
        color: t.text,
        fontSize: 13,
        lineHeight: 1.5,
        boxShadow: '0 12px 30px -10px rgba(0,0,0,0.35)',
      }}
    >
      {visivel}
    </div>
  );
}
