import { createAdminClient } from '@/lib/supabase/admin';
import { asAdmins } from '@/lib/supabase/helpers';
import { requireTenantAdmin } from '@/lib/auth/session';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTenantAdmin(id);

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('tenant_admins')
    .select('*')
    .eq('tenant_id', id)
    .order('created_at', { ascending: true });
  const members = asAdmins(data);

  return (
    <div className="p-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardSubtitle>Usuários com acesso ao painel deste provedor</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium font-mono">{m.user_id.slice(0, 12)}…</div>
                  <div className="text-xs text-fg-2">
                    Adicionado {new Date(m.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <Badge tone={m.role === 'owner' ? 'brand' : 'neutral'}>{m.role}</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-fg-3 mt-4">
            Convidar mais usuários por e-mail estará disponível em breve.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
