import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { requireTenantAdmin } from '@/lib/auth/session';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function TenantOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTenantAdmin(id);

  const supabase = createAdminClient();
  const [tenantRes, { count: customerCount }, { count: planCount }] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', id).single(),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
    supabase.from('plans').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
  ]);
  const tenant = asTenantOrNull(tenantRes.data);
  if (!tenant) return null;

  return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Clientes cadastrados" value={String(customerCount ?? 0)} />
        <KpiCard label="Planos ativos" value={String(planCount ?? 0)} />
        <KpiCard label="Última sincronização" value={tenant.erp_last_sync_at ? new Date(tenant.erp_last_sync_at).toLocaleString('pt-BR') : 'Nunca'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Próximos passos</CardTitle>
            <CardSubtitle>Complete a configuração do seu provedor</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <Step done={!!tenant.logo_url} label="Subir logo e definir cores" href={`/admin/tenants/${id}/branding`} />
            <Step done={tenant.erp_type !== 'mock'} label="Conectar com seu ERP" href={`/admin/tenants/${id}/erp`} />
            <Step done={!!tenant.support_whatsapp} label="Adicionar contato de suporte" href={`/admin/tenants/${id}/branding`} />
            <Step done={!!tenant.custom_domain_verified} label="Configurar domínio próprio (opcional)" href={`/admin/tenants/${id}/domain`} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compartilhe com seus clientes</CardTitle>
            <CardSubtitle>O link do seu portal já está ativo</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="bg-bg-3 rounded-md p-3 font-mono text-sm break-all">
              https://{tenant.slug}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'linkhub.api.br'}
            </div>
            <p className="text-xs text-fg-2 mt-3">
              Seus clientes acessam com o CPF e a senha que você configurar. Eles podem ver
              faturas, pagar com Pix, baixar boleto e abrir chamados.
            </p>
            <div className="mt-4">
              <Link href={`https://${tenant.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'linkhub.api.br'}`} target="_blank">
                <Button variant="outline" size="sm">Abrir portal ↗</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-2 border border-border rounded-lg p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-fg-2">{label}</div>
      <div className="text-2xl font-bold mt-2 tabular-nums">{value}</div>
    </div>
  );
}

function Step({ done, label, href }: { done: boolean; label: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 hover:bg-bg-3 -mx-2 px-2 py-1.5 rounded">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
          done ? 'bg-success text-white' : 'border-2 border-border'
        }`}
      >
        {done && '✓'}
      </div>
      <span className={`text-sm ${done ? 'text-fg-2 line-through' : 'text-fg'}`}>{label}</span>
    </Link>
  );
}
