import { cn } from '@/lib/utils';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  const tones: Record<Tone, string> = {
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
    info: 'bg-info/10 text-info border-info/20',
    neutral: 'bg-bg-3 text-fg-2 border-border',
    brand: 'bg-brand/10 text-brand border-brand/20',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 h-5 rounded text-[11px] font-medium border',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
