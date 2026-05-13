import { createAdminClient } from '@/lib/supabase/admin';
import { asPlans } from '@/lib/supabase/helpers';
import { requireTenantAdmin } from '@/lib/auth/session';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/utils';
import SyncPlansButton from './sync-button';

export default async function PlansPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTenantAdmin(id);

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('plans')
    .select('*')
    .eq('tenant_id', id)
    .order('price_cents', { ascending: true });
  const plans = asPlans(data);

  return (
    <div className="p-8 max-w-6xl space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Planos</CardTitle>
              <CardSubtitle>{plans.length ?? 0} planos sincronizados do ERP</CardSubtitle>
            </div>
            <SyncPlansButton tenantId={id} />
          </div>
        </CardHeader>
        {!plans.length ? (
          <div className="p-10 text-center text-fg-2">
            Nenhum plano sincronizado ainda. Clique em <strong>Sincronizar do ERP</strong>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs font-medium text-fg-2 bg-bg-3 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5">Plano</th>
                  <th className="text-left px-4 py-2.5">Velocidade</th>
                  <th className="text-left px-4 py-2.5">Preço</th>
                  <th className="text-left px-4 py-2.5">Fidelidade</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.name}</div>
                      {p.description && <div className="text-xs text-fg-2">{p.description}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {p.down_mbps ? `${p.down_mbps}` : '—'}
                      {p.up_mbps && <span className="text-fg-2">/{p.up_mbps}</span>}
                      {(p.down_mbps || p.up_mbps) && <span className="text-fg-2 text-xs ml-1">Mbps</span>}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">{formatBRL(p.price_cents)}</td>
                    <td className="px-4 py-3">
                      {p.fidelity_months ? <Badge tone="info">{p.fidelity_months} meses</Badge> : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={p.active ? 'success' : 'neutral'}>{p.active ? 'ativo' : 'inativo'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
