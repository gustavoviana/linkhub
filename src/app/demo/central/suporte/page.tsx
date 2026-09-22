import { PortalShell } from '@/components/portal/shell';
import { SupportScreen } from '@/app/portal/suporte/support-screen';
import { demoContexto } from '@/lib/demo/server';

// Atendimento: os mesmos assuntos guiados do portal e o mesmo formulário de
// chamado. Na demonstração o chamado nasce e vive na tela — ver o comentário
// em support-screen.tsx.

export const dynamic = 'force-dynamic';

export default async function DemoSuporte() {
  const { tenant, data } = await demoContexto();

  return (
    <PortalShell tenant={tenant} customer={data.customer}>
      <SupportScreen tenant={tenant} tickets={data.tickets} />
    </PortalShell>
  );
}
