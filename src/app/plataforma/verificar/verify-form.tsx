'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/portal/icons';

// Segundo fator na entrada do painel da plataforma.

export default function VerifyForm({ email }: { email: string }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  async function verificar(valor: string) {
    setVerificando(true);
    setErro(null);
    const supabase = createClient();

    const { data: fatores, error: erroFatores } = await supabase.auth.mfa.listFactors();
    const fator = fatores?.totp?.find((f) => f.status === 'verified') ?? fatores?.totp?.[0];
    if (erroFatores || !fator) {
      setVerificando(false);
      setErro('Não encontramos o aplicativo autenticador desta conta.');
      return;
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: fator.id,
      code: valor,
    });
    setVerificando(false);

    if (error) {
      setErro('Código incorreto ou expirado. O código muda a cada 30 segundos.');
      setCodigo('');
      input.current?.focus();
      return;
    }

    router.replace('/plataforma');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#12141c] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-[30px] h-[30px] rounded-[9px] bg-white text-[#12141c] flex items-center justify-center font-extrabold text-sm">
            L
          </div>
          <div>
            <div className="text-[14px] font-semibold text-white leading-tight">LinkHub</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-white/45">Plataforma</div>
          </div>
        </div>

        <div className="bg-bg-2 border border-border rounded-lg p-6 space-y-5">
          <div>
            <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center mb-3">
              <Icon name="shield" size={18} />
            </div>
            <h1 className="text-lg font-bold">Verificação em duas etapas</h1>
            <p className="text-sm text-fg-2 mt-1 leading-relaxed">
              Abra o aplicativo autenticador e digite o código de 6 dígitos de{' '}
              <span className="font-medium text-fg">{email}</span>.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (codigo.length === 6) void verificar(codigo);
            }}
            className="space-y-4"
          >
            <input
              ref={input}
              value={codigo}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCodigo(v);
                // Seis dígitos: envia sozinho. Ninguém digita o sexto número e
                // procura o botão.
                if (v.length === 6) void verificar(v);
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              disabled={verificando}
              className="w-full h-14 text-center text-2xl font-mono tracking-[0.5em] rounded-md border border-border bg-bg-3 focus:border-brand outline-none disabled:opacity-60"
            />

            {erro && <p className="text-sm text-danger">{erro}</p>}

            <Button type="submit" className="w-full" loading={verificando} disabled={codigo.length !== 6}>
              Entrar
            </Button>
          </form>

          <div className="pt-3 border-t border-border">
            <p className="text-xs text-fg-2 leading-relaxed">
              Perdeu o aplicativo autenticador? Rode{' '}
              <code className="font-mono text-[11px] bg-bg-3 px-1 py-0.5 rounded">
                node scripts/super-admin.mjs {email} --remover-2fa
              </code>{' '}
              da máquina onde está o projeto.
            </p>
            <form action="/auth/logout" method="post" className="mt-3">
              <button type="submit" className="text-xs text-fg-3 hover:text-danger transition-colors">
                Sair desta conta
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
