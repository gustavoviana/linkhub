'use client';

// Avisos no aparelho do assinante: ver a situação, ativar e desativar.
//
// O pedido de permissão sai sempre de um toque do assinante. O Chrome
// silencia (e passa a esconder) sites que pedem notificação ao abrir, e no
// app da Play a pergunta aparece com o nome do provedor — "Permitir que LM
// NET envie notificações?" — só depois desse toque.

export type EstadoDosAvisos = 'indisponivel' | 'negado' | 'inativo' | 'ativo';

const CHAVE_SINCRONIZADO = 'portal.avisos.sincronizado';

/** Erro com o texto que o assinante vai ler. */
export class FalhaAoAtivar extends Error {}

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
  }).catch(() => null);
  if (!r) throw new FalhaAoAtivar('Sem conexão. Confira a internet e tente de novo.');
  if (r.status === 401) throw new FalhaAoAtivar('Sua sessão expirou. Entre de novo e ative os avisos.');
  if (!r.ok) throw new FalhaAoAtivar('Não deu para salvar agora. Tente de novo em instantes.');
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

/** Nenhuma etapa do navegador pode deixar o botão em "Ativando…" para sempre. */
function comPrazo<T>(promessa: Promise<T>, ms: number, mensagem: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new FalhaAoAtivar(mensagem)), ms);
    promessa.then(
      (v) => {
        window.clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Pede a permissão e inscreve o aparelho.
 *
 * A pergunta de permissão fica sem prazo: o assinante pode estar lendo, e
 * no Chrome do computador ela muitas vezes vira só um sino riscado na barra
 * de endereço — quem chama mostra essa dica enquanto espera. As etapas
 * seguintes não dependem de ninguém, e por isso têm prazo.
 */
export async function ativarAvisos(chavePublica: string): Promise<EstadoDosAvisos> {
  if (!avisosSuportados()) return 'indisponivel';
  const permissao =
    Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permissao !== 'granted') return permissao === 'denied' ? 'negado' : 'inativo';

  const reg = await comPrazo(registro(), 10_000, 'O navegador não preparou os avisos. Recarregue a página e tente de novo.');
  await comPrazo(navigator.serviceWorker.ready, 10_000, 'O navegador não preparou os avisos. Recarregue a página e tente de novo.');

  let inscricao: PushSubscription;
  try {
    inscricao = await comPrazo(
      (async () =>
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytesDaChave(chavePublica) })))(),
      20_000,
      'O serviço de avisos do navegador não respondeu. Tente de novo em instantes.',
    );
  } catch (e) {
    if (e instanceof FalhaAoAtivar) throw e;
    // Navegadores sem o serviço de push do Google (Brave com ele desligado,
    // alguns Chromium) recusam aqui com AbortError.
    throw new FalhaAoAtivar('Este navegador não aceita avisos. Use o Chrome ou o app da loja.');
  }

  await comPrazo(avisarServidor(inscricao), 15_000, 'Sem resposta do servidor. Confira a internet e tente de novo.');
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

/** O que mostrar enquanto a pergunta de permissão não é respondida. */
export const DICA_PERMISSAO =
  'Responda à pergunta do navegador para continuar. No computador, ela pode estar no ícone de sino da barra de endereço.';

/** Depois de quanto tempo sem resposta a dica aparece. */
export const ESPERA_DA_DICA_MS = 3000;

export function mensagemDeErro(e: unknown): string {
  return e instanceof FalhaAoAtivar ? e.message : 'Não deu para ativar agora. Tente de novo em instantes.';
}
