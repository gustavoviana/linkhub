'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CopyBlock, StoreCopySet } from '@/lib/tenant/store-copy';
import type { GuideBlock, GuideStep, GuideStore } from '@/lib/tenant/store-guide';
import { cn } from '@/lib/utils';

// Guia de publicação nas lojas, dentro do painel.
//
// As marcações ficam no localStorage do navegador, não no banco: publicar é
// coisa de uma pessoa num computador, ao longo de alguns dias, e uma tabela
// nova custaria mais migração do que entrega. Se um dia duas pessoas
// dividirem a tarefa, aí sim vale mover para o Supabase.

const STORE_LABEL: Record<GuideStore, string> = {
  play: 'Google Play',
  apple: 'App Store',
};

export default function Guide({
  tenantId,
  steps,
  prerequisites,
  copy,
  links,
}: {
  tenantId: string;
  steps: Record<GuideStore, GuideStep[]>;
  prerequisites: { id: string; text: string; detail: string }[];
  copy: StoreCopySet;
  links: Record<GuideStore, { label: string; url: string }[]>;
}) {
  const [store, setStore] = useState<GuideStore>('play');
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  const key = `linkhub:guia-lojas:${tenantId}`;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setDone(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      // localStorage bloqueado: o guia funciona igual, só não lembra.
    }
    setLoaded(true);
  }, [key]);

  function toggle(id: string) {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // idem
      }
      return next;
    });
  }

  const blocks = useMemo(() => {
    const all = [...copy.play, ...copy.apple, ...copy.comum];
    return new Map(all.map((b) => [b.id, b]));
  }, [copy]);

  const current = steps[store];

  // Progresso: pré-requisitos comuns + tudo que a loja escolhida pede.
  const ids = useMemo(() => {
    const list = prerequisites.map((p) => p.id);
    for (const step of current) {
      for (const block of step.blocks) {
        if (block.kind === 'checks') list.push(...block.items.map((i) => i.id));
      }
    }
    return list;
  }, [current, prerequisites]);

  const feitos = ids.filter((id) => done[id]).length;
  const pct = ids.length ? Math.round((feitos / ids.length) * 100) : 0;

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold">Guia de publicação nas lojas</h2>
          <Badge tone="brand">atualizado para 2026</Badge>
        </div>
        <p className="text-sm text-fg-2 mt-1.5 leading-relaxed">
          O caminho completo para colocar esta central na loja e passar na revisão: o que marcar em
          cada formulário, por que aquela resposta e não a outra, e os textos da ficha já escritos
          para um app de central do assinante.{' '}
          <Link href={`/admin/tenants/${tenantId}/aplicativo`} className="text-brand hover:underline">
            Voltar para a aba Aplicativo
          </Link>
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex p-1 rounded-lg bg-bg-3 border border-border">
          {(['play', 'apple'] as GuideStore[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStore(s)}
              className={cn(
                'h-8 px-4 rounded-md text-sm font-medium transition-colors',
                store === s ? 'bg-bg-2 text-fg shadow-sm' : 'text-fg-2 hover:text-fg',
              )}
            >
              {STORE_LABEL[s]}
            </button>
          ))}
        </div>
        {loaded && (
          <div className="flex items-center gap-3 flex-1 min-w-[220px]">
            <div className="h-1.5 flex-1 rounded-full bg-bg-3 overflow-hidden">
              <div
                className="h-full bg-brand transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-fg-2 whitespace-nowrap tabular-nums">
              {feitos} de {ids.length}
            </span>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vale para as duas lojas</CardTitle>
          <CardSubtitle>Sem estes quatro itens, o envio para em qualquer uma delas</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-1">
          {prerequisites.map((item) => (
            <CheckRow
              key={item.id}
              checked={Boolean(done[item.id])}
              onToggle={() => toggle(item.id)}
              text={item.text}
              detail={item.detail}
            />
          ))}
        </CardBody>
      </Card>

      {current.map((step, i) => (
        <Card key={step.id}>
          <CardHeader className="flex items-start gap-3">
            <span className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-brand text-brand-fg text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <div className="min-w-0">
              <CardTitle>{step.title}</CardTitle>
              <CardSubtitle>{step.summary}</CardSubtitle>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {step.blocks.map((block, j) => (
              <Block
                key={j}
                block={block}
                done={done}
                onToggle={toggle}
                blocks={blocks}
              />
            ))}
          </CardBody>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Textos prontos da ficha</CardTitle>
          <CardSubtitle>
            Já com o nome e os contatos deste provedor. Copie, revise e cole no console.
          </CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {(store === 'play' ? copy.play : copy.apple).map((b) => (
            <CopyView key={b.id} block={b} />
          ))}
          {copy.comum.map((b) => (
            <CopyView key={b.id} block={b} />
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentação oficial — {STORE_LABEL[store]}</CardTitle>
          <CardSubtitle>
            As lojas mudam exigência sem avisar. Quando este guia divergir do console, quem manda é o
            link.
          </CardSubtitle>
        </CardHeader>
        <CardBody>
          <ul className="space-y-1.5">
            {links[store].map((l) => (
              <li key={l.url}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-brand hover:underline"
                >
                  {l.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

function Block({
  block,
  done,
  onToggle,
  blocks,
}: {
  block: GuideBlock;
  done: Record<string, boolean>;
  onToggle: (id: string) => void;
  blocks: Map<string, CopyBlock>;
}) {
  switch (block.kind) {
    case 'text':
      return <p className="text-sm text-fg-2 leading-relaxed">{block.text}</p>;

    case 'note':
      return <Note tone={block.tone} title={block.title} text={block.text} />;

    case 'checks':
      return (
        <div className="space-y-1">
          {block.items.map((item) => (
            <CheckRow
              key={item.id}
              checked={Boolean(done[item.id])}
              onToggle={() => onToggle(item.id)}
              text={item.text}
              detail={item.detail}
            />
          ))}
        </div>
      );

    case 'fields':
      return (
        <div>
          {block.caption && (
            <p className="text-xs font-medium text-fg-3 mb-2 uppercase tracking-wide">
              {block.caption}
            </p>
          )}
          <div className="border border-border rounded-md divide-y divide-border overflow-hidden">
            {block.rows.map((row, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[minmax(0,11rem)_1fr] gap-1 sm:gap-4 p-3">
                <div className="text-sm font-medium">{row.field}</div>
                <div className="min-w-0">
                  <div className="text-sm text-fg-2">{row.value}</div>
                  {row.why && (
                    <div className="text-xs text-fg-3 mt-1 leading-relaxed">{row.why}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'copy': {
      const b = blocks.get(block.copyId);
      return b ? <CopyView block={b} /> : null;
    }

    case 'links':
      return (
        <ul className="space-y-1.5">
          {block.items.map((l) => (
            <li key={l.url}>
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-brand hover:underline"
              >
                {l.label} ↗
              </a>
            </li>
          ))}
        </ul>
      );
  }
}

function CheckRow({
  checked,
  onToggle,
  text,
  detail,
}: {
  checked: boolean;
  onToggle: () => void;
  text: string;
  detail?: string;
}) {
  return (
    <label className="flex items-start gap-3 p-2 -mx-2 rounded-md hover:bg-bg-3/60 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-0.5 w-4 h-4 shrink-0 accent-[rgb(var(--brand))] cursor-pointer"
      />
      <span className="min-w-0">
        <span className={cn('text-sm block', checked && 'line-through text-fg-3')}>{text}</span>
        {detail && <span className="text-xs text-fg-2 block mt-1 leading-relaxed">{detail}</span>}
      </span>
    </label>
  );
}

const NOTE_TONES = {
  info: 'border-info/30 bg-info/5',
  warning: 'border-warning/30 bg-warning/5',
  danger: 'border-danger/30 bg-danger/5',
  success: 'border-success/30 bg-success/5',
} as const;

const NOTE_TITLE = {
  info: 'text-info',
  warning: 'text-warning',
  danger: 'text-danger',
  success: 'text-success',
} as const;

function Note({
  tone,
  title,
  text,
}: {
  tone: keyof typeof NOTE_TONES;
  title?: string;
  text: string;
}) {
  return (
    <div className={cn('border rounded-md p-3.5', NOTE_TONES[tone])}>
      {title && <div className={cn('text-sm font-semibold mb-1', NOTE_TITLE[tone])}>{title}</div>}
      <p className="text-sm text-fg-2 leading-relaxed">{text}</p>
    </div>
  );
}

/** Bloco de texto pronto: contador de caracteres, copiar e recolher. */
function CopyView({ block }: { block: CopyBlock }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const longo = block.text.length > 320;
  const estourou = block.limit !== undefined && block.text.length > block.limit;

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="flex items-start gap-3 px-3.5 py-2.5 bg-bg-3/50 border-b border-border">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{block.label}</div>
          {block.hint && <div className="text-xs text-fg-2 mt-0.5 leading-relaxed">{block.hint}</div>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {block.limit !== undefined && (
            <span
              className={cn(
                'text-[11px] font-mono tabular-nums',
                estourou ? 'text-danger font-semibold' : 'text-fg-3',
              )}
            >
              {block.text.length}/{block.limit}
            </span>
          )}
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(block.text);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              } catch {
                setCopied(false);
              }
            }}
            className="h-7 px-2.5 rounded border border-border bg-bg-2 text-xs font-medium text-fg-2 hover:text-fg hover:border-fg-3 transition-colors"
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
      <pre
        className={cn(
          'text-xs leading-relaxed text-fg-2 whitespace-pre-wrap break-words p-3.5 font-sans',
          longo && !open && 'max-h-32 overflow-hidden',
        )}
      >
        {block.text}
      </pre>
      {longo && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full py-1.5 text-xs text-fg-2 hover:text-fg border-t border-border bg-bg-3/30"
        >
          {open ? 'recolher' : 'ver o texto inteiro'}
        </button>
      )}
    </div>
  );
}
