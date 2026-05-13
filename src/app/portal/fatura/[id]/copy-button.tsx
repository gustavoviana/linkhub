'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IconCheck, IconCopy } from '@/components/portal/icons';

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      className="w-full"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
      {copied ? 'Copiado!' : label}
    </Button>
  );
}
