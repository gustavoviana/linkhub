'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { Card, CardBody } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    });
    setLoading(false);
    if (error) {
      setError(
        error.message.toLowerCase().includes('failed to fetch')
          ? 'Não conseguimos falar com o servidor. Tente de novo em instantes.'
          : error.message,
      );
      return;
    }
    // Sempre confirma, exista ou não a conta: dizer o contrário entrega quais
    // e-mails têm cadastro.
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-md bg-brand text-brand-fg flex items-center justify-center font-bold text-sm">L</div>
            <span className="font-semibold">LinkHub</span>
          </Link>
          <h1 className="text-2xl font-bold">Recuperar acesso</h1>
          <p className="text-sm text-fg-2 mt-1">Enviamos um link para você criar uma senha nova</p>
        </div>

        <Card>
          <CardBody>
            {sent ? (
              <div className="space-y-4">
                <p className="text-sm">
                  Se existir uma conta para <strong>{email}</strong>, o link de recuperação já está
                  a caminho. Ele vale por 1 hora.
                </p>
                <p className="text-xs text-fg-2">Não chegou? Confira a caixa de spam.</p>
                <Link href="/login">
                  <Button variant="outline" className="w-full">Voltar para o login</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <Field label="E-mail da conta">
                  <Input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@provedor.com.br"
                  />
                </Field>
                {error && <div className="text-sm text-danger bg-danger/10 rounded-md p-3">{error}</div>}
                <Button type="submit" loading={loading} className="w-full">Enviar link</Button>
              </form>
            )}
          </CardBody>
        </Card>

        <p className="text-center text-sm text-fg-2 mt-6">
          Lembrou a senha?{' '}
          <Link href="/login" className="text-brand font-medium hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
