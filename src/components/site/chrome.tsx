'use client';

// Peças interativas do site público: a barra de navegação, o accordion do FAQ
// e os dois utilitários de motion (entrada por scroll e contador de números).
//
// Vivem juntas por serem tudo que precisa de navegador nesta parte do app — a
// landing em si é server component e não carrega JavaScript nenhum além disto.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/portal/icons';

/* -------------------------------------------------------------------- motion */

/**
 * Entrada de seção: sobe 24px e aparece, uma vez só, quando 15% do bloco
 * entra na tela. Quem pediu menos movimento no sistema recebe o conteúdo
 * parado — a regra mora no CSS, em prefers-reduced-motion.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) {
          setVisivel(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={['lh-reveal', className].filter(Boolean).join(' ')}
      data-visible={visivel}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * Número que sobe de zero ao entrar na tela.
 *
 * `tabular-nums` é obrigatório: sem ele cada dígito tem largura própria e a
 * linha inteira treme enquanto conta.
 */
export function CountUp({
  end,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1400,
}: {
  end: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [valor, setValor] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (parado) {
      setValor(end);
      return;
    }

    const io = new IntersectionObserver(
      (entradas) => {
        if (!entradas[0]?.isIntersecting) return;
        io.disconnect();
        const inicio = performance.now();
        const passo = (agora: number) => {
          const p = Math.min((agora - inicio) / duration, 1);
          setValor(end * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(passo);
        };
        requestAnimationFrame(passo);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}
      {valor.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/* ----------------------------------------------------------------- navegação */

const LINKS = [
  { href: '#produto', label: 'Produto' },
  { href: '#integracoes', label: 'Integrações' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#perguntas', label: 'Perguntas' },
];

export function SiteNav({ demoUrl }: { demoUrl: string }) {
  const [rolou, setRolou] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 24);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  // Menu aberto trava a rolagem de trás. Sem isto o fundo desliza sob o painel.
  useEffect(() => {
    document.body.style.overflow = aberto ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [aberto]);

  return (
    <header
      className={[
        'sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-250',
        rolou
          ? 'bg-bg/80 backdrop-blur-xl border-b border-border'
          : 'bg-transparent border-b border-transparent',
      ].join(' ')}
    >
      <div className="mx-auto max-w-container px-[var(--gutter)] h-[68px] flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="LinkHub, página inicial">
          <LogoMark />
          <span className="text-[15px] font-extrabold tracking-[-0.02em]">LinkHub</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7" aria-label="Seções do site">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13.5px] font-medium text-fg-2 hover:text-fg transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <a
            href={demoUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex text-[13.5px] font-semibold text-fg-2 hover:text-fg transition-colors px-3 h-9 items-center"
          >
            Ver demonstração
          </a>
          <Link
            href="/login"
            className="hidden sm:inline-flex text-[13.5px] font-semibold text-fg-2 hover:text-fg transition-colors px-3 h-9 items-center"
          >
            Entrar
          </Link>
          <Link href="/signup" className="lh-btn lh-btn--primary !h-9 !px-4 !text-[13px]">
            Criar portal
          </Link>
          <button
            type="button"
            className="md:hidden w-9 h-9 flex items-center justify-center text-fg-2"
            aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={aberto}
            onClick={() => setAberto((v) => !v)}
          >
            <Icon name={aberto ? 'x' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      {aberto && (
        <div className="md:hidden fixed inset-x-0 top-[68px] bottom-0 bg-bg border-t border-border px-[var(--gutter)] py-8 flex flex-col gap-1 overflow-y-auto">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setAberto(false)}
              className="text-2xl font-bold tracking-[-0.02em] py-3 border-b border-border"
            >
              {l.label}
            </a>
          ))}
          <a
            href={demoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-2xl font-bold tracking-[-0.02em] py-3 border-b border-border text-brand"
          >
            Ver demonstração
          </a>
          <Link href="/login" onClick={() => setAberto(false)} className="lh-btn lh-btn--ghost mt-6">
            Entrar na minha conta
          </Link>
          <Link href="/signup" onClick={() => setAberto(false)} className="lh-btn lh-btn--primary mt-2">
            Criar portal grátis
          </Link>
        </div>
      )}
    </header>
  );
}

/** A marca. Quadrado com o traço de sinal — o mesmo desenho do ícone do app. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <span
      className="rounded-[9px] bg-brand text-brand-fg flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M4 10a12 12 0 0 1 16 0" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M7.5 14a7 7 0 0 1 9 0" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="12" cy="18.2" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

/* ----------------------------------------------------------------------- FAQ */

export function Faq({ itens }: { itens: { q: string; a: string }[] }) {
  const [aberto, setAberto] = useState<number | null>(0);

  return (
    <div className="border-t border-border">
      {itens.map((item, i) => {
        const ativo = aberto === i;
        return (
          <div key={item.q} className="lh-faq border-b border-border" data-open={ativo}>
            <h3>
              <button
                type="button"
                onClick={() => setAberto(ativo ? null : i)}
                aria-expanded={ativo}
                className="w-full flex items-center gap-4 py-5 text-left"
              >
                <span className="flex-1 text-[16px] font-semibold tracking-[-0.01em]">{item.q}</span>
                <span className="lh-faq-chevron text-brand shrink-0">
                  <Icon name="chevron" size={16} style={{ transform: 'rotate(90deg)' }} />
                </span>
              </button>
            </h3>
            <div className="lh-faq-answer">
              <div>
                <p className="text-[14.5px] text-fg-2 leading-relaxed pb-5 max-w-[62ch]">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
