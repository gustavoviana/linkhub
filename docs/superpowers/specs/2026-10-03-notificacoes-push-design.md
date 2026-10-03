# Notificações push da central

**Data:** 03/10/2026 · **Status:** implementado

## Objetivo

O provedor avisa o assinante pelo celular (app Android da Play e navegador) sobre a fatura — antes, no dia e depois do vencimento — e manda recados avulsos. O assinante toca no aviso e cai direto na fatura, com Pix e boleto. Sucesso = assinante paga em dia sem o provedor cobrar à mão.

## Decisões

| Pergunta | Decisão |
|---|---|
| Plataformas | Android (TWA) + navegador. iPhone fica para depois (exige APNs nativo no projeto Capacitor). |
| Tecnologia | Web Push padrão com VAPID próprio (lib `web-push`). Sem OneSignal/FCM: sem custo, sem dado de assinante com terceiro. |
| Agendador | `pg_cron` + `pg_net` no Supabase chamando `/api/cron/push` a cada 15 min. A Vercel Cron no plano gratuito só roda 1×/dia. |
| Regras | Lista livre (até 10): momento (X dias antes / no dia / X dias depois), hora cheia 8h–20h de Brasília, título ≤ 50, texto ≤ 150, campos `{nome}` `{valor}` `{vencimento}`. Três regras de fábrica, desligadas. |
| Envio manual | Agora ou agendado, para todos os aparelhos do provedor; destino Início, Faturas ou Suporte; aceita `{nome}`; cancelável enquanto agendado. |
| Permissões | Dono/admin editam e enviam; suporte/leitura veem só o histórico; super admin entra por `resolveTenantAccess`. |

## Como funciona

**Assinante.** Convite flutuante na tela inicial ("Receba um aviso antes da sua fatura vencer"), que cede a vez ao convite de instalar no navegador do celular. "Agora não" dispensa por 30 dias; permissão negada encerra o convite. Liga/desliga em Conta. Inscrição em `POST /api/portal/push` (assinante vem da sessão); o id fica no cookie `push_sub`, e o `/auth/logout` apaga a inscrição — celular compartilhado não recebe fatura de outro.

**Service worker** (`/sw.js`). `push` mostra a notificação com o ícone do provedor e `tag` por destino (lembrete novo substitui o antigo). `notificationclick` registra o toque (`POST /api/push/click`) e foca a janela aberta ou abre uma nova na tela certa.

**Rodada** (`lib/push/dispatch.ts`, a cada 15 min):
1. Mensagens manuais com `scheduled_at` vencido: quem troca `scheduled → sending` envia (duas rodadas não duplicam). Presas em `sending` há mais de 10 min voltam para a fila.
2. Regras ligadas com `send_hour ≤ hora atual` (até 21h): vencimento-alvo = hoje − `days_offset`. Faturas `open/overdue/partial` desse vencimento → contratos → aparelhos. Faturas já avisadas hoje pela regra ficam de fora. Para quem tem aparelho, a fatura é conferida no ERP (`sincronizarFaturas`, se o dado tiver mais de 5 min). Aviso **depois** do vencimento só sai com status conferido nas últimas 26h.
3. Cada aviso vira linha em `push_deliveries` com `dedupe_key` única (`r:regra:fatura:aparelho` / `c:envio:aparelho`) — é a garantia de um aviso por fatura por regra. Pendentes de rodada interrompida saem na próxima. Fatura paga entre a regra e o envio: a linha é apagada, não conta como falha.
4. Resposta 404/410 do serviço de push apaga o aparelho.

**Painel** (`/admin/tenants/[id]/notificacoes`). Resumo de aparelhos ativos; abas Avisos de fatura (regras com prévia e "Enviar teste" por CPF), Enviar mensagem (com confirmação "vai para N aparelhos" e lista de agendadas) e Histórico (receberam, tocaram, falhas — da view `push_campaign_stats`).

## Dados

Migração `20261003_012_push.sql`: `push_subscriptions`, `push_rules`, `push_campaigns` (uma por mensagem manual; uma por regra por dia — `unique(rule_id, run_date)`), `push_deliveries`, view `push_campaign_stats`, e o job `linkhub-push` do `pg_cron`, que lê o segredo do Vault (`linkhub_cron_secret`). Nenhuma tabela tem policy: só service role.

## Configuração

Vercel: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`. Supabase: o mesmo `CRON_SECRET` no Vault antes de rodar a migração. Sem VAPID, o convite some da central e o painel avisa que o envio não está configurado.

## Fora do escopo

iPhone; filtros de público (plano, cidade); envio por WhatsApp/SMS; estatística além de toques.
