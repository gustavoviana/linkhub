'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { Card, CardBody } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setError(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-md bg-brand text-brand-fg flex items-center justify-center font-bold text-sm">L</div>
            <span className="font-semibold">LinkHub</span>
          </Link>
          <h1 className="text-2xl font-bold">Entrar no painel</h1>
          <p className="text-sm text-fg-2 mt-1">Acesse sua conta de provedor</p>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="E-mail">
                <Input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@provedor.com.br"
                />
              </Field>
              <Field label="Senha">
                <Input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              {error && (
                <div className="text-sm text-danger bg-danger/10 rounded-md p-3">{error}</div>
              )}
              <Button type="submit" loading={loading} className="w-full">
                Entrar
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="text-center text-sm text-fg-2 mt-6">
          Ainda não tem conta?{' '}
          <Link href="/signup" className="text-brand font-medium hover:underline">
            Criar agora
          </Link>
        </p>
      </div>
    </div>
  );
}
