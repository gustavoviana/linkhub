'use client';

// Login do painel — portado de docs/prototipo/src/admin-login.jsx: formulário
// à esquerda, painel de marca à direita com as provas do produto.

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/portal/icons';

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
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg">
      {/* Formulário */}
      <div className="px-8 py-12 lg:px-16 flex flex-col bg-bg-2">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[9px] bg-brand text-brand-fg flex items-center justify-center font-extrabold text-[15px]">
            L
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.01em]">LinkHub Admin</span>
        </Link>

        <div className="my-auto max-w-[380px] w-full py-10">
          <h1 className="text-3xl font-bold tracking-[-0.025em] leading-tight mb-2">Entre na sua conta</h1>
          <p className="text-sm text-fg-2 mb-8 leading-relaxed">
            Gerencie a central do cliente do seu provedor.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-xs font-semibold block mb-1.5">
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
                className="w-full h-11 px-3.5 rounded-[10px] border border-border bg-bg text-fg text-sm outline-none focus:border-brand transition-colors"
              />
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label htmlFor="senha" className="text-xs font-semibold">Senha</label>
                <Link href="/esqueci-senha" className="text-xs text-brand font-medium hover:underline">
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
                  className="w-full h-11 pl-3.5 pr-11 rounded-[10px] border border-border bg-bg text-fg text-sm outline-none focus:border-brand transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3.5 top-3 text-fg-3 hover:text-fg transition-colors"
                >
                  <Icon name="eye" size={17} />
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-[10px] p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[46px] rounded-[10px] bg-brand text-brand-fg text-sm font-semibold disabled:opacity-70 shadow-[0_8px_18px_-8px_rgb(var(--brand)/0.6)]"
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>

        <div className="text-sm text-fg-2">
          Ainda não tem conta?{' '}
          <Link href="/signup" className="text-brand font-semibold hover:underline">
            Criar provedor grátis
          </Link>
        </div>
      </div>

      {/* Painel de marca */}
      <div className="hidden lg:flex bg-bg-3 border-l border-border px-14 py-14 flex-col justify-center relative overflow-hidden">
        <div
          className="absolute -top-36 -right-36 w-[420px] h-[420px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgb(var(--brand) / 0.2), transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -left-24 w-[380px] h-[380px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgb(var(--accent) / 0.18), transparent 70%)' }}
        />

        <div className="relative max-w-[400px]">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-2 border border-border text-[11px] font-semibold text-brand mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-success" /> IXC · SGP · Hubsoft integrados
          </div>
          <h2 className="text-[26px] font-bold tracking-[-0.02em] leading-tight mb-3.5">
            Sua central do cliente, pronta em minutos.
          </h2>
          <p className="text-sm text-fg-2 leading-relaxed mb-8">
            Conecte seu ERP, aplique sua marca e libere 2ª via, Pix, boleto e atendimento — sem
            escrever uma linha de código.
          </p>

          <div className="flex flex-col gap-3">
            {[
              ['Pagamento via Pix e boleto', 'O cliente resolve sozinho, a qualquer hora'],
              ['Marca 100% sua', 'Logo, cores, layout e domínio próprio'],
              ['Sincronização com o ERP', 'Faturas e contratos sempre atualizados'],
            ].map(([title, sub]) => (
              <div key={title} className="flex gap-3 items-start">
                <div className="w-[22px] h-[22px] rounded-[7px] bg-brand text-brand-fg flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="check" size={13} />
                </div>
                <div>
                  <div className="text-[13.5px] font-semibold">{title}</div>
                  <div className="text-[12.5px] text-fg-2 mt-0.5">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
