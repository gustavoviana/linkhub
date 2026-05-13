import type { Tenant, Customer, Plan, Contract, Invoice, TenantAdmin } from './types';

// Type assertions pra resultados de queries. O Database type em types.ts é
// minimalista, então os retornos do supabase-js viram `never`. Estes helpers
// fazem o cast explícito por chamada — quando você rodar `npm run types:gen`
// e popular os tipos completos, dá pra remover esses casts.

export const asTenant = (r: unknown) => r as Tenant;
export const asTenantOrNull = (r: unknown) => r as Tenant | null;
export const asTenants = (r: unknown) => (r ?? []) as Tenant[];
export const asCustomer = (r: unknown) => r as Customer;
export const asCustomers = (r: unknown) => (r ?? []) as Customer[];
export const asPlan = (r: unknown) => r as Plan;
export const asPlans = (r: unknown) => (r ?? []) as Plan[];
export const asContract = (r: unknown) => r as Contract;
export const asContracts = (r: unknown) => (r ?? []) as Contract[];
export const asInvoice = (r: unknown) => r as Invoice;
export const asInvoices = (r: unknown) => (r ?? []) as Invoice[];
export const asAdmins = (r: unknown) => (r ?? []) as TenantAdmin[];
