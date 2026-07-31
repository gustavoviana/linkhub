import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantAdmin } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { Badge } from '@/components/ui/badge';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'linkhub.api.br';

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireTenantAdmin(id);

  const supabase = createAdminClient();
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) notFound();

  const tabs = [
    { href: `/admin/tenants/${id}`, label: 'Visão geral' },
    { href: `/admin/tenants/${id}/branding`, label: 'Marca & visual' },
    { href: `/admin/tenants/${id}/aplicativo`, label: 'Aplicativo' },
    { href: `/admin/tenants/${id}/erp`, label: 'Integração ERP' },
    { href: `/admin/tenants/${id}/dominio`, label: 'Domínio' },
    { href: `/admin/tenants/${id}/customers`, label: 'Clientes' },
    { href: `/admin/tenants/${id}/plans`, label: 'Planos' },
    { href: `/admin/tenants/${id}/team`, label: 'Equipe' },
    { href: `/admin/tenants/${id}/configuracoes`, label: 'Configurações' },
  ];

  const portalUrl = tenant.custom_domain
    ? `https://${tenant.custom_domain}`
    : `https://${tenant.slug}.${ROOT_DOMAIN}`;

  return (
    <div>
      <header className="border-b border-border bg-bg-2">
        <div className="px-8 py-6">
          <div className="flex items-start gap-4">
            {/* Logo solta, na horizontal: o quadrado colorido que existia aqui
                recortava a marca no meio (object-cover) e emoldurava uma arte
                que já vem pronta. O quadrado sobrou só como retrato de quem
                ainda não enviou logo. */}
            {tenant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="h-12 w-auto max-w-[240px] object-contain shrink-0"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-md flex items-center justify-center font-bold text-white shrink-0"
                style={{ background: tenant.primary_color }}
              >
                {tenant.name[0]}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold">{tenant.name}</h1>
                <Badge tone={tenant.status === 'active' ? 'success' : 'info'}>{tenant.status}</Badge>
              </div>
              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-fg-2 hover:text-brand font-mono"
              >
                {portalUrl} ↗
              </a>
            </div>
          </div>
          <nav className="flex gap-0 mt-6 -mb-6 overflow-x-auto">
            {tabs.map((t) => (
              <TabLink key={t.href} href={t.href}>{t.label}</TabLink>
            ))}
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
}

function TabLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-4 py-3 text-sm font-medium text-fg-2 hover:text-fg border-b-2 border-transparent hover:border-border whitespace-nowrap"
    >
      {children}
    </Link>
  );
}
