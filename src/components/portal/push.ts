'use client';

// Avisos no aparelho do assinante: ver a situação, ativar e desativar.
//
// O pedido de permissão sai sempre de um toque do assinante. O Chrome
// silencia (e passa a esconder) sites que pedem notificação ao abrir, e no
// app da Play a pergunta aparece com o nome do provedor — "Permitir que LM
// NET envie notificações?" — só depois desse toque.

export type EstadoDosAvisos = 'indisponivel' | 'negado' | 'inativo' | 'ativo';

const CHAVE_SINCRONIZADO = 'portal.avisos.sincronizado';

export function avisosSuportados(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** A chave pública VAPID vem em base64url; o navegador quer os bytes. */
function bytesDaChave(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const bruto = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

async function registro() {
  // O RegisterSW espera um pouco antes de registrar; quem toca no botão
  // antes disso não pode ficar esperando por nada.
  return (await navigator.serviceWorker.getRegistration('/')) ?? navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

async function avisarServidor(inscricao: PushSubscription) {
  const r = await fetch('/api/portal/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inscricao.toJSON()),
  });
  if (!r.ok) throw new Error('servidor recusou');
}

/**
 * Situação dos avisos neste aparelho. Aparelho já inscrito é reapresentado
 * ao servidor uma vez por visita: quem saiu da conta e entrou de novo foi
 * tirado da lista no logout, e volta aqui sem precisar tocar em nada.
 */
export async function estadoDosAvisos(): Promise<EstadoDosAvisos> {
  if (!avisosSuportados()) return 'indisponivel';
  if (Notification.permission === 'denied') return 'negado';
  const reg = await navigator.serviceWorker.getRegistration('/');
  const inscricao = await reg?.pushManager.getSubscription();
  if (!inscricao || Notification.permission !== 'granted') return 'inativo';

  try {
    if (!sessionStorage.getItem(CHAVE_SINCRONIZADO)) {
      await avisarServidor(inscricao);
      sessionStorage.setItem(CHAVE_SINCRONIZADO, '1');
    }
  } catch {
    /* sem rede ou sem sessionStorage: tenta na próxima visita */
  }
  return 'ativo';
}

export async function ativarAvisos(chavePublica: string): Promise<EstadoDosAvisos> {
  if (!avisosSuportados()) return 'indisponivel';
  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') return permissao === 'denied' ? 'negado' : 'inativo';

  const reg = await registro();
  await navigator.serviceWorker.ready;
  const inscricao =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytesDaChave(chavePublica) }));
  await avisarServidor(inscricao);
  return 'ativo';
}

export async function desativarAvisos(): Promise<EstadoDosAvisos> {
  const reg = await navigator.serviceWorker.getRegistration('/');
  const inscricao = await reg?.pushManager.getSubscription();
  if (inscricao) {
    await fetch('/api/portal/push', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: inscricao.endpoint }),
    }).catch(() => null);
    await inscricao.unsubscribe().catch(() => false);
  }
  return 'inativo';
}
