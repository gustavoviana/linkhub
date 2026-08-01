import Link from 'next/link';
import { listProviders, BILLING_LABEL } from '@/lib/platform/data';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { formatBRL } from '@/lib/utils';
import { MigrationNotice } from '../migration-notice';
import { TenantStatusBadge } from '../status-badge';
import NewProviderForm from './new-provider-form';

export const dynamic = 'force-dynamic';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'linkhub.api.br';

export default async function ProvidersPage() {
  const { rows, missingTable } = await listProviders();
  if (missingTable) return <MigrationNotice />;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Provedores</h1>
        <p className="text-sm text-fg-2 mt-1">Criar conta, definir mensalidade e controlar o acesso</p>
      </div>

      <NewProviderForm rootDomain={ROOT_DOMAIN} />

      <Card>
        <CardHeader>
          <CardTitle>{rows.length} provedor(es)</CardTitle>
          <CardSubtitle>Clique para abrir a ficha, mudar a situação ou redefinir senha</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {rows.map((r) => (
            <Link
              key={r.tenant.id}
              href={`/plataforma/provedores/${r.tenant.id}`}
              className="flex items-center gap-3 p-3 rounded-md border border-border hover:border-fg-3 transition-colors"
            >
              <div
                className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-white text-sm font-bold overflow-hidden"
                style={{ background: r.tenant.primary_color }}
              >
                {r.tenant.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.tenant.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  r.tenant.name[0]
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.tenant.name}</div>
                <div className="text-xs text-fg-2 font-mono truncate">
                  {r.tenant.custom_domain ?? `${r.tenant.slug}.${ROOT_DOMAIN}`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm tabular-nums">{formatBRL(r.billing?.monthly_amount_cents ?? 0)}</div>
                <div className="text-xs text-fg-3">
                  {BILLING_LABEL[r.billing?.status ?? 'trial']}
                  {r.overdue > 0 && <span className="text-danger"> · {r.overdue} vencida(s)</span>}
                </div>
              </div>
              <TenantStatusBadge status={r.tenant.status} />
            </Link>
          ))}
          {rows.length === 0 && <p className="text-sm text-fg-2">Nenhum provedor cadastrado ainda.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
