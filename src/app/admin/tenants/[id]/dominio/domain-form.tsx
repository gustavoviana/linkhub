'use client';

import { useEffect, useState } from 'react';
import type { Tenant } from '@/lib/supabase/types';
import type { DomainStatus } from '@/lib/vercel/domains';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/portal/icons';

export default function DomainForm({ tenant, rootDomain }: { tenant: Tenant; rootDomain: string }) {
  const [subdomain, setSubdomain] = useState<DomainStatus | null>(null);
  const [custom, setCustom] = useState<DomainStatus | null>(null);
  const [customDomain, setCustomDomain] = useState(tenant.custom_domain ?? '');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/tenants/${tenant.id}/domain`).catch(() => null);
    setLoading(false);
    if (!r?.ok) return;
    const data = await r.json();
    setSubdomain(data.subdomain);
    setCustom(data.custom);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function provision() {
    setWorking(true);
    setError(null);
    const r = await fetch(`/api/tenants/${tenant.id}/domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_domain: customDomain.trim() || null }),
    }).catch(() => null);
    setWorking(false);
    if (!r) return setError('Não conseguimos falar com o servidor.');
    if (!r.ok) return setError(await r.text());
    const data = await r.json();
    setSubdomain(data.subdomain);
    setCustom(data.custom);
  }

  async function removeCustom() {
    setWorking(true);
    await fetch(`/api/tenants/${tenant.id}/domain`, { method: 'DELETE' }).catch(() => null);
    setCustomDomain('');
    setCustom(null);
    setWorking(false);
    load();
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Endereço da sua central</CardTitle>
          <CardSubtitle>É o link que você entrega para os seus clientes</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <code className="font-mono text-sm bg-bg-3 border border-border rounded-md px-3 py-2">
              {tenant.slug}.{rootDomain}
            </code>
            <StatusBadge status={subdomain} loading={loading} />
          </div>

          {subdomain?.state === 'unconfigured' && (
            <p className="text-sm text-fg-2 leading-relaxed">
              A automação de domínios não está ligada neste ambiente. Adicione{' '}
              <code className="font-mono text-xs">VERCEL_API_TOKEN</code>,{' '}
              <code className="font-mono text-xs">VERCEL_PROJECT_ID</code> e{' '}
              <code className="font-mono text-xs">VERCEL_TEAM_ID</code> nas variáveis do projeto para
              que cada provedor novo já entre no ar sozinho.
            </p>
          )}

          {subdomain?.state === 'error' && (
            <p className="text-sm text-danger">{subdomain.message}</p>
          )}

          {subdomain?.verification && subdomain.verification.length > 0 && (
            <VerificationTable records={subdomain.verification} />
          )}

          <Button type="button" onClick={provision} loading={working}>
            {subdomain?.state === 'ready' ? 'Revalidar' : 'Provisionar agora'}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Domínio próprio</CardTitle>
          <CardSubtitle>Opcional — use o seu domínio no lugar do subdomínio</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field
            label="Domínio"
            hint="Ex: central.seuprovedor.com.br — aponte um CNAME para cname.vercel-dns.com antes de validar."
          >
            <Input
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="central.seuprovedor.com.br"
            />
          </Field>

          {custom && (
            <div className="flex items-center gap-3">
              <code className="font-mono text-sm">{custom.domain}</code>
              <StatusBadge status={custom} loading={false} />
            </div>
          )}

          {custom?.verification && custom.verification.length > 0 && (
            <VerificationTable records={custom.verification} />
          )}

          {error && <div className="text-sm text-danger bg-danger/10 rounded-md p-3">{error}</div>}

          <div className="flex gap-2">
            <Button type="button" onClick={provision} loading={working}>
              Salvar e validar
            </Button>
            {tenant.custom_domain && (
              <Button type="button" variant="outline" onClick={removeCustom} loading={working}>
                Remover
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function StatusBadge({ status, loading }: { status: DomainStatus | null; loading: boolean }) {
  if (loading) return <span className="text-xs text-fg-3">verificando…</span>;
  if (!status) return <Badge tone="neutral">desconhecido</Badge>;
  if (status.state === 'ready') return <Badge tone="success">no ar</Badge>;
  if (status.state === 'pending') return <Badge tone="warning">verificação pendente</Badge>;
  if (status.state === 'unconfigured') return <Badge tone="neutral">automação desligada</Badge>;
  return <Badge tone="danger">erro</Badge>;
}

function VerificationTable({ records }: { records: { type: string; domain: string; value: string }[] }) {
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="px-3 py-2 bg-bg-3 text-xs font-semibold flex items-center gap-2">
        <Icon name="globe" size={13} /> Adicione no seu DNS
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-fg-2">
            <th className="text-left px-3 py-2 font-medium">Tipo</th>
            <th className="text-left px-3 py-2 font-medium">Nome</th>
            <th className="text-left px-3 py-2 font-medium">Valor</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.value} className="border-t border-border font-mono">
              <td className="px-3 py-2">{r.type.toUpperCase()}</td>
              <td className="px-3 py-2 break-all">{r.domain}</td>
              <td className="px-3 py-2 break-all">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
