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
  /** Nome do plano como está no contrato — nem todo ERP tem catálogo à parte. */
  planName?: string;
  planDownMbps?: number;
  planUpMbps?: number;
  status: 'active' | 'suspended' | 'cancelled' | 'pending';
  pppoeUser?: string;
  dueDay?: number;
  monthlyPriceCents?: number;
  installationAddress?: string;
  activatedAt?: string;
}

/** Estado da conexão do assinante, como o ERP enxerga agora. */
export interface ErpConnection {
  online: boolean;
  login?: string;
  ip?: string;
  mac?: string;
  /** Tipo de autenticação/conexão, ex.: PPPoEoVLAN. */
  kind?: string;
  concentrator?: string;
  /** Início da conexão atual (ISO). */
  since?: string;
  /** Segundos conectado na sessão atual. */
  uptimeSeconds?: number;
  /** Consumo acumulado da sessão atual, em bytes. */
  downloadBytes?: number;
  uploadBytes?: number;
  /** Franquia contratada em bytes; 0 ou ausente = ilimitado. */
  quotaBytes?: number;
  onu?: string;
  disconnectReason?: string;
}

/** Um dia de consumo, para o gráfico da central. */
export interface ErpUsagePoint {
  /** YYYY-MM-DD */
  date: string;
  downloadBytes: number;
  uploadBytes: number;
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

  /** Opcionais: nem todo ERP expõe. A central esconde o bloco quando faltam. */
  getConnection?(contractExternalId: string): Promise<ErpConnection | null>;
  getUsage?(contractExternalId: string, days?: number, login?: string): Promise<ErpUsagePoint[]>;
  /** Pix é gerado na hora pelo ERP — não faz sentido guardar cópia velha. */
  getInvoicePix?(invoiceExternalId: string): Promise<ErpPix | null>;
  /** PDF do boleto em base64, quando o ERP sabe emitir. */
  getInvoiceBoletoPdf?(invoiceExternalId: string): Promise<string | null>;
}

export interface ErpPix {
  /** Código copia e cola (EMV). */
  copyPaste: string;
  /** PNG do QR em base64, sem o prefixo data:. */
  qrImageBase64?: string;
  expiresAt?: string;
  status?: string;
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
