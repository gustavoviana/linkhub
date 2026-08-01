import { Badge } from '@/components/ui/badge';

export function TenantStatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: 'success' | 'info' | 'warning' | 'danger'; label: string }> = {
    active: { tone: 'success', label: 'ativo' },
    trial: { tone: 'info', label: 'em teste' },
    suspended: { tone: 'warning', label: 'suspenso' },
    cancelled: { tone: 'danger', label: 'cancelado' },
  };
  const meta = map[status] ?? { tone: 'info' as const, label: status };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
