'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Atualiza as faturas depois que a tela apareceu.
//
// A central pinta na hora com o que está no banco; a ida até o ERP acontece
// aqui atrás, e a tela só se refaz se algo mudou de verdade. É o que tirou a
// espera de segundos que existia a cada 5 minutos no meio do carregamento.

export function RefreshOnMount() {
  const router = useRouter();
  // StrictMode monta duas vezes em desenvolvimento; uma sincronização basta.
  const jaRodou = useRef(false);

  useEffect(() => {
    if (jaRodou.current) return;
    jaRodou.current = true;

    let vivo = true;
    fetch('/api/portal/sync', { method: 'POST' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vivo && d?.atualizado) router.refresh();
      })
      .catch(() => {
        /* silêncio de propósito: é atualização de fundo, não pode virar erro
           na cara de quem só queria ver a fatura. */
      });

    return () => {
      vivo = false;
    };
  }, [router]);

  return null;
}
