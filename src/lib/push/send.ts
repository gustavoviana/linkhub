import 'server-only';
import webpush from 'web-push';
import type { createAdminClient } from '@/lib/supabase/admin';

// Entrega das notificações pelo Web Push padrão.
//
// Um par de chaves VAPID para a plataforma inteira: a chave identifica o
// servidor que envia, não o site, e cada aparelho já fica preso à origem do
// provedor em que se inscreveu. Gerar as chaves:
//
//   npx web-push generate-vapid-keys
//
// Sem as chaves o resto do app segue igual — o convite some da central e o
// painel avisa que o envio não está configurado.

type Admin = ReturnType<typeof createAdminClient>;

export interface Aparelho {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** O que o service worker recebe. Curto: o limite do push é ~4KB. */
export interface Mensagem {
  title: string;
  body: string;
  url: string;
  /** Id da entrega, para contar o toque. */
  d?: string;
}

let configurado: boolean | null = null;

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function pushConfigurado(): boolean {
  if (configurado !== null) return configurado;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configurado = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:suporte@linkhub.api.br', pub, priv);
  return (configurado = true);
}

export type Resultado = 'sent' | 'failed' | 'gone';

/**
 * Envia para um aparelho. 404 e 410 são o serviço de push dizendo que a
 * inscrição morreu (app desinstalado, permissão revogada): o aparelho sai da
 * lista na hora, senão cada rodada tentaria de novo para sempre.
 */
export async function enviar(
  admin: Admin,
  aparelho: Aparelho,
  mensagem: Mensagem,
): Promise<{ resultado: Resultado; erro?: string }> {
  if (!pushConfigurado()) return { resultado: 'failed', erro: 'VAPID não configurado' };
  try {
    await webpush.sendNotification(
      { endpoint: aparelho.endpoint, keys: { p256dh: aparelho.p256dh, auth: aparelho.auth } },
      JSON.stringify(mensagem),
      // 12h: aviso de "vence hoje" que chega amanhã é pior que aviso nenhum.
      { TTL: 12 * 3600, urgency: 'normal', timeout: 10_000 },
    );
    await admin
      .from('push_subscriptions')
      .update({ last_sent_at: new Date().toISOString() } as never)
      .eq('id', aparelho.id);
    return { resultado: 'sent' };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await admin.from('push_subscriptions').delete().eq('id', aparelho.id);
      return { resultado: 'gone', erro: `inscrição expirada (${status})` };
    }
    const erro = e instanceof Error ? e.message : String(e);
    return { resultado: 'failed', erro: `${status ?? ''} ${erro}`.trim().slice(0, 300) };
  }
}

/** Roda `fn` sobre a lista com no máximo `limite` ao mesmo tempo. */
export async function emParalelo<T>(itens: T[], limite: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  const trabalhadores = Array.from({ length: Math.min(limite, itens.length) }, async () => {
    while (i < itens.length) await fn(itens[i++]);
  });
  await Promise.all(trabalhadores);
}
