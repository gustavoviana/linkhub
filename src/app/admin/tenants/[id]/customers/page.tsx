import { createAdminClient } from '@/lib/supabase/admin';
import { asCustomers } from '@/lib/supabase/helpers';
import { requireTenantAdmin } from '@/lib/auth/session';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { maskCpfCnpj, maskPhone } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default async function CustomersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTenantAdmin(id);

  const supabase = createAdminClient();
  const { data, count } = await supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('tenant_id', id)
    .order('created_at', { ascending: false })
    .limit(50);
  const customers = asCustomers(data);

  return (
    <div className="p-8 space-y-4 max-w-7xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Clientes</CardTitle>
              <CardSubtitle>{count ?? 0} clientes cadastrados</CardSubtitle>
            </div>
          </div>
        </CardHeader>
        {!customers.length ? (
          <div className="p-10 text-center text-fg-2">
            <p className="mb-2">Ainda não há clientes sincronizados.</p>
            <p className="text-xs">
              Configure a integração com seu ERP em <strong>Integração ERP</strong> e rode uma sincronização.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs font-medium text-fg-2 bg-bg-3 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5">Nome</th>
                  <th className="text-left px-4 py-2.5">CPF/CNPJ</th>
                  <th className="text-left px-4 py-2.5">Contato</th>
                  <th className="text-left px-4 py-2.5">Cidade</th>
                  <th className="text-left px-4 py-2.5">Acesso</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{maskCpfCnpj(c.cpf_cnpj)}</td>
                    <td className="px-4 py-3 text-xs">
                      {c.email && <div>{c.email}</div>}
                      {c.phone && <div className="text-fg-2 font-mono">{maskPhone(c.phone)}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.address_city ? `${c.address_city}/${c.address_state}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {c.user_id ? (
                        <Badge tone="success">vinculado</Badge>
                      ) : (
                        <Badge tone="neutral">sem login</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
