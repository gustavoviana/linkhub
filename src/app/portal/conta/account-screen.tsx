'use client';

import Link from 'next/link';
import type { Tenant, Customer, Contract, Plan } from '@/lib/supabase/types';
import { contractStatusLabel, formatBRL, maskCpfCnpj, maskPhone, titleCaseName } from '@/lib/utils';
import { Icon } from '@/components/portal/icons';
import { portalTokens, type PortalTokens } from '@/components/portal/tokens';
import { usePortalTokens } from '@/components/portal/theme';
import { ScreenHeader } from '@/components/portal/shell';
import { initials } from '@/components/portal/ui';

export function AccountScreen({
  tenant,
  customer,
  contract,
  plan,
  mensalidadeCents,
}: {
  tenant: Tenant;
  customer: Customer;
  contract: Contract | null;
  plan: Plan | null;
  /** Já resolvida no servidor: contrato, plano ou histórico de faturas. */
  mensalidadeCents?: number | null;
}) {
  const t = usePortalTokens(tenant);

  const address = [
    customer.address_street && `${customer.address_street}, ${customer.address_number ?? 's/n'}`,
    customer.address_district,
    customer.address_city && `${customer.address_city}${customer.address_state ? ` - ${customer.address_state}` : ''}`,
    customer.address_zip,
  ].filter(Boolean);

  return (
    <div>
      <ScreenHeader t={t} title="Minha conta" />

      <div style={{ padding: '0 20px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: t.accentGrad,
            color: t.accentFg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          {initials(customer.name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{titleCaseName(customer.name)}</div>
          <div style={{ fontSize: 13, color: t.text2, fontFamily: t.mono }}>
            {maskCpfCnpj(customer.cpf_cnpj)}
          </div>
        </div>
      </div>

      {plan && (
        <Card t={t}>
          <CardTitle t={t} icon="wifi">Plano contratado</CardTitle>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{plan.name}</div>
          {/* Velocidade só quando o ERP informa: "— Mbps de download" não diz
              nada a ninguém e ainda parece defeito. */}
          {(plan.down_mbps || plan.up_mbps) && (
            <div style={{ fontSize: 13, color: t.text2, marginTop: 2 }}>
              {plan.down_mbps ?? '—'} Mbps de download · {plan.up_mbps ?? '—'} Mbps de upload
            </div>
          )}
          <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
            {!!mensalidadeCents && <Field t={t} label="Mensalidade" value={formatBRL(mensalidadeCents)} />}
            {contract?.due_day && <Field t={t} label="Vencimento" value={`Dia ${contract.due_day}`} />}
            {contract?.status && <Field t={t} label="Situação" value={contractStatusLabel(contract.status)} />}
          </div>
        </Card>
      )}

      <Card t={t}>
        <CardTitle t={t} icon="user">Dados pessoais</CardTitle>
        <Line t={t} label="Nome" value={titleCaseName(customer.name)} />
        <Line t={t} label="CPF" value={maskCpfCnpj(customer.cpf_cnpj)} />
        {customer.email && <Line t={t} label="E-mail" value={customer.email} />}
        {customer.phone && <Line t={t} label="Telefone" value={maskPhone(customer.phone)} />}
      </Card>

      {address.length > 0 && (
        <Card t={t}>
          <CardTitle t={t} icon="home">Endereço de instalação</CardTitle>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: t.text2 }}>
            {address.map((line) => (
              <div key={line as string}>{line}</div>
            ))}
          </div>
        </Card>
      )}

      <div style={{ padding: '4px 20px 8px', fontSize: 12, color: t.text3, lineHeight: 1.6 }}>
        Precisa corrigir algum dado? Fale com o {tenant.name} — os cadastros vêm do sistema do provedor.
      </div>

      <div style={{ padding: '8px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Link
          href="/suporte"
          style={{
            height: 46,
            borderRadius: 12,
            background: t.surface,
            border: `1px solid ${t.border}`,
            color: t.text,
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Icon name="help" size={16} /> Falar com o suporte
        </Link>
        {/* Sair é POST — ver o comentário no shell do portal. */}
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            style={{
              width: '100%',
              height: 46,
              borderRadius: 12,
              background: 'transparent',
              border: `1px solid ${t.border}`,
              color: t.danger,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <Icon name="logout" size={16} /> Sair da conta
          </button>
        </form>
      </div>
    </div>
  );
}

function Card({ t, children }: { t: PortalTokens; children: React.ReactNode }) {
  return (
    <section
      style={{
        margin: '0 20px 12px',
        padding: 18,
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
      }}
    >
      {children}
    </section>
  );
}

function CardTitle({ t, icon, children }: { t: PortalTokens; icon: 'wifi' | 'user' | 'home'; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ color: t.accent, display: 'flex' }}>
        <Icon name={icon} size={16} />
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.text2 }}>
        {children}
      </span>
    </div>
  );
}

function Line({ t, label, value }: { t: PortalTokens; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: `1px solid ${t.borderSoft}`, fontSize: 14 }}>
      <span style={{ color: t.text2 }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

function Field({ t, label, value }: { t: PortalTokens; label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: t.text2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, fontFamily: t.mono, marginTop: 2 }}>{value}</div>
    </div>
  );
}
