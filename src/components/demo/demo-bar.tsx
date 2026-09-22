'use client';

// Faixa de cima da demonstração.
//
// Fica de propósito fora do tema do provedor — escura, sóbria, com cara de
// moldura — para que quem abre o link nunca confunda a barra com a central.
// Tudo abaixo dela é o produto; ela é o LinkHub falando.
//
// Também é onde a demonstração ganha o que uma central de verdade não tem: a
// troca de layout ao vivo. É o argumento de venda mais difícil de explicar
// por escrito ("são três modelos de portal") e o mais fácil de mostrar com
// dois cliques.

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { TenantLayout } from '@/lib/supabase/types';
import { DEMO_LAYOUTS, DEMO_LAYOUT_COOKIE } from '@/lib/demo/tenant';

const CSS = `
.demo-bar{position:sticky;top:0;z-index:60;background:#0d0f17;color:#e9ecf5;
  border-bottom:1px solid rgba(255,255,255,.10);display:flex;align-items:center;
  gap:12px;padding:8px 14px;font-size:12px;line-height:1.2;flex-wrap:wrap}
.demo-bar a{color:inherit}
.demo-selo{display:flex;align-items:center;gap:7px;font-weight:700;white-space:nowrap}
.demo-ponto{width:7px;height:7px;border-radius:50%;background:#34d399;flex:none;
  box-shadow:0 0 0 3px rgba(52,211,153,.22)}
.demo-nota{color:#9aa2b8;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.demo-dir{margin-left:auto;display:flex;align-items:center;gap:8px}
.demo-grupo{display:flex;gap:3px;padding:3px;border-radius:9px;
  background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08)}
.demo-opcao{border:none;background:transparent;color:#9aa2b8;font:inherit;font-weight:600;
  padding:4px 10px;border-radius:6px;cursor:pointer}
.demo-opcao[aria-pressed="true"]{background:#e9ecf5;color:#0d0f17}
.demo-opcao:disabled{cursor:progress;opacity:.7}
.demo-sair{padding:5px 11px;border-radius:8px;font-weight:600;
  border:1px solid rgba(255,255,255,.16);background:transparent;color:#e9ecf5;
  font:inherit;font-weight:600;cursor:pointer}
.demo-rotulo{color:#6f778d;font-weight:600;white-space:nowrap}
@media (max-width: 720px){
  .demo-nota,.demo-rotulo{display:none}
  .demo-bar{gap:8px;padding:7px 10px}
}
`;

export function DemoBar({ layout, sair }: { layout: TenantLayout; sair: string }) {
  const router = useRouter();
  const [trocando, iniciarTroca] = useTransition();

  function escolher(proximo: TenantLayout) {
    if (proximo === layout) return;
    // Mesmo caminho do tema da central: cookie lido no servidor, para que a
    // primeira pintura já venha no layout certo em vez de piscar.
    document.cookie = `${DEMO_LAYOUT_COOKIE}=${proximo}; path=/; max-age=86400; samesite=lax`;
    iniciarTroca(() => router.refresh());
  }

  return (
    <div className="demo-bar">
      <style>{CSS}</style>

      <span className="demo-selo">
        <span className="demo-ponto" aria-hidden />
        Demonstração
      </span>
      <span className="demo-nota">
        Assinante, faturas e consumo são fictícios. Nada aqui é cobrança.
      </span>

      <div className="demo-dir">
        <span className="demo-rotulo">Layout</span>
        <div className="demo-grupo" role="group" aria-label="Layout da central">
          {DEMO_LAYOUTS.map((opcao) => (
            <button
              key={opcao.key}
              type="button"
              className="demo-opcao"
              title={opcao.hint}
              aria-pressed={opcao.key === layout}
              disabled={trocando}
              onClick={() => escolher(opcao.key)}
            >
              {opcao.label}
            </button>
          ))}
        </div>
        {/* O endereço vem de cima: a demonstração atende em dois hosts e a
            saída é `/sair` num, `/demo/sair` no outro. */}
        <form action={sair} method="post">
          <button type="submit" className="demo-sair">
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
