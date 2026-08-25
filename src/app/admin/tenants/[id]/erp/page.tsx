import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { requireTenantAdmin } from '@/lib/auth/session';
import { maskErpConfig } from '@/lib/erp/crypto';
import { parseIpsDeSaida } from '@/lib/erp/liberacao-de-ip';
import { explicarErroDoErp } from '@/lib/erp/erros';
import ErpForm from './erp-form';

export default async function ErpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTenantAdmin(id);
  const supabase = createAdminClient();
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) return null;

  // O formulário nunca recebe as credenciais — só as URLs/usuários e a
  // informação de quais segredos já estão salvos.
  const masked = maskErpConfig(tenant.erp_config);

  // De onde as chamadas ao ERP saem. Vem de configuração porque depende de
  // infraestrutura: sem IP fixo contratado não existe endereço estável para
  // o ERP liberar, e o painel não pode inventar um.
  const ipsDeSaida = parseIpsDeSaida(process.env.ERP_OUTBOUND_IP);

  // A última sincronização é o que o painel sabe sem falar com o ERP agora.
  // Guardamos o erro cru (vem do cron e da carga de planos); quem lê é o dono
  // do provedor, então ele chega à tela já traduzido em o que fazer.
  const ultimaSync = {
    em: tenant.erp_last_sync_at,
    status: tenant.erp_last_sync_status,
    erro: tenant.erp_last_sync_error
      ? explicarErroDoErp(tenant.erp_type, tenant.erp_last_sync_error)
      : null,
  };

  return (
    <ErpForm
      tenant={{ ...tenant, erp_config: {} }}
      masked={masked}
      ipsDeSaida={ipsDeSaida}
      ultimaSync={ultimaSync}
    />
  );
}
