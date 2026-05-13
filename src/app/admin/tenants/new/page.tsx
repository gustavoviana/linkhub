'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { slugify } from '@/lib/utils';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'linkhub.api.br';

export default function NewTenantPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [legalName, setLegalName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('create_tenant_with_owner' as never, {
      p_slug: slug,
      p_name: name,
      p_legal_name: legalName || null,
      p_cnpj: cnpj || null,
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
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Novo provedor</h1>
      <p className="text-sm text-fg-2 mb-6">Crie mais um provedor sob a mesma conta</p>

      <Card>
        <CardHeader>
          <CardTitle>Dados básicos</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Nome comercial">
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
              <div className="flex">
                <Input
                  required
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="rounded-r-none"
                />
                <span className="flex items-center px-3 text-sm text-fg-2 bg-bg-3 border border-l-0 border-border rounded-r-md">
                  .{ROOT_DOMAIN}
                </span>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Razão social">
                <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
              </Field>
              <Field label="CNPJ">
                <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
              </Field>
            </div>
            {error && <div className="text-sm text-danger bg-danger/10 rounded-md p-3">{error}</div>}
            <div className="flex gap-2">
              <Button type="submit" loading={loading}>Criar provedor</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
