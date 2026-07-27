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

// "Failed to fetch" é o navegador não conseguindo abrir conexão com o
// Supabase (projeto pausado, URL errada, rede fora) — a mensagem crua não
// diz nada pro provedor que está tentando se cadastrar.
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('failed to fetch') || m.includes('networkerror')) {
    return 'Não conseguimos falar com o servidor. Verifique sua conexão e tente de novo em instantes.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Este e-mail já tem conta. Faça login para continuar.';
  }
  if (m.includes('password should be at least')) {
    return 'A senha precisa ter no mínimo 8 caracteres.';
  }
  if (m.includes('invalid email') || m.includes('email address') && m.includes('invalid')) {
    return 'E-mail inválido.';
  }
  if (m.includes('email rate limit') || m.includes('too many requests')) {
    return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  }
  return message;
}

function translateTenantError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('failed to fetch') || m.includes('networkerror')) {
    return 'Não conseguimos falar com o servidor. Verifique sua conexão e tente de novo em instantes.';
  }
  if (m.includes('unauthenticated')) {
    return 'Sua sessão expirou. Entre novamente para concluir o cadastro.';
  }
  if (m.includes('duplicate key') || m.includes('already exists')) {
    return 'Esse subdomínio já está em uso. Escolha outro.';
  }
  if (m.includes('is reserved')) {
    return 'Esse subdomínio é reservado. Escolha outro.';
  }
  if (m.includes('violates check constraint')) {
    return 'Subdomínio inválido: use de 3 a 32 caracteres, apenas letras minúsculas, números e hífen.';
  }
  return message;
}

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
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function onAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(translateAuthError(error.message));
      return;
    }

    // Com confirmação de e-mail ligada, o Supabase devolve um usuário
    // "fantasma" (sem identities) quando o e-mail já existe, em vez de erro.
    if (data.user && data.user.identities?.length === 0) {
      setError('Este e-mail já tem conta. Faça login para continuar.');
      return;
    }

    // O passo 2 chama create_tenant_with_owner, que exige auth.uid(). Sem
    // sessão (confirmação de e-mail ligada) o RPC falharia com
    // "unauthenticated" — então paramos aqui e explicamos o que fazer.
    if (!data.session) {
      setAwaitingConfirmation(true);
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
    if (error) {
      setLoading(false);
      setError(translateTenantError(error.message));
      return;
    }

    // Registra <slug>.linkhub.api.br na Vercel para o portal já nascer no ar.
    // Se a integração não estiver configurada, o painel mostra o pendente —
    // não é motivo para segurar o cadastro.
    const tenantId = (data as any).id;
    await fetch(`/api/tenants/${tenantId}/domain`, { method: 'POST' }).catch(() => null);

    setLoading(false);
    router.push(`/admin/tenants/${tenantId}`);
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
            {awaitingConfirmation
              ? 'Confirme seu e-mail'
              : step === 'account'
                ? 'Crie sua conta'
                : 'Configure seu provedor'}
          </h1>
          <p className="text-sm text-fg-2 mt-1">
            {awaitingConfirmation
              ? 'Falta um passo para liberar seu painel'
              : step === 'account'
                ? 'Comece em 2 minutos — sem cartão de crédito'
                : 'Esse será o subdomínio onde seus clientes acessam'}
          </p>
        </div>

        <Card>
          <CardBody>
            {awaitingConfirmation ? (
              <div className="space-y-4">
                <p className="text-sm">
                  Enviamos um link de confirmação para <strong>{email}</strong>. Abra o
                  link e você volta pra cá já logado, pronto para cadastrar seu provedor.
                </p>
                <p className="text-xs text-fg-2">
                  Não chegou? Confira a caixa de spam. O link vale por 24 horas.
                </p>
                <Link href="/login">
                  <Button variant="outline" className="w-full">Já confirmei — entrar</Button>
                </Link>
              </div>
            ) : step === 'account' ? (
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
