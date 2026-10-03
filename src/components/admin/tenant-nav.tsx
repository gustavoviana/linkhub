'use client';

// Cartão do provedor e menu de configuração da barra lateral.
//
// Cliente por um motivo: o provedor da barra é o do endereço. O layout do
// /admin não renderiza de novo quando se navega entre telas, então se ele
// escolhesse o provedor, a barra ficaria presa no primeiro — e o super
// administrador, que entra no painel de qualquer um, veria o menu de outro
// provedor apontando para links que não são os da tela aberta.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/portal/icons';
import { NavGroup, NavItem } from './nav';

export interface NavTenant {
  id: string;
  name: string;
  status: string;
  primary_color: string;
  logo_url: string | null;
}

export function TenantNav({
  proprios,
  outros,
}: {
  /** Provedores em que a pessoa está em tenant_admins. */
  proprios: NavTenant[];
  /** Os demais, só para o super administrador. */
  outros: NavTenant[];
}) {
  const pathname = usePathname();
  const idDaUrl = pathname.match(/^\/admin\/tenants\/([^/]+)/)?.[1];

  const proprio = proprios.find((t) => t.id === idDaUrl);
  const alheio = proprio ? undefined : outros.find((t) => t.id === idDaUrl);
  const current = proprio ?? alheio ?? (idDaUrl ? undefined : proprios[0]);

  return (
    <>
      {alheio && (
        // Âmbar é a cor da plataforma. Aqui ela avisa que este painel não é
        // da pessoa: o que for salvo vale para o provedor de outro cliente.
        <div className="mx-3 mt-3 rounded-[11px] border border-warning/35 bg-warning/10 px-3 py-2.5">
          <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-warning">
            Super administrador
          </div>
          <p className="text-[11.5px] text-fg-2 leading-snug mt-1">
            Você está editando o painel de {alheio.name}.
          </p>
          <Link
            href={`/plataforma/provedores/${alheio.id}`}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-warning hover:underline mt-1.5"
          >
            <Icon name="arrow-right" size={12} style={{ transform: 'rotate(180deg)' }} />
            Voltar à plataforma
          </Link>
        </div>
      )}

      {current && (
        <div className="px-3 pt-3">
          <Link
            href={alheio ? `/admin/tenants/${current.id}` : '/admin'}
            className="px-3 py-2.5 rounded-[11px] bg-bg-3 border border-border flex items-center gap-2.5 hover:border-border-strong transition-colors"
          >
            <span
              className="w-7 h-7 rounded-[8px] text-white flex items-center justify-center text-[11px] font-extrabold shrink-0 overflow-hidden"
              style={{ background: current.primary_color }}
            >
              {current.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                current.name[0]
              )}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[12.5px] font-bold truncate leading-tight">{current.name}</span>
              <span className="flex items-center gap-1.5 mt-1">
                <span
                  className={[
                    'w-1.5 h-1.5 rounded-full',
                    current.status === 'active' ? 'bg-success' : 'bg-warning',
                  ].join(' ')}
                />
                <span className="text-[10.5px] text-fg-3">
                  {current.status}
                  {!alheio && proprios.length > 1 && ` · ${proprios.length} provedores`}
                </span>
              </span>
            </span>
            <Icon name="chevron" size={13} className="text-fg-3" style={{ transform: 'rotate(90deg)' }} />
          </Link>
        </div>
      )}

      <div className="pt-3" />
      <div className="px-3 flex flex-col gap-0.5">
        <NavItem href={current ? `/admin/tenants/${current.id}` : '/admin'} icon="home" exact>
          Visão geral
        </NavItem>

        {current && (
          <>
            <NavGroup>Configuração</NavGroup>
            <NavItem href={`/admin/tenants/${current.id}/erp`} icon="router">Integração ERP</NavItem>
            <NavItem href={`/admin/tenants/${current.id}/branding`} icon="flash">Marca &amp; visual</NavItem>
            <NavItem href={`/admin/tenants/${current.id}/aplicativo`} icon="phone">Aplicativo</NavItem>
            <NavItem href={`/admin/tenants/${current.id}/dominio`} icon="globe">Domínio</NavItem>

            <NavGroup>Operação</NavGroup>
            <NavItem href={`/admin/tenants/${current.id}/customers`} icon="user">Clientes</NavItem>
            <NavItem href={`/admin/tenants/${current.id}/plans`} icon="file">Planos</NavItem>

            <NavGroup>Conta</NavGroup>
            <NavItem href={`/admin/tenants/${current.id}/team`} icon="shield">Equipe &amp; acessos</NavItem>
            <NavItem href={`/admin/tenants/${current.id}/configuracoes`} icon="settings">Configurações</NavItem>
          </>
        )}
      </div>
    </>
  );
}
