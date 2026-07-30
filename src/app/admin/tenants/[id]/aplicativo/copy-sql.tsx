'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CopySql({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(sql);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
          }}
        >
          Copiar SQL
        </Button>
        {copied && <span className="text-sm text-success">✓ Copiado</span>}
        <a
          href="https://supabase.com/dashboard/project/_/sql/new"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-brand hover:underline"
        >
          Abrir o SQL Editor ↗
        </a>
      </div>
      <pre className="text-xs bg-bg-3 rounded-md p-4 overflow-auto max-h-72 text-fg-2 leading-relaxed">
        {sql}
      </pre>
    </div>
  );
}
