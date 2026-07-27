'use client';

import { useState } from 'react';
import { Icon } from '@/components/portal/icons';

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const label = url.replace(/^https?:\/\//, '');

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0 px-3 py-2.5 rounded-[9px] bg-bg-3 border border-border font-mono text-xs truncate">
        {label}
      </div>
      <button
        type="button"
        title="Copiar link"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
          }
        }}
        className="h-[38px] w-[38px] rounded-[9px] border border-border text-fg-2 hover:text-fg hover:border-fg-3 flex items-center justify-center shrink-0 transition-colors"
      >
        <Icon name={copied ? 'check' : 'copy'} size={15} />
      </button>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        title="Abrir portal"
        className="h-[38px] w-[38px] rounded-[9px] border border-border text-fg-2 hover:text-fg hover:border-fg-3 flex items-center justify-center shrink-0 transition-colors"
      >
        <Icon name="arrow-right" size={15} style={{ transform: 'rotate(-45deg)' }} />
      </a>
    </div>
  );
}
