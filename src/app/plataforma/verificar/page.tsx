import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/session';
import { getPlatformSession, mfaPendente } from '@/lib/auth/platform';
import VerifyForm from './verify-form';

// Fica fora do layout do painel de propósito: sessão com segundo fator
// pendente não deve enxergar a navegação nem os números da plataforma.

export const dynamic = 'force-dynamic';

export default async function VerifyPage() {
  const user = await getUser();
  if (!user) redirect('/login?next=/plataforma');

  const session = await getPlatformSession();
  if (!session) redirect('/admin');

  // Já verificou (ou nem tem fator): não há o que fazer aqui.
  if (!(await mfaPendente())) redirect('/plataforma');

  return <VerifyForm email={session.email} />;
}
