'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { Card, CardBody } from '@/components/ui/card';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ready, setReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // O link de recuperação já criou a sessão no /auth/callback. Sem sessão, o
  // link expirou ou foi aberto em outro navegador.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setReady(!!data.user));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('As senhas não são iguais.');
      return;
    }
    if (password.length < 8) {
      setError('A senha precisa ter no mínimo 8 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push('/admin');
      router.refresh();
    }, 1200);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-md bg-brand text-brand-fg flex items-center justify-center font-bold text-sm">L</div>
            <span className="font-semibold">LinkHub</span>
          </div>
          <h1 className="text-2xl font-bold">Criar senha nova</h1>
          <p className="text-sm text-fg-2 mt-1">Escolha uma senha que você não usa em outro lugar</p>
        </div>

        <Card>
          <CardBody>
            {ready === false ? (
              <div className="space-y-4">
                <p className="text-sm">
                  Este link expirou ou foi aberto em outro navegador. Peça um novo para continuar.
                </p>
                <Link href="/esqueci-senha">
                  <Button className="w-full">Pedir novo link</Button>
                </Link>
              </div>
            ) : done ? (
              <p className="text-sm">Senha alterada. Levando você para o painel…</p>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <Field label="Nova senha" hint="Mínimo 8 caracteres">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
                <Field label="Repita a senha">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </Field>
                {error && <div className="text-sm text-danger bg-danger/10 rounded-md p-3">{error}</div>}
                <Button type="submit" loading={loading || ready === null} className="w-full">
                  Salvar senha
                </Button>
              </form>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
