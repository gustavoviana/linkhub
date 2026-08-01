'use client';

import { useEffect, useState } from 'react';
import type { Tenant } from '@/lib/supabase/types';
import type { DnsRecord, DomainStatus } from '@/lib/vercel/domains';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/portal/icons';

// Tela de domínio, em três passos declarados: registrar o domínio, apontar o
// DNS e emitir o certificado.
//
// Antes era um botão só, e a tela dizia "emitindo certificado" para domínio
// que nem tinha registro criado no DNS — a Vercel considera "verificado" todo
// nome que ninguém mais reivindicou, e o código lia isso como apontamento
// pronto. Agora cada passo tem o seu botão e o seu estado.

export default function DomainForm({ tenant, rootDomain }: { tenant: Tenant; rootDomain: string }) {
  const [subdomain, setSubdomain] = useState<DomainStatus | null>(null);
  const [custom, setCustom] = useState<DomainStatus | null>(null);
  const [customDomain, setCustomDomain] = useState(tenant.custom_domain ?? '');
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [working, setWorking] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    const r = await fetch(`/api/tenants/${tenant.id}/domain`).catch(() => null);
    setLoading(false);
    if (!r?.ok) return;
    const data = await r.json();
    setSubdomain(data.subdomain);
    setCustom(data.custom);
    setCheckedAt(new Date().toLocaleTimeString('pt-BR'));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function check() {
    setChecking(true);
    setError(null);
    await load(true);
    setChecking(false);
  }

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
    setCheckedAt(new Date().toLocaleTimeString('pt-BR'));
  }

  async function issue(domain: string) {
    setIssuing(true);
    setError(null);
    const r = await fetch(`/api/tenants/${tenant.id}/domain/certificate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    }).catch(() => null);
    setIssuing(false);
    if (!r) return setError('Não conseguimos falar com o servidor.');

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(data.error ?? 'A Vercel não conseguiu emitir o certificado agora.');
      if (data.status) applyStatus(domain, data.status);
      return;
    }
    applyStatus(domain, data.status);
    setCheckedAt(new Date().toLocaleTimeString('pt-BR'));
  }

  function applyStatus(domain: string, status: DomainStatus) {
    if (domain === custom?.domain) setCustom(status);
    else setSubdomain(status);
  }

  // O certificado sai em segundos depois do pedido, então vale acompanhar
  // sozinho. Só nesse estado: em "falta apontar o DNS" ficar recarregando não
  // adianta, porque a bola está com o provedor.
  const emitindo = subdomain?.state === 'issuing' || custom?.state === 'issuing';
  useEffect(() => {
    if (!emitindo) return;
    const t = setTimeout(() => load(true), 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emitindo, subdomain, custom]);

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

          {subdomain?.state === 'error' && <p className="text-sm text-danger">{subdomain.message}</p>}

          <StatusPanel
            status={subdomain}
            onCheck={check}
            onIssue={() => subdomain && issue(subdomain.domain)}
            checking={checking}
            issuing={issuing}
          />

          <Button type="button" onClick={provision} loading={working} variant="outline">
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
            hint="Ex: central.seuprovedor.com.br. Salve primeiro: o registro de DNS que você precisa criar aparece aqui embaixo, com o valor certo para este projeto."
          >
            <Input
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="central.seuprovedor.com.br"
            />
          </Field>

          {custom && (
            <div className="flex items-center gap-3 flex-wrap">
              <code className="font-mono text-sm">{custom.domain}</code>
              <StatusBadge status={custom} loading={false} />
              {checkedAt && <span className="text-xs text-fg-3">conferido às {checkedAt}</span>}
            </div>
          )}

          <StatusPanel
            status={custom}
            onCheck={check}
            onIssue={() => custom && issue(custom.domain)}
            checking={checking}
            issuing={issuing}
          />

          {error && <div className="text-sm text-danger bg-danger/10 rounded-md p-3">{error}</div>}

          <div className="flex gap-2 flex-wrap">
            <Button type="button" onClick={provision} loading={working}>
              {tenant.custom_domain ? 'Salvar' : 'Salvar e continuar'}
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
  if (status.state === 'ready') return <Badge tone="success">no ar · SSL ativo</Badge>;
  if (status.state === 'issuing') return <Badge tone="warning">falta o certificado</Badge>;
  if (status.state === 'dns_missing') return <Badge tone="warning">falta apontar o DNS</Badge>;
  if (status.state === 'pending') return <Badge tone="warning">verificação pendente</Badge>;
  if (status.state === 'unconfigured') return <Badge tone="neutral">automação desligada</Badge>;
  return <Badge tone="danger">erro</Badge>;
}

/**
 * O que fazer agora, conforme o estado: apontar o DNS, emitir o certificado,
 * ou nada, porque já está no ar.
 */
function StatusPanel({
  status,
  onCheck,
  onIssue,
  checking,
  issuing,
}: {
  status: DomainStatus | null;
  onCheck: () => void;
  onIssue: () => void;
  checking: boolean;
  issuing: boolean;
}) {
  if (!status) return null;

  if (status.state === 'ready') {
    return (
      <div className="flex items-start gap-2 text-sm rounded-md bg-success/10 text-success p-3">
        <Icon name="lock" size={15} />
        <div>
          <strong className="font-semibold">Certificado SSL ativo.</strong>{' '}
          <span className="text-fg">
            <code className="font-mono text-xs">https://{status.domain}</code> abre com cadeado. A
            renovação é automática, você não precisa fazer nada.
          </span>
        </div>
      </div>
    );
  }

  if (status.state === 'dns_missing') {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 text-sm rounded-md bg-warning/10 p-3">
          <Icon name="globe" size={15} />
          <div className="text-fg">
            <strong className="font-semibold">Falta apontar o DNS.</strong> {status.message}
          </div>
        </div>

        {status.expected && <DnsInstructions records={status.expected} />}

        <FoundRecords found={status.found} conflicts={status.conflicts} />

        <div className="flex items-center gap-3 flex-wrap">
          <Button type="button" onClick={onCheck} loading={checking}>
            Conferir apontamento
          </Button>
          <span className="text-xs text-fg-2">
            A propagação costuma levar de alguns minutos a algumas horas.
          </span>
        </div>
      </div>
    );
  }

  if (status.state === 'issuing') {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 text-sm rounded-md bg-info/10 p-3">
          <Icon name="check" size={15} />
          <div className="text-fg">
            <strong className="font-semibold">Apontamento correto.</strong> O DNS já responde para
            cá. Falta o certificado SSL, que leva menos de um minuto.
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button type="button" onClick={onIssue} loading={issuing}>
            Emitir certificado SSL
          </Button>
          <Button type="button" variant="outline" onClick={onCheck} loading={checking}>
            Conferir de novo
          </Button>
        </div>
      </div>
    );
  }

  if (status.state === 'pending') {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 text-sm rounded-md bg-warning/10 p-3">
          <Icon name="globe" size={15} />
          <div className="text-fg">
            <strong className="font-semibold">Confirmação de propriedade pendente.</strong>{' '}
            {status.message}
          </div>
        </div>
        {status.verification && status.verification.length > 0 && (
          <DnsInstructions
            records={status.verification.map((r) => ({
              type: 'TXT' as const,
              name: r.domain,
              value: r.value,
            }))}
            footer="Na Cloudflare (e na maioria dos painéis) o campo Nome recebe só a primeira parte, sem repetir o domínio. Pode haver vários registros com esse mesmo nome."
          />
        )}
        <Button type="button" onClick={onCheck} loading={checking}>
          Conferir apontamento
        </Button>
      </div>
    );
  }

  return null;
}

function DnsInstructions({ records, footer }: { records: DnsRecord[]; footer?: string }) {
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="px-3 py-2 bg-bg-3 text-xs font-semibold flex items-center gap-2">
        <Icon name="globe" size={13} /> Crie este registro no painel do seu domínio
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-fg-2">
            <th className="text-left px-3 py-2 font-medium">Tipo</th>
            <th className="text-left px-3 py-2 font-medium">Nome</th>
            <th className="text-left px-3 py-2 font-medium">Valor</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={`${r.type}-${r.value}`} className="border-t border-border align-top">
              <td className="px-3 py-2 font-mono">{r.type}</td>
              <td className="px-3 py-2 font-mono break-all">{r.name}</td>
              <td className="px-3 py-2 font-mono break-all">
                {r.value}
                {r.alternatives && r.alternatives.length > 0 && (
                  <div className="text-fg-3 font-sans mt-1">
                    também aceito: <span className="font-mono">{r.alternatives.join(', ')}</span>
                  </div>
                )}
              </td>
              <td className="px-2 py-2">
                <CopyValue value={r.value} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-xs text-fg-2 border-t border-border leading-relaxed">
        {footer ??
          'O registro é criado onde o domínio foi comprado (Registro.br, GoDaddy, Cloudflare, HostGator). Deixe o TTL no automático. Se já existir outro registro com esse mesmo nome, apague o antigo: dois apontamentos no mesmo nome se anulam.'}
      </p>
    </div>
  );
}

/** O que o DNS responde hoje. Ver o valor errado ao lado do certo resolve sozinho boa parte dos casos. */
function FoundRecords({
  found,
  conflicts,
}: {
  found?: DomainStatus['found'];
  conflicts?: DomainStatus['conflicts'];
}) {
  const temAlgo = found && (found.cnames.length > 0 || found.aValues.length > 0);
  const temConflito = conflicts && conflicts.length > 0;
  if (!temAlgo && !temConflito) return null;

  return (
    <div className="text-xs text-fg-2 space-y-1 px-3">
      {found && found.cnames.length > 0 && (
        <div>
          Hoje o DNS responde CNAME <span className="font-mono text-fg">{found.cnames.join(', ')}</span>
        </div>
      )}
      {found && found.aValues.length > 0 && (
        <div>
          Hoje o DNS responde A <span className="font-mono text-fg">{found.aValues.join(', ')}</span>
        </div>
      )}
      {temConflito && (
        <div className="text-danger">
          Registros em conflito, apague antes de conferir de novo:{' '}
          <span className="font-mono">
            {conflicts.map((c) => `${c.type} ${c.name} → ${c.value}`).join(' · ')}
          </span>
        </div>
      )}
    </div>
  );
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copiar valor"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="h-7 w-7 rounded border border-border text-fg-2 hover:text-fg hover:border-fg-3 flex items-center justify-center transition-colors"
    >
      <Icon name={copied ? 'check' : 'copy'} size={13} />
    </button>
  );
}
