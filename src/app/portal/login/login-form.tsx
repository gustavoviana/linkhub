'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import type { Tenant } from '@/lib/supabase/types';

export default function LoginForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // O usuário entra com CPF, mas o Supabase Auth usa e-mail. Construímos
    // um e-mail sintético tenant.id@cpf.linkhub para o vínculo. Quando o
    // cliente tem e-mail real, o admin pode mapear; aqui assumimos que o
    // ERP traz o e-mail e usamos via API server-side pra resolver.
    const r = await fetch('/api/portal/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf, password, tenant_id: tenant.id }),
    });

    if (!r.ok) {
      setError(await r.text());
      setLoading(false);
      return;
    }
    setLoading(false);
    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logo_url} alt={tenant.name} className="h-12 mx-auto mb-4" />
          ) : (
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center font-bold text-2xl text-white"
              style={{ background: tenant.primary_color }}
            >
              {tenant.name[0]}
            </div>
          )}
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <p className="text-sm text-fg-2 mt-1">Central do Cliente</p>
        </div>

        <div className="bg-bg-2 border border-border rounded-2xl p-6 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="CPF ou CNPJ" hint="Apenas números">
              <Input
                required
                inputMode="numeric"
                autoComplete="username"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
              />
            </Field>
            <Field label="Senha">
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error && <div className="text-sm text-danger bg-danger/10 rounded-md p-3">{error}</div>}
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Entrar
            </Button>
          </form>
          <div className="mt-4 pt-4 border-t border-border text-center">
            <a
              href={tenant.support_whatsapp ? `https://wa.me/${tenant.support_whatsapp}` : `mailto:${tenant.support_email ?? ''}`}
              className="text-sm text-brand"
            >
              Esqueci minha senha
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-fg-3 mt-6">
          {tenant.support_phone && (
            <>
              Precisa de ajuda? Ligue {tenant.support_phone}
              <br />
            </>
          )}
          Portal feito com LinkHub
        </p>
      </div>
    </div>
  );
}
