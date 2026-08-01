import { redirect } from 'next/navigation';
import { getPlatformSession } from '@/lib/auth/platform';

// Criar provedor virou trabalho do painel da plataforma.
//
// Antes esta tela ficava no painel do cliente, o que dava a qualquer provedor
// o poder de abrir outros provedores. A rota continua existindo só para não
// quebrar link salvo: super administrador vai para a tela nova, e o resto
// volta para o próprio painel.

export const dynamic = 'force-dynamic';

export default async function NewTenantRedirect() {
  const platform = await getPlatformSession();
  redirect(platform ? '/plataforma/provedores' : '/admin');
}
