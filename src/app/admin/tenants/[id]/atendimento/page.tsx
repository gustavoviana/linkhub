import { requireTenantAdmin } from '@/lib/auth/tenant-access';
import { estadoDoChat } from '@/lib/chat/config';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { CopySql } from '../aplicativo/copy-sql';
import ChatForm from './chat-form';

export const dynamic = 'force-dynamic';

export default async function AtendimentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTenantAdmin(id);

  const estado = await estadoDoChat(id);
  if (estado.missingTable) return <MigrationNotice />;

  return <ChatForm tenantId={id} estado={estado} />;
}

// Enquanto a tabela não existir, o SQL pronto para colar ajuda mais que um
// erro. Mesmo conteúdo de supabase/migrations/20261016_013_tenant_chat.sql.
const SQL = `create table if not exists tenant_chat (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  provider text not null default 'fiberdesk' check (provider in ('fiberdesk')),
  api_key text not null,
  key_hint text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tenant_chat enable row level security;

drop trigger if exists trg_tenant_chat_updated on tenant_chat;
create trigger trg_tenant_chat_updated before update on tenant_chat
  for each row execute function set_updated_at();`;

function MigrationNotice() {
  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Falta rodar a migração</CardTitle>
          <CardSubtitle>A tabela do chat de atendimento ainda não existe neste banco</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-fg-2 leading-relaxed">
            Copie o SQL abaixo, cole no <strong>SQL Editor</strong> do Supabase e rode uma vez. É o
            arquivo{' '}
            <code className="font-mono text-xs bg-bg-3 px-1.5 py-0.5 rounded">
              supabase/migrations/20261016_013_tenant_chat.sql
            </code>
            . Depois é só recarregar esta página.
          </p>
          <CopySql sql={SQL} />
          <p className="text-xs text-fg-2">
            A tabela fica sem policy de leitura de propósito: ela guarda o token que abre o
            atendimento de qualquer assinante, então só o servidor enxerga.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
