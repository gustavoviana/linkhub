'use client';

import { useState } from 'react';
import { Icon } from '@/components/portal/icons';

// A senha aparece uma vez e não volta.
//
// Não é limitação da tela: o Supabase guarda só o hash, então nem o servidor
// consegue mostrar de novo depois. Por isso o aviso é grande — quem fecha esta
// caixa sem copiar precisa gerar outra senha.

export function CredencialGerada({ email, password }: { email: string; password: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!password) {
    return (
      <div className="rounded-md border border-info/30 bg-info/5 p-3 text-sm text-fg-2 leading-relaxed">
        <strong className="text-fg">{email}</strong> já tinha conta no LinkHub, então a senha atual
        dele continua valendo. Se ele não lembrar, use o botão de redefinir senha na ficha do
        provedor.
      </div>
    );
  }

  const texto = `Acesso ao painel LinkHub\nE-mail: ${email}\nSenha: ${password}`;

  return (
    <div className="rounded-md border border-warning/40 bg-warning/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Icon name="lock" size={15} />
        <div className="text-sm text-fg leading-relaxed">
          <strong className="font-semibold">Copie a senha agora.</strong> Ela não aparece de novo:
          guardamos só o hash, então nem nós conseguimos mostrar depois. Perdeu, gere outra.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-fg-3 font-medium mb-1">E-mail</div>
          <div className="font-mono text-sm bg-bg-2 border border-border rounded px-3 py-2 break-all">
            {email}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-fg-3 font-medium mb-1">Senha</div>
          <div className="font-mono text-sm bg-bg-2 border border-border rounded px-3 py-2 tracking-wide">
            {password}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(texto);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 3000);
          } catch {
            setCopied(false);
          }
        }}
        className="h-9 px-4 rounded-md bg-bg-2 border border-border text-sm font-medium hover:border-fg-3 transition-colors inline-flex items-center gap-2"
      >
        <Icon name={copied ? 'check' : 'copy'} size={14} />
        {copied ? 'Copiado' : 'Copiar e-mail e senha'}
      </button>
    </div>
  );
}
