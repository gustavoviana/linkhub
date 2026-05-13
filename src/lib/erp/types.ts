// Modelo canônico que cada adapter deve devolver — independente do ERP origem.

export interface ErpCustomer {
  externalId: string;
  cpfCnpj: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    district?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

export interface ErpPlan {
  externalId: string;
  name: string;
  description?: string;
  downMbps?: number;
  upMbps?: number;
  priceCents: number;
  fidelityMonths?: number;
}

export interface ErpContract {
  externalId: string;
  customerExternalId: string;
  planExternalId?: string;
  status: 'active' | 'suspended' | 'cancelled' | 'pending';
  pppoeUser?: string;
  dueDay?: number;
  monthlyPriceCents?: number;
  installationAddress?: string;
  activatedAt?: string;
}

export interface ErpInvoice {
  externalId: string;
  contractExternalId: string;
  referenceMonth?: string;       // YYYY-MM-01
  dueDate: string;               // YYYY-MM-DD
  amountCents: number;
  status: 'open' | 'paid' | 'overdue' | 'cancelled' | 'partial';
  pixCopyPaste?: string;
  pixQrCode?: string;
  boletoLine?: string;
  boletoPdfUrl?: string;
  nfeUrl?: string;
  paidAt?: string;
  paidAmountCents?: number;
  paidMethod?: string;
}

export interface ErpAdapter {
  name: string;

  /** Testa credenciais. Útil pro admin antes de salvar. */
  testConnection(): Promise<{ ok: boolean; message?: string }>;

  listPlans(): Promise<ErpPlan[]>;
  findCustomerByCpf(cpf: string): Promise<ErpCustomer | null>;
  listContractsByCustomer(customerExternalId: string): Promise<ErpContract[]>;
  listInvoicesByContract(contractExternalId: string, opts?: { onlyOpen?: boolean }): Promise<ErpInvoice[]>;
  getInvoice(invoiceExternalId: string): Promise<ErpInvoice | null>;
}

export type ErpConfig = {
  ixc?: {
    baseUrl: string;        // ex: https://central.netvale.com.br
    token: string;          // Base64(user:apiKey) — gerado pelo IXC
  };
  sgp?: {
    baseUrl: string;        // ex: https://demo.sgp.net.br
    app: string;            // appName configurado no SGP
    token: string;          // token da integração
  };
  hubsoft?: {
    baseUrl: string;        // ex: https://api.hubsoft.com.br
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
  };
  mk_solutions?: {
    baseUrl: string;
    user: string;
    password: string;
    wsLogin?: string;
    wsPass?: string;
  };
};
