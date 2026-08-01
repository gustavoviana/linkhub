import { listCharges, listProviders, platformSummary } from '@/lib/platform/data';
import { MigrationNotice } from '../migration-notice';
import BillingScreen from './billing-screen';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const { rows, missingTable } = await listProviders();
  if (missingTable) return <MigrationNotice />;

  const [charges, resumo] = await Promise.all([listCharges(), platformSummary(rows)]);

  return <BillingScreen charges={charges} resumo={resumo} />;
}
