import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { isMissingTable } from '@/lib/auth/platform';
import type {
  Tenant,
  TenantBilling,
  TenantCharge,
  BillingStatus,
  ChargeStatus,
} from '@/lib/supabase/types';

// Leituras do painel da plataforma. Tudo pela service role: as tabelas de
// faturamento não têm policy, e ninguém além deste painel deve enxergá-las.

export interface ProviderRow {
  tenant: Tenant;
  billing: TenantBilling | null;
  customers: number;
  admins: number;
  /** Cobranças em aberto e já vencidas. */
  overdue: number;
}

const DEFAULT_BILLING = (tenantId: string): TenantBilling => ({
  tenant_id: tenantId,
  monthly_amount_cents: 0,
  billing_day: 10,
  status: 'trial',
  trial_ends_at: null,
  started_at: null,
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export function billingOrDefault(tenantId: string, billing: TenantBilling | null) {
  return billing ?? DEFAULT_BILLING(tenantId);
}

/** Hoje em 'YYYY-MM-DD', no fuso de Brasília — o dia civil que a cobrança usa. */
export function today(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

/** Primeiro dia do mês de referência, em 'YYYY-MM-01'. */
export function monthStart(date = today()): string {
  return `${date.slice(0, 7)}-01`;
}

export async function listProviders(): Promise<{ rows: ProviderRow[]; missingTable: boolean }> {
  const supabase = createAdminClient();

  const { data: tenantRows } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });
  const tenants = (tenantRows ?? []) as unknown as Tenant[];

  const { data: billingRows, error: billingError } = await supabase.from('tenant_billing').select('*');
  if (isMissingTable(billingError as { code?: string; message?: string } | null)) {
    return { rows: tenants.map((t) => ({ tenant: t, billing: null, customers: 0, admins: 0, overdue: 0 })), missingTable: true };
  }
  const billing = new Map(
    ((billingRows ?? []) as unknown as TenantBilling[]).map((b) => [b.tenant_id, b]),
  );

  // Contagens de uma vez só: uma consulta por tabela, agregada em memória. São
  // dezenas de provedores, não milhões, e uma contagem por linha viraria N+1.
  const [{ data: customerIds }, { data: adminIds }, { data: charges }] = await Promise.all([
    supabase.from('customers').select('tenant_id'),
    supabase.from('tenant_admins').select('tenant_id'),
    supabase.from('tenant_charges').select('tenant_id, status, due_date'),
  ]);

  const count = (rows: { tenant_id: string }[] | null) => {
    const map = new Map<string, number>();
    for (const r of rows ?? []) map.set(r.tenant_id, (map.get(r.tenant_id) ?? 0) + 1);
    return map;
  };

  const customers = count(customerIds as { tenant_id: string }[] | null);
  const admins = count(adminIds as { tenant_id: string }[] | null);

  const hoje = today();
  const overdue = new Map<string, number>();
  for (const c of (charges ?? []) as { tenant_id: string; status: string; due_date: string }[]) {
    if (c.status === 'open' && c.due_date < hoje) {
      overdue.set(c.tenant_id, (overdue.get(c.tenant_id) ?? 0) + 1);
    } else if (c.status === 'overdue') {
      overdue.set(c.tenant_id, (overdue.get(c.tenant_id) ?? 0) + 1);
    }
  }

  return {
    rows: tenants.map((tenant) => ({
      tenant,
      billing: billing.get(tenant.id) ?? null,
      customers: customers.get(tenant.id) ?? 0,
      admins: admins.get(tenant.id) ?? 0,
      overdue: overdue.get(tenant.id) ?? 0,
    })),
    missingTable: false,
  };
}

export interface PlatformSummary {
  providers: number;
  active: number;
  trial: number;
  suspended: number;
  /** Receita recorrente mensal: soma das mensalidades de quem está ativo. */
  mrrCents: number;
  openCents: number;
  overdueCents: number;
  paidThisMonthCents: number;
  customers: number;
}

export async function platformSummary(rows: ProviderRow[]): Promise<PlatformSummary> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('tenant_charges').select('amount_cents, status, due_date, paid_at');
  const charges = (data ?? []) as {
    amount_cents: number;
    status: ChargeStatus;
    due_date: string;
    paid_at: string | null;
  }[];

  const hoje = today();
  const mesAtual = hoje.slice(0, 7);

  let openCents = 0;
  let overdueCents = 0;
  let paidThisMonthCents = 0;

  for (const c of charges) {
    if (c.status === 'paid') {
      if ((c.paid_at ?? '').slice(0, 7) === mesAtual) paidThisMonthCents += c.amount_cents;
      continue;
    }
    if (c.status === 'cancelled') continue;
    if (c.status === 'overdue' || c.due_date < hoje) overdueCents += c.amount_cents;
    else openCents += c.amount_cents;
  }

  return {
    providers: rows.length,
    active: rows.filter((r) => r.tenant.status === 'active').length,
    trial: rows.filter((r) => r.tenant.status === 'trial').length,
    suspended: rows.filter((r) => r.tenant.status === 'suspended' || r.tenant.status === 'cancelled').length,
    mrrCents: rows
      .filter((r) => r.billing?.status === 'active' || r.billing?.status === 'past_due')
      .reduce((sum, r) => sum + (r.billing?.monthly_amount_cents ?? 0), 0),
    openCents,
    overdueCents,
    paidThisMonthCents,
    customers: rows.reduce((sum, r) => sum + r.customers, 0),
  };
}

export interface ProviderAdmin {
  user_id: string;
  role: string;
  email: string | null;
  last_sign_in_at: string | null;
  created_at: string;
}

export interface ProviderDetail {
  tenant: Tenant;
  billing: TenantBilling;
  admins: ProviderAdmin[];
  charges: TenantCharge[];
  customers: number;
}

export async function getProvider(id: string): Promise<ProviderDetail | null> {
  const supabase = createAdminClient();

  const { data: tenantRow } = await supabase.from('tenants').select('*').eq('id', id).maybeSingle();
  if (!tenantRow) return null;
  const tenant = tenantRow as unknown as Tenant;

  const [{ data: billingRow }, { data: adminRows }, { data: chargeRows }, { count }] = await Promise.all([
    supabase.from('tenant_billing').select('*').eq('tenant_id', id).maybeSingle(),
    supabase.from('tenant_admins').select('user_id, role, created_at').eq('tenant_id', id),
    supabase.from('tenant_charges').select('*').eq('tenant_id', id).order('reference_month', { ascending: false }),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
  ]);

  // O e-mail do administrador mora em auth.users, não em tenant_admins. É o
  // dado que o super admin precisa para redefinir senha, então vale a viagem.
  const admins: ProviderAdmin[] = await Promise.all(
    ((adminRows ?? []) as { user_id: string; role: string; created_at: string }[]).map(async (a) => {
      const { data } = await supabase.auth.admin.getUserById(a.user_id);
      return {
        user_id: a.user_id,
        role: a.role,
        created_at: a.created_at,
        email: data.user?.email ?? null,
        last_sign_in_at: data.user?.last_sign_in_at ?? null,
      };
    }),
  );

  return {
    tenant,
    billing: billingOrDefault(id, (billingRow as unknown as TenantBilling) ?? null),
    admins,
    charges: (chargeRows ?? []) as unknown as TenantCharge[],
    customers: count ?? 0,
  };
}

export interface ChargeWithTenant extends TenantCharge {
  tenant_name: string;
  tenant_slug: string;
}

export async function listCharges(limit = 200): Promise<ChargeWithTenant[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('tenant_charges')
    .select('*, tenant:tenants(name, slug)')
    .order('due_date', { ascending: false })
    .limit(limit);

  return ((data ?? []) as unknown as (TenantCharge & { tenant: { name: string; slug: string } | null })[]).map(
    (c) => ({
      ...c,
      tenant_name: c.tenant?.name ?? '—',
      tenant_slug: c.tenant?.slug ?? '',
    }),
  );
}

export const BILLING_LABEL: Record<BillingStatus, string> = {
  trial: 'em teste',
  active: 'ativo',
  past_due: 'em atraso',
  cancelled: 'cancelado',
};

export const CHARGE_LABEL: Record<ChargeStatus, string> = {
  open: 'em aberto',
  paid: 'paga',
  overdue: 'vencida',
  cancelled: 'cancelada',
};

/** Vencida é conta de calendário, não coluna: quem está 'open' e passou da data já venceu. */
export function effectiveChargeStatus(charge: { status: ChargeStatus; due_date: string }): ChargeStatus {
  if (charge.status === 'open' && charge.due_date < today()) return 'overdue';
  return charge.status;
}
