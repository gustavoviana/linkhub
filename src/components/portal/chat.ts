'use client';

import { useState } from 'react';
import { usePortalRuntime } from './runtime';

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
