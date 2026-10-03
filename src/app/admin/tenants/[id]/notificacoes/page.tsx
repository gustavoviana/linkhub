import { requireTenantAdmin, RANK } from '@/lib/auth/tenant-access';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminScreen } from '@/components/admin/page-header';
import { pushConfigurado } from '@/lib/push/send';
import { REGRAS_DE_FABRICA } from '@/lib/push/text';
import { NotificationsScreen, type Envio, type Regra } from './notifications-screen';

export const dynamic = 'force-dynamic';

export default async function NotificacoesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Suporte e leitura entram para ver o histórico; editar e enviar é de admin.
  const acesso = await requireTenantAdmin(id, 'viewer');
  const podeEditar = RANK[acesso.role] >= RANK.admin;

  const supabase = createAdminClient();

  let { data: regras } = await supabase
    .from('push_rules')
    .select('id, days_offset, send_hour, title, body, enabled')
    .eq('tenant_id', id)
    .order('days_offset');

  // Primeira visita: as três regras de fábrica, desligadas, para o provedor
  // só revisar o texto e ligar. Quem apagar todas ganha as três de novo —
  // desligadas, então nada sai sem ele querer.
  if (!regras?.length && podeEditar) {
    await supabase
      .from('push_rules')
      .insert(REGRAS_DE_FABRICA.map((r) => ({ ...r, tenant_id: id })) as never);
    ({ data: regras } = await supabase
      .from('push_rules')
      .select('id, days_offset, send_hour, title, body, enabled')
      .eq('tenant_id', id)
      .order('days_offset'));
  }

  const [{ count: aparelhos }, { data: envios }] = await Promise.all([
    supabase.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    supabase
      .from('push_campaigns')
      .select('id, kind, title, body, url, status, scheduled_at, sent_at, run_date, rule_id')
      .eq('tenant_id', id)
      .order('scheduled_at', { ascending: false })
      .limit(60),
  ]);

  const ids = ((envios ?? []) as { id: string }[]).map((e) => e.id);
  const { data: numeros } = ids.length
    ? await supabase.from('push_campaign_stats').select('campaign_id, sent, failed, clicked').in('campaign_id', ids)
    : { data: [] };
  const porEnvio = new Map(
    ((numeros ?? []) as { campaign_id: string; sent: number; failed: number; clicked: number }[]).map((n) => [
      n.campaign_id,
      n,
    ]),
  );

  const lista: Envio[] = ((envios ?? []) as Omit<Envio, 'enviados' | 'falhas' | 'toques'>[]).map((e) => ({
    ...e,
    enviados: Number(porEnvio.get(e.id)?.sent ?? 0),
    falhas: Number(porEnvio.get(e.id)?.failed ?? 0),
    toques: Number(porEnvio.get(e.id)?.clicked ?? 0),
  }));

  return (
    <AdminScreen
      eyebrow="Operação"
      title="Notificações"
      description="Avisos de fatura automáticos e mensagens para os assinantes que ativaram as notificações no celular ou no navegador."
      largura="max-w-6xl"
    >
      <NotificationsScreen
        tenantId={id}
        configurado={pushConfigurado()}
        podeEditar={podeEditar}
        aparelhos={aparelhos ?? 0}
        regras={(regras ?? []) as Regra[]}
        envios={lista}
      />
    </AdminScreen>
  );
}
