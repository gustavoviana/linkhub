'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { slugify } from '@/lib/utils';
import { CredencialGerada } from '../credencial';

// Criação de provedor pelo super administrador: dados da empresa, e-mail do
// responsável e a mensalidade combinada. A senha do responsável é gerada pelo
// servidor e mostrada uma única vez.

export default function NewProviderForm({ rootDomain }: { rootDomain: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTocado, setSlugTocado] = useState(false);
  const [legalName, setLegalName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [valor, setValor] = useState('');
  const [dia, setDia] = useState('10');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [criado, setCriado] = useState<{ email: string; password: string | null; name: string } | null>(null);

  function mudarNome(v: string) {
    setName(v);
    if (!slugTocado) setSlug(slugify(v));
  }

  /** "149,90" e "149.90" viram 14990 centavos. */
  function centavos(v: string) {
    const limpo = v.replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
    return Math.round((Number.parseFloat(limpo) || 0) * 100);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const r = await fetch('/api/platform/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        slug: slug.trim(),
        legal_name: legalName.trim() || null,
        cnpj: cnpj.trim() || null,
        owner_email: email.trim(),
        monthly_amount_cents: centavos(valor),
        billing_day: Number(dia) || 10,
      }),
    }).catch(() => null);

    setSaving(false);
    if (!r) return setError('Não conseguimos falar com o servidor.');

    const data = await r.json().catch(() => ({}));
    if (!r.ok) return setError(data.error ?? 'Não foi possível criar o provedor.');

    setCriado({ email: data.owner.email, password: data.owner.password, name: name.trim() });
    setName('');
    setSlug('');
    setSlugTocado(false);
    setLegalName('');
    setCnpj('');
    setEmail('');
    setValor('');
    setOpen(false);
    router.refresh();
  }

  if (criado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Provedor criado</CardTitle>
          <CardSubtitle>{criado.name} já pode entrar no painel</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <CredencialGerada email={criado.email} password={criado.password} />
          <div className="flex gap-2">
            <Button type="button" onClick={() => setCriado(null)}>
              Criar outro
            </Button>
            <Link href="/plataforma/provedores">
              <Button type="button" variant="outline">
                Ver a lista
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        + Novo provedor
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo provedor</CardTitle>
        <CardSubtitle>A conta do responsável é criada junto, com senha gerada aqui</CardSubtitle>
      </CardHeader>
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome comercial">
              <Input required value={name} onChange={(e) => mudarNome(e.target.value)} placeholder="FibraNet" />
            </Field>
            <Field label="Endereço da central" hint={`${slug || 'endereco'}.${rootDomain}`}>
              <Input
                required
                className="font-mono"
                value={slug}
                onChange={(e) => {
                  setSlugTocado(true);
                  setSlug(slugify(e.target.value));
                }}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Razão social" hint="Opcional">
              <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </Field>
            <Field label="CNPJ" hint="Opcional">
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
            </Field>
          </div>

          <Field
            label="E-mail do responsável"
            hint="É com esse e-mail que o provedor entra no painel dele. E-mail já cadastrado mantém a senha atual."
          >
            <Input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="responsavel@provedor.com.br"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Mensalidade" hint="Deixe em branco enquanto for teste">
              <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="149,90" />
            </Field>
            <Field label="Dia do vencimento" hint="De 1 a 28">
              <Input type="number" min={1} max={28} value={dia} onChange={(e) => setDia(e.target.value)} />
            </Field>
          </div>

          {error && <div className="text-sm text-danger bg-danger/10 rounded-md p-3">{error}</div>}

          <div className="flex gap-2">
            <Button type="submit" loading={saving}>
              Criar provedor
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
