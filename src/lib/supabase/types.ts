// Tipos manuais. Substitua rodando `npm run types:gen` depois de aplicar
// as migrações (precisa do Supabase CLI configurado).

export type TenantLayout = 'v1' | 'v2' | 'v3';
export type TenantStatus = 'active' | 'suspended' | 'trial' | 'cancelled';
export type ErpType = 'mock' | 'ixc' | 'sgp' | 'hubsoft' | 'mk_solutions';
export type AdminRole = 'owner' | 'admin' | 'support' | 'viewer';
export type InvoiceStatus = 'open' | 'paid' | 'overdue' | 'cancelled' | 'partial';
export type ContractStatus = 'active' | 'suspended' | 'cancelled' | 'pending';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  legal_name: string | null;
  cnpj: string | null;
  status: TenantStatus;
  layout: TenantLayout;
  primary_color: string;
  accent_color: string;
  dark_mode_default: boolean;
  /** Central exige senha além do CPF. Ausente = só CPF. */
  portal_require_password?: boolean;
  logo_url: string | null;
  favicon_url: string | null;
  support_phone: string | null;
  support_whatsapp: string | null;
  support_email: string | null;
  erp_type: ErpType;
  erp_config: Record<string, unknown>;
  erp_last_sync_at: string | null;
  erp_last_sync_status: string | null;
  erp_last_sync_error: string | null;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  external_id: string | null;
  user_id: string | null;
  cpf_cnpj: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_district: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  tenant_id: string;
  external_id: string | null;
  name: string;
  description: string | null;
  down_mbps: number | null;
  up_mbps: number | null;
  price_cents: number;
  fidelity_months: number | null;
  active: boolean;
  created_at: string;
}

export interface Contract {
  id: string;
  tenant_id: string;
  customer_id: string;
  plan_id: string | null;
  external_id: string | null;
  status: ContractStatus;
  pppoe_user: string | null;
  due_day: number | null;
  monthly_price_cents: number | null;
  installation_address: string | null;
  activated_at: string | null;
  cancelled_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  contract_id: string;
  external_id: string | null;
  reference_month: string | null;
  due_date: string;
  amount_cents: number;
  status: InvoiceStatus;
  pix_qr_code: string | null;
  pix_copy_paste: string | null;
  boleto_line: string | null;
  boleto_pdf_url: string | null;
  nfe_url: string | null;
  paid_at: string | null;
  paid_amount_cents: number | null;
  paid_method: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  contract_id: string | null;
  external_id: string | null;
  protocol: string | null;
  subject: string;
  category: string | null;
  status: string;
  priority: string;
  channel: string | null;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
}

export interface TenantAdmin {
  id: string;
  tenant_id: string;
  user_id: string;
  role: AdminRole;
  invited_by: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
}

// Database type estilo Supabase para uso com createClient<Database>.
// Aqui simplificado: apenas as tabelas que usamos. Gere a versão completa
// com `npm run types:gen` se quiser autocompletar full coverage.
export interface Database {
  public: {
    Tables: {
      tenants: { Row: Tenant; Insert: Partial<Tenant>; Update: Partial<Tenant> };
      tenant_admins: { Row: TenantAdmin; Insert: Partial<TenantAdmin>; Update: Partial<TenantAdmin> };
      customers: { Row: Customer; Insert: Partial<Customer>; Update: Partial<Customer> };
      plans: { Row: Plan; Insert: Partial<Plan>; Update: Partial<Plan> };
      contracts: { Row: Contract; Insert: Partial<Contract>; Update: Partial<Contract> };
      invoices: { Row: Invoice; Insert: Partial<Invoice>; Update: Partial<Invoice> };
      support_tickets: { Row: SupportTicket; Insert: Partial<SupportTicket>; Update: Partial<SupportTicket> };
    };
    Functions: {
      create_tenant_with_owner: {
        Args: { p_slug: string; p_name: string; p_legal_name?: string | null; p_cnpj?: string | null };
        Returns: Tenant;
      };
    };
  };
}
