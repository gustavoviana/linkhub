import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserTenants } from '@/lib/auth/session';
import { getPlatformSession } from '@/lib/auth/platform';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminScreen } from '@/components/admin/page-header';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Tenant } from '@/lib/supabase/types';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'linkhub.api.br';

export default async function AdminHome() {
  const [proprios, platform] = await Promise.all([getUserTenants(), getPlatformSession()]);

  // O super administrador escolhe entre todos os provedores — os dele com o
  // cargo que tem, os outros como super administrador.
  const tenants: Array<{ tenant: Tenant; cargo: string }> = proprios.map(({ tenant, admin }) => ({
    tenant,
    cargo: admin.role,
  }));
  if (platform) {
    const meus = new Set(tenants.map(({ tenant }) => tenant.id));
    const { data } = await createAdminClient().from('tenants').select('*').order('name');
    for (const row of (data ?? []) as Tenant[]) {
      if (!meus.has(row.id)) tenants.push({ tenant: row, cargo: 'super admin' });
    }
  }

  if (tenants.length === 0) {
    return (
      <AdminScreen
        eyebrow="Conta"
        title="Bem-vindo ao LinkHub"
        description="Sua conta ainda não está vinculada a nenhum provedor. Fale com quem cuida da sua conta no LinkHub para liberar o acesso."
        largura="max-w-2xl"
      >
        <div />
      </AdminScreen>
    );
  }

  if (tenants.length === 1 && !platform) {
    redirect(`/admin/tenants/${tenants[0].tenant.id}`);
  }

  return (
    <AdminScreen
      eyebrow="Conta"
      title="Meus provedores"
      description="Escolha qual provedor você quer gerenciar agora."
      largura="max-w-5xl"
    >

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tenants.map(({ tenant, cargo }) => (
          <Card key={tenant.id} className="hover:border-brand transition-colors">
            <Link href={`/admin/tenants/${tenant.id}`}>
              <CardBody>
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center font-bold text-white"
                    style={{ background: tenant.primary_color }}
                  >
                    {tenant.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{tenant.name}</div>
                    <div className="text-xs text-fg-2 font-mono truncate">
                      {tenant.slug}.{ROOT_DOMAIN}
                    </div>
                  </div>
                  <Badge tone={tenant.status === 'active' ? 'success' : tenant.status === 'trial' ? 'info' : 'neutral'}>
                    {tenant.status}
                  </Badge>
                </div>
                <div className="text-xs text-fg-3 flex items-center gap-3">
                  <span>Cargo: {cargo}</span>
                  <span>•</span>
                  <span>Layout {tenant.layout.toUpperCase()}</span>
                  <span>•</span>
                  <span>ERP {tenant.erp_type}</span>
                </div>
              </CardBody>
            </Link>
          </Card>
        ))}
      </div>
    </AdminScreen>
  );
}
