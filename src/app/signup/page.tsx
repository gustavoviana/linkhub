'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { Card, CardBody } from '@/components/ui/card';
import { slugify } from '@/lib/utils';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'linkhub.api.br';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'account' | 'tenant'>('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [legalName, setLegalName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep('tenant');
  }

  async function onTenantSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('create_tenant_with_owner' as never, {
      p_slug: slug,
      p_name: name,
      p_legal_name: legalName || null,
      p_cnpj: null,
    } as never);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/admin/tenants/${(data as any).id}`);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-bg">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-md bg-brand text-brand-fg flex items-center justify-center font-bold text-sm">L</div>
            <span className="font-semibold">LinkHub</span>
          </Link>
          <h1 className="text-2xl font-bold">
            {step === 'account' ? 'Crie sua conta' : 'Configure seu provedor'}
          </h1>
          <p className="text-sm text-fg-2 mt-1">
            {step === 'account'
              ? 'Comece em 2 minutos — sem cartão de crédito'
              : 'Esse será o subdomínio onde seus clientes acessam'}
          </p>
        </div>

        <Card>
          <CardBody>
            {step === 'account' ? (
              <form onSubmit={onAccountSubmit} className="space-y-4">
                <Field label="Seu e-mail" hint="Você usa pra acessar o painel">
                  <Input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <Field label="Senha" hint="Mínimo 8 caracteres">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
                {error && <div className="text-sm text-danger bg-danger/10 rounded-md p-3">{error}</div>}
                <Button type="submit" loading={loading} className="w-full">Continuar</Button>
              </form>
            ) : (
              <form onSubmit={onTenantSubmit} className="space-y-4">
                <Field label="Nome do provedor" hint="Aparece na central do cliente">
                  <Input
                    required
                    placeholder="LinkNet Telecom"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!slug) setSlug(slugify(e.target.value));
                    }}
                  />
                </Field>
                <Field label="Subdomínio">
                  <div className="flex items-stretch">
                    <Input
                      required
                      pattern="^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$"
                      placeholder="linknet"
                      value={slug}
                      onChange={(e) => setSlug(slugify(e.target.value))}
                      className="rounded-r-none"
                    />
                    <span className="flex items-center px-3 text-sm text-fg-2 bg-bg-3 border border-l-0 border-border rounded-r-md whitespace-nowrap">
                      .{ROOT_DOMAIN}
                    </span>
                  </div>
                </Field>
                <Field label="Razão social (opcional)">
                  <Input
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="LinkNet Comunicações LTDA"
                  />
                </Field>
                {error && <div className="text-sm text-danger bg-danger/10 rounded-md p-3">{error}</div>}
                <Button type="submit" loading={loading} className="w-full">
                  Criar provedor
                </Button>
              </form>
            )}
          </CardBody>
        </Card>

        <p className="text-center text-sm text-fg-2 mt-6">
          Já tem conta?{' '}
          <Link href="/login" className="text-brand font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
