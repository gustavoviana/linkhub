'use client';

// Login do painel do provedor.
//
// Duas colunas: o formulário à esquerda, no fundo mais escuro, e o painel de
// marca à direita, um degrau acima. No celular a coluna da direita some — ela
// é argumento de venda, e quem já está entrando não precisa ser convencido de
// novo, precisa do campo de e-mail acima da dobra.

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Icon, type IconName } from '@/components/portal/icons';
import { LogoMark } from '@/components/site/chrome';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('failed to fetch') || m.includes('networkerror')) {
    return 'Não conseguimos falar com o servidor. Verifique sua conexão e tente de novo.';
  }
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar. Veja sua caixa de entrada.';
  if (m.includes('too many requests')) return 'Muitas tentativas seguidas. Espere um minuto.';
  return message;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(translateError(error.message));
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1.05fr] bg-bg">
      {/* ------------------------------------------------------- formulário */}
      <div className="px-[var(--gutter)] py-10 lg:px-16 lg:py-12 flex flex-col relative">
        <Link href="/" className="flex items-center gap-2.5 w-fit">
          <LogoMark size={30} />
          <span className="text-[15px] font-extrabold tracking-[-0.02em]">LinkHub</span>
          <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-fg-3 border-l border-border pl-2.5 ml-0.5">
            Painel
          </span>
        </Link>

        <div className="my-auto w-full max-w-[400px] py-12">
          <h1 className="lh-display text-[clamp(1.9rem,4vw,2.4rem)]">Entre na sua conta</h1>
          <p className="text-[14.5px] text-fg-2 mt-3 leading-relaxed">
            Gerencie a central do assinante do seu provedor.
          </p>

          <form onSubmit={onSubmit} className="mt-9 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-fg-2 mb-2">
                E-mail corporativo
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@provedor.com.br"
                aria-invalid={error ? true : undefined}
                className="lh-input"
              />
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label htmlFor="senha" className="text-xs font-semibold text-fg-2">
                  Senha
                </label>
                <Link
                  href="/esqueci-senha"
                  className="text-xs font-semibold text-brand hover:underline underline-offset-4"
                >
                  Esqueci a senha
                </Link>
              </div>
              <div className="relative">
                <input
                  id="senha"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  className="lh-input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-3 hover:text-fg transition-colors p-1"
                >
                  <Icon name="eye" size={17} />
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex gap-2.5 text-[13px] text-danger bg-danger/10 border border-danger/25 rounded-[10px] px-3.5 py-3"
              >
                <span className="shrink-0 mt-px">
                  <Icon name="shield" size={15} />
                </span>
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="lh-btn lh-btn--primary w-full !mt-6">
              {loading ? (
                'Entrando…'
              ) : (
                <>
                  Entrar no painel
                  <Icon name="arrow-right" size={16} className="lh-arrow" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-[13.5px] text-fg-2">
          Ainda não tem conta?{' '}
          <Link href="/signup" className="text-brand font-semibold hover:underline underline-offset-4">
            Criar provedor grátis
          </Link>
        </div>
      </div>

      {/* ---------------------------------------------------- painel de marca */}
      <aside className="hidden lg:flex relative overflow-hidden bg-bg-2 border-l border-border flex-col justify-center px-14 xl:px-20">
        <div className="lh-grid" />
        <div
          className="lh-glow"
          style={{ top: -140, right: -120, width: 520, height: 520, background: 'rgb(var(--brand))' }}
        />
        <div
          className="lh-glow"
          style={{ bottom: -180, left: -140, width: 420, height: 420, background: 'rgb(var(--accent))', opacity: 0.1 }}
        />

        <div className="relative max-w-[440px]">
          <span className="lh-eyebrow lh-eyebrow--pill">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            IXC · SGP · Hubsoft · MK
          </span>

          <h2 className="lh-display text-[clamp(1.6rem,2.4vw,2.1rem)] mt-6">
            O seu provedor atende <span className="text-brand">enquanto você dorme</span>.
          </h2>

          <p className="text-[14px] text-fg-2 leading-relaxed mt-4">
            Fatura, Pix, boleto, consumo e chamado — o assinante resolve sozinho, na sua marca e no
            seu domínio.
          </p>

          <div className="flex flex-col gap-3 mt-9">
            {(
              [
                ['pix', '2ª via em um toque', 'Pix copia e cola, QR Code e boleto em PDF'],
                ['flash', 'A marca é sua', 'Logo, cores, domínio e app na Play Store'],
                ['refresh', 'Sempre em dia com o ERP', 'Sincronização automática a cada 6 horas'],
              ] as [IconName, string, string][]
            ).map(([icone, titulo, texto]) => (
              <div key={titulo} className="lh-card p-4 flex gap-3.5 items-start">
                <span className="w-9 h-9 rounded-[11px] bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <Icon name={icone} size={17} />
                </span>
                <div>
                  <div className="text-[13.5px] font-bold tracking-[-0.01em]">{titulo}</div>
                  <div className="text-[12.5px] text-fg-2 mt-1 leading-relaxed">{texto}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-8 mt-10 pt-8 border-t border-border">
            {[
              ['4', 'ERPs integrados'],
              ['3', 'layouts de central'],
              ['0', 'linhas de código'],
            ].map(([n, rotulo]) => (
              <div key={rotulo}>
                <div className="text-[26px] font-extrabold tracking-[-0.04em] leading-none font-mono">
                  {n}
                </div>
                <div className="text-[11.5px] text-fg-3 mt-1.5">{rotulo}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
