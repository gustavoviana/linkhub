import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Cabeçalho das telas do painel.
//
// Fica grudado no topo porque as telas de configuração são longas e as ações
// principais moram aqui: rolar até o fim para achar "salvar" é o jeito mais
// fácil de fazer alguém desistir de salvar.

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-xl border-b border-border">
      <div className="px-6 lg:px-8 py-5 flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-brand mb-2">
              {eyebrow}
            </div>
          )}
          <h1 className="text-[22px] font-extrabold tracking-[-0.03em] leading-none">{title}</h1>
          {description && (
            <p className="text-[13px] text-fg-2 mt-2 leading-relaxed max-w-[68ch]">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2.5 flex-wrap shrink-0">{actions}</div>}
      </div>
    </header>
  );
}

/** Título de bloco dentro de uma tela longa. */
export function SectionLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 mb-3">
      <h2 className="text-[11px] font-bold tracking-[0.12em] uppercase text-fg-3">{children}</h2>
      {hint && <span className="text-[11.5px] text-fg-3">{hint}</span>}
      <span className="flex-1 h-px bg-border" />
    </div>
  );
}

/**
 * Uma tela do painel: cabeçalho grudado no topo e o corpo com o respiro
 * padrão. Existe para que as nove telas tenham a mesma moldura sem repetir
 * a estrutura em cada arquivo — e para que mudar o respiro seja um lugar só.
 */
export function AdminScreen({
  eyebrow,
  title,
  description,
  actions,
  largura,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Limite de leitura do corpo. Formulário pede coluna estreita; tabela, larga. */
  largura?: string;
  children: ReactNode;
}) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      <div className={cn('px-6 lg:px-8 py-6', largura)}>{children}</div>
    </>
  );
}
