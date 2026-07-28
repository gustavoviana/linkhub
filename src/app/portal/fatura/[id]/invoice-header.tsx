'use client';

import type { Tenant } from '@/lib/supabase/types';
import { ScreenHeader } from '@/components/portal/shell';
import { portalTokens } from '@/components/portal/tokens';
import { usePortalTokens } from '@/components/portal/theme';

export function InvoiceHeader({ tenant }: { tenant: Tenant }) {
  const t = usePortalTokens(tenant);
  return <ScreenHeader t={t} title="Pagamento" back="/fatura" />;
}
