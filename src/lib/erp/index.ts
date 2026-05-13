import 'server-only';
import type { Tenant } from '@/lib/supabase/types';
import type { ErpAdapter, ErpConfig } from './types';
import { MockAdapter } from './mock';
import { IxcAdapter } from './ixc';
import { SgpAdapter } from './sgp';
import { HubsoftAdapter } from './hubsoft';

export * from './types';

// Factory que devolve o adapter correto pra um tenant. Se o ERP do tenant
// não está configurado/válido, cai pra mock — assim o portal nunca quebra
// durante o onboarding do provedor.

export function getAdapterForTenant(tenant: Tenant): ErpAdapter {
  const cfg = tenant.erp_config as ErpConfig;
  try {
    switch (tenant.erp_type) {
      case 'ixc':
        if (!cfg.ixc?.baseUrl || !cfg.ixc?.token) return new MockAdapter();
        return new IxcAdapter(cfg.ixc);
      case 'sgp':
        if (!cfg.sgp?.baseUrl || !cfg.sgp?.token) return new MockAdapter();
        return new SgpAdapter(cfg.sgp);
      case 'hubsoft':
        if (!cfg.hubsoft?.baseUrl || !cfg.hubsoft?.clientId) return new MockAdapter();
        return new HubsoftAdapter(cfg.hubsoft);
      case 'mock':
      default:
        return new MockAdapter();
    }
  } catch {
    return new MockAdapter();
  }
}
