import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';

// A aba depende de duas tabelas novas. Enquanto elas não existirem, mostrar
// o SQL é mais útil que uma tela de erro.

const SQL = `-- supabase/migrations/20260729_006_tenant_apps.sql
-- Cole no SQL Editor do Supabase e rode uma vez.`;

export function MigrationNotice() {
  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Falta rodar a migração</CardTitle>
          <CardSubtitle>As tabelas do aplicativo ainda não existem neste banco</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-fg-2 leading-relaxed">
            Abra o SQL Editor do Supabase e rode o arquivo{' '}
            <code className="font-mono text-xs bg-bg-3 px-1.5 py-0.5 rounded">
              supabase/migrations/20260729_006_tenant_apps.sql
            </code>{' '}
            do repositório. Ele cria <code className="font-mono text-xs">tenant_apps</code> e{' '}
            <code className="font-mono text-xs">tenant_app_builds</code>. Depois é só recarregar esta
            página.
          </p>
          <pre className="text-xs bg-bg-3 rounded-md p-4 overflow-x-auto text-fg-2">{SQL}</pre>
        </CardBody>
      </Card>
    </div>
  );
}
