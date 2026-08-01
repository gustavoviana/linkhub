import { requirePlatformAdmin } from '@/lib/auth/platform';
import AccountScreen from './account-screen';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const session = await requirePlatformAdmin();
  return <AccountScreen email={session.email} />;
}
