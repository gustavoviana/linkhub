'use client';

import { createContext, useContext } from 'react';
import NextLink from 'next/link';
import { portalHref, usePortalRuntime } from './runtime';

// Dentro do mockup de prévia o portal roda em /portal-preview/[id], então um
// <Link href="/fatura"> aponta para uma rota que não existe naquele contexto —
// o prefetch do Next enchia o console de 404. Aqui os links viram estáticos
// quando estão na prévia, e continuam sendo Link de verdade no portal.
//
// E quando a central está montada sob um prefixo — a demonstração, em
// /demo/central —, é aqui que ele entra. As telas seguem escrevendo o
// endereço curto, "/fatura", que é o endereço no portal do provedor.

export const PreviewContext = createContext(false);

export function useIsPreview() {
  return useContext(PreviewContext);
}

type NavLinkProps = React.ComponentProps<typeof NextLink>;

export function NavLink({ href, children, ...rest }: NavLinkProps) {
  const preview = useIsPreview();
  const { base } = usePortalRuntime();
  const destino = typeof href === 'string' ? portalHref(base, href) : href;

  if (preview) {
    const { prefetch: _prefetch, replace: _replace, scroll: _scroll, ...anchorProps } = rest;
    return (
      <a
        {...anchorProps}
        href={typeof destino === 'string' ? destino : '#'}
        onClick={(e) => e.preventDefault()}
      >
        {children}
      </a>
    );
  }

  return (
    <NextLink href={destino} {...rest}>
      {children}
    </NextLink>
  );
}
