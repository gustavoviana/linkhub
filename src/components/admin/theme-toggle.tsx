'use client';

// O botão de sol e lua do painel.
//
// Grava a escolha num cookie e pede um refresh: o servidor é quem monta o
// tema, então a volta já vem pintada certa. Trocar as variáveis no navegador
// daria o mesmo resultado nesta visita e o tema errado na próxima.

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/portal/icons';
import { ADMIN_THEME_COOKIE, type AdminTheme } from '@/lib/admin/theme';

export function ThemeToggle({ tema }: { tema: AdminTheme }) {
  const router = useRouter();
  const [trocando, iniciar] = useTransition();
  const proximo: AdminTheme = tema === 'dark' ? 'light' : 'dark';

  function trocar() {
    // Um ano: tema é preferência do aparelho, não da sessão.
    document.cookie = `${ADMIN_THEME_COOKIE}=${proximo}; path=/; max-age=31536000; samesite=lax`;
    iniciar(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={trocar}
      disabled={trocando}
      title={proximo === 'light' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
      aria-label={proximo === 'light' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
      className="text-fg-3 hover:text-fg p-1.5 flex rounded-lg hover:bg-bg-3 transition-colors disabled:opacity-60"
    >
      <Icon name={tema === 'dark' ? 'sun' : 'moon'} size={15} />
    </button>
  );
}
