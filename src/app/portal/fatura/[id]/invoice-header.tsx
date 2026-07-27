'use client';

import type { Tenant } from '@/lib/supabase/types';
import { ScreenHeader } from '@/components/portal/shell';
import { portalTokens } from '@/components/portal/tokens';

export function InvoiceHeader({ tenant }: { tenant: Tenant }) {
  const t = portalTokens(tenant, tenant.dark_mode_default);
  return <ScreenHeader t={t} title="Pagamento" back="/fatura" />;
}
