'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/portal/icons';

export function ResetPasswordButton({
  tenantId,
  customerId,
  customerName,
  linked,
}: {
  tenantId: string;
  customerId: string;
  customerName: string;
  linked: boolean;
}) {
  const [password, setPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!linked) {
    return <span className="text-xs text-fg-3">—</span>;
  }

  async function reset() {
    if (!confirm(`Gerar uma senha nova para ${customerName}? A senha atual deixa de funcionar.`)) return;
    setLoading(true);
    setError(null);
    const r = await fetch(`/api/tenants/${tenantId}/customers/${customerId}/reset-password`, {
      method: 'POST',
    }).catch(() => null);
    setLoading(false);
    if (!r) return setError('Falha de conexão');
    if (!r.ok) return setError(await r.text());
    const data = await r.json();
    setPassword(data.password);
  }

  if (password) {
    return (
      <div className="flex items-center gap-2">
        <code className="font-mono text-xs bg-bg-3 border border-border rounded px-2 py-1">
          {password}
        </code>
        <button
          type="button"
          title="Copiar"
          onClick={async () => {
            await navigator.clipboard.writeText(password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="text-fg-2 hover:text-fg"
        >
          <Icon name={copied ? 'check' : 'copy'} size={14} />
        </button>
        <span className="text-[10px] text-fg-3">passe ao cliente — não será exibida de novo</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" loading={loading} onClick={reset}>
        Nova senha
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
