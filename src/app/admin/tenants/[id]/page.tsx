import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { requireTenantAdmin } from '@/lib/auth/session';
import { Icon, type IconName } from '@/components/portal/icons';
import { CopyLink } from './copy-link';

// Visão geral do provedor — portada de docs/prototipo/src/admin-dash.jsx:
// alerta do que falta, checklist de configuração, link do portal, saúde da
// integração, escolha de ERP e números. Cada estado vem do banco, não de
// dado fixo: o painel só diz "pronto" quando está pronto de verdade.

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'linkhub.api.br';

export default async function TenantOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTenantAdmin(id);

  const supabase = createAdminClient();
  const [tenantRes, { count: customerCount }, { count: planCount }, { count: invoiceCount }] =
    await Promise.all([
      supabase.from('tenants').select('*').eq('id', id).single(),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
      supabase.from('plans').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
      supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
    ]);
  const tenant = asTenantOrNull(tenantRes.data);
  if (!tenant) return null;

  const erpConnected = tenant.erp_type !== 'mock';
  const hasBrand = !!tenant.logo_url;
  const hasSupport = !!(tenant.support_whatsapp || tenant.support_phone || tenant.support_email);

  const steps = [
    {
      id: 'conta',
      label: 'Criar conta e provedor',
      desc: `${tenant.name} · ${tenant.status}`,
      done: true,
      href: `/admin/tenants/${id}`,
      min: null as string | null,
      critical: false,
    },
    {
      id: 'marca',
      label: 'Subir logo e definir cores',
      desc: 'Sua marca no portal e na tela de entrada',
      done: hasBrand,
      href: `/admin/tenants/${id}/branding`,
      min: '3 min',
      critical: false,
    },
    {
      id: 'erp',
      label: 'Conectar com seu ERP',
      desc: 'Sem isso o portal fica vazio — este é o passo crítico',
      done: erpConnected,
      href: `/admin/tenants/${id}/erp`,
      min: '5 min',
      critical: true,
    },
    {
      id: 'planos',
      label: 'Sincronizar planos',
      desc: 'Importa o catálogo direto do seu sistema',
      done: (planCount ?? 0) > 0,
      href: `/admin/tenants/${id}/plans`,
      min: '1 min',
      critical: false,
    },
    {
      id: 'suporte',
      label: 'Adicionar contato de suporte',
      desc: 'WhatsApp, telefone e e-mail que aparecem para o cliente',
      done: hasSupport,
      href: `/admin/tenants/${id}/branding`,
      min: '2 min',
      critical: false,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const nextStep = steps.find((s) => !s.done);
  const blocking = steps.filter((s) => !s.done && s.critical);
  const portalUrl = tenant.custom_domain_verified && tenant.custom_domain
    ? `https://${tenant.custom_domain}`
    : `https://${tenant.slug}.${ROOT_DOMAIN}`;

  const health: { label: string; detail: string; state: 'ok' | 'warn' | 'err'; href: string }[] = [
    erpConnected
      ? { label: 'ERP conectado', detail: `${tenant.erp_type.toUpperCase()}${tenant.erp_last_sync_status ? ` · ${tenant.erp_last_sync_status}` : ''}`, state: 'ok', href: `/admin/tenants/${id}/erp` }
      : { label: 'ERP não conectado', detail: 'Portal mostrando dados de teste', state: 'err', href: `/admin/tenants/${id}/erp` },
    hasBrand
      ? { label: 'Marca aplicada', detail: 'Logo e cores salvos', state: 'ok', href: `/admin/tenants/${id}/branding` }
      : { label: 'Marca padrão', detail: 'Sem logo enviada', state: 'warn', href: `/admin/tenants/${id}/branding` },
    hasSupport
      ? { label: 'Canais de atendimento', detail: 'Visíveis no portal', state: 'ok', href: `/admin/tenants/${id}/branding` }
      : { label: 'Contato de suporte', detail: 'Nenhum canal informado', state: 'warn', href: `/admin/tenants/${id}/branding` },
    (planCount ?? 0) > 0
      ? { label: 'Planos importados', detail: `${planCount} plano(s)`, state: 'ok', href: `/admin/tenants/${id}/plans` }
      : { label: 'Nenhum plano', detail: 'Sincronize com o ERP', state: 'warn', href: `/admin/tenants/${id}/plans` },
  ];

  return (
    <div className="p-7 pb-24 max-w-[1180px]">
      {blocking.length > 0 && (
        <div className="px-[18px] py-3.5 rounded-xl bg-warning/10 border border-warning/25 flex items-center gap-3.5 mb-5">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-warning/20 text-warning flex items-center justify-center shrink-0">
            <Icon name="flash" size={17} />
          </div>
          <div className="flex-1">
            <div className="text-[13.5px] font-bold text-warning">
              Seu portal ainda não está pronto para receber clientes
            </div>
            <div className="text-[12.5px] text-fg-2 mt-0.5">
              Falta {blocking.map((s) => s.label.toLowerCase()).join(' e ')}. Sem isso o cliente vê o portal vazio.
            </div>
          </div>
          {nextStep && (
            <Link
              href={nextStep.href}
              className="h-[34px] px-3.5 rounded-[9px] bg-warning text-white text-[12.5px] font-bold flex items-center shrink-0"
            >
              Resolver agora
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-4 mb-5">
        {/* Checklist */}
        <div className="bg-bg-2 border border-border rounded-[14px]">
          <div className="px-5 pt-[18px] pb-4 border-b border-border">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15.5px] font-bold tracking-[-0.01em] m-0">Configuração do provedor</h2>
                <p className="text-[12.5px] text-fg-2 m-0 mt-0.5">
                  {doneCount} de {steps.length} etapas concluídas
                </p>
              </div>
              <div className="text-[26px] font-extrabold tracking-[-0.03em] text-brand leading-none tabular-nums">
                {pct}%
              </div>
            </div>
            <div className="mt-3.5 h-1.5 rounded bg-bg-3 overflow-hidden flex gap-0.5">
              {steps.map((s) => (
                <div key={s.id} className={`flex-1 rounded ${s.done ? 'bg-brand' : 'bg-transparent'}`} />
              ))}
            </div>
          </div>

          <div>
            {steps.map((s, i) => (
              <Link
                key={s.id}
                href={s.href}
                className={`flex items-center gap-3 px-5 py-3 hover:bg-bg-3/60 transition-colors ${
                  i < steps.length - 1 ? 'border-b border-border' : ''
                } ${!s.done && s.critical ? 'bg-brand/5' : ''}`}
              >
                {s.done ? (
                  <div className="w-[22px] h-[22px] rounded-full bg-success text-white flex items-center justify-center shrink-0">
                    <Icon name="check" size={13} />
                  </div>
                ) : (
                  <div
                    className={`w-[22px] h-[22px] rounded-full border-2 border-dashed shrink-0 flex items-center justify-center text-[10px] font-bold text-fg-3 ${
                      s.critical ? 'border-brand' : 'border-border'
                    }`}
                  >
                    {i + 1}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[13.5px] ${
                        s.done ? 'font-medium text-fg-2 line-through' : 'font-semibold text-fg'
                      }`}
                    >
                      {s.label}
                    </span>
                    {s.critical && !s.done && (
                      <span className="text-[10px] px-1.5 py-[1.5px] rounded bg-danger/10 text-danger font-bold tracking-wide">
                        OBRIGATÓRIO
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-fg-2 mt-0.5">{s.desc}</div>
                </div>
                {s.min && !s.done && <span className="text-[11px] text-fg-3 shrink-0">{s.min}</span>}
                {!s.done && (
                  <span
                    className={`h-[30px] px-3 rounded-lg text-xs font-semibold flex items-center shrink-0 ${
                      s.critical ? 'bg-brand text-brand-fg' : 'border border-border text-fg'
                    }`}
                  >
                    {s.critical ? 'Configurar' : 'Abrir'}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Coluna direita */}
        <div className="flex flex-col gap-4">
          <div className="bg-bg-2 border border-border rounded-[14px] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-success/10 text-success flex items-center justify-center">
                <Icon name="globe" size={15} />
              </div>
              <div className="flex-1">
                <div className="text-[13.5px] font-bold">Link do seu portal</div>
                <div className="text-[11.5px] text-success font-semibold">● No ar</div>
              </div>
            </div>
            <CopyLink url={portalUrl} />
            <div className="mt-3 pt-3 border-t border-border text-[11.5px] text-fg-2 leading-relaxed">
              Seus clientes entram com <strong className="text-fg">CPF e senha</strong> e resolvem
              2ª via, Pix, boleto e atendimento sozinhos.
            </div>
          </div>

          <div className="bg-bg-2 border border-border rounded-[14px] p-5 flex-1">
            <div className="text-xs font-bold tracking-[0.06em] uppercase text-fg-3 mb-3">
              Saúde da integração
            </div>
            {health.map((h, i) => (
              <Link
                key={h.label}
                href={h.href}
                className={`flex items-center gap-2.5 py-2 ${
                  i < health.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <span
                  className={`w-[7px] h-[7px] rounded-full shrink-0 ${
                    h.state === 'ok' ? 'bg-success' : h.state === 'warn' ? 'bg-warning' : 'bg-danger'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold">{h.label}</div>
                  <div className="text-[11.5px] text-fg-3">{h.detail}</div>
                </div>
                {h.state !== 'ok' && <Icon name="chevron" size={13} />}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {!erpConnected && (
        <>
          <SectionLabel>Conecte seu ERP · passo recomendado agora</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
            {ERPS.map((e) => (
              <Link
                key={e.id}
                href={`/admin/tenants/${id}/erp`}
                className="p-4 bg-bg-2 border border-border rounded-[13px] hover:border-brand transition-colors relative"
              >
                {e.tag && (
                  <span className="absolute top-3 right-3 text-[10px] px-1.5 py-0.5 rounded bg-brand/10 text-brand font-bold">
                    {e.tag}
                  </span>
                )}
                <div className="w-[34px] h-[34px] rounded-[9px] bg-brand/10 text-brand flex items-center justify-center mb-3">
                  <Icon name="router" size={17} />
                </div>
                <div className="text-[13.5px] font-bold">{e.name}</div>
                <div className="text-[11.5px] text-fg-2 mt-0.5">{e.auth}</div>
                <div className="mt-3 text-xs text-brand font-semibold flex items-center gap-1.5">
                  Conectar <Icon name="arrow-right" size={12} />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <SectionLabel>Números do provedor</SectionLabel>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Kpi
          label="Clientes sincronizados"
          value={customerCount ?? 0}
          sub={erpConnected ? 'Vindos do seu ERP' : 'Aguardando conexão com ERP'}
          icon="user"
        />
        <Kpi
          label="Planos importados"
          value={planCount ?? 0}
          sub="Catálogo exibido no portal"
          icon="file"
        />
        <Kpi
          label="Faturas no portal"
          value={invoiceCount ?? 0}
          sub="Sincronizadas do ERP"
          icon="card"
        />
        <Kpi
          label="Última sincronização"
          value={tenant.erp_last_sync_at ? new Date(tenant.erp_last_sync_at).toLocaleString('pt-BR') : 'Nunca'}
          sub={tenant.erp_last_sync_error ? `Erro: ${tenant.erp_last_sync_error}` : 'Rodada manualmente em Planos'}
          icon="refresh"
          small
        />
      </div>
    </div>
  );
}

const ERPS = [
  { id: 'ixc', name: 'IXC Soft', auth: 'Token de API + host', tag: 'Mais usado' },
  { id: 'sgp', name: 'SGP', auth: 'App + token público', tag: null },
  { id: 'hubsoft', name: 'Hubsoft', auth: 'OAuth2 client', tag: null },
  { id: 'mock', name: 'Dados de teste', auth: 'Enquanto você integra', tag: null },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-bold tracking-[0.06em] uppercase text-fg-3 mb-3">{children}</div>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon,
  small,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: IconName;
  small?: boolean;
}) {
  const empty = value === 0 || value === 'Nunca';
  return (
    <div className="bg-bg-2 border border-border rounded-[14px] p-[17px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold tracking-[0.05em] uppercase text-fg-3">{label}</span>
        <Icon name={icon} size={14} />
      </div>
      <div
        className={`font-bold tracking-[-0.02em] tabular-nums ${small ? 'text-base' : 'text-2xl'} ${
          empty ? 'text-fg-3' : 'text-fg'
        }`}
      >
        {value}
      </div>
      <div className="text-[11.5px] text-fg-2 mt-1.5 leading-snug">{sub}</div>
    </div>
  );
}
