'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function SyncPlansButton({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setMsg(null);
    const r = await fetch(`/api/tenants/${tenantId}/erp/sync-plans`, { method: 'POST' });
    setLoading(false);
    if (!r.ok) {
      setMsg(`Erro: ${await r.text()}`);
      return;
    }
    const data = await r.json();
    setMsg(`✓ ${data.count} planos sincronizados`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-fg-2">{msg}</span>}
      <Button variant="outline" size="sm" onClick={sync} loading={loading}>
        Sincronizar do ERP
      </Button>
    </div>
  );
}
