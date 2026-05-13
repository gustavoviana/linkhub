import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserTenants } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'linkhub.api.br';

export default async function AdminHome() {
  const tenants = await getUserTenants();

  if (tenants.length === 0) {
    return (
      <div className="p-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-1">Bem-vindo ao LinkHub</h1>
        <p className="text-fg-2 mb-6">Você ainda não tem nenhum provedor cadastrado.</p>
        <Link href="/admin/tenants/new">
          <Button>Criar meu primeiro provedor</Button>
        </Link>
      </div>
    );
  }

  if (tenants.length === 1) {
    redirect(`/admin/tenants/${tenants[0].tenant.id}`);
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Meus provedores</h1>
          <p className="text-sm text-fg-2 mt-1">Selecione um provedor para gerenciar</p>
        </div>
        <Link href="/admin/tenants/new">
          <Button>Novo provedor</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tenants.map(({ tenant, admin }) => (
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
                  <span>Cargo: {admin.role}</span>
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
    </div>
  );
}
