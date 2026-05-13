import { requireTenant } from '@/lib/tenant/resolve';
import LoginForm from './login-form';

export default async function PortalLoginPage() {
  const tenant = await requireTenant();
  return <LoginForm tenant={tenant} />;
}
