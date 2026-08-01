import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProvider } from '@/lib/platform/data';
import { platformTablesReady } from '@/lib/auth/platform';
import { MigrationNotice } from '../../migration-notice';
import ProviderDetail from './provider-detail';

export const dynamic = 'force-dynamic';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'linkhub.api.br';

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!(await platformTablesReady())) return <MigrationNotice />;

  const data = await getProvider(id);
  if (!data) notFound();

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <Link href="/plataforma/provedores" className="text-xs text-fg-2 hover:text-brand">
          ← Provedores
        </Link>
        <h1 className="text-2xl font-bold mt-1">{data.tenant.name}</h1>
        <p className="text-sm text-fg-2 font-mono">
          {data.tenant.custom_domain ?? `${data.tenant.slug}.${ROOT_DOMAIN}`}
        </p>
      </div>

      <ProviderDetail data={data} />
    </div>
  );
}
