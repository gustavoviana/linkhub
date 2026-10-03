import { NextResponse } from 'next/server';

// Service worker mínimo — e mínimo de propósito.
//
// Ele existe por três motivos: sem um `fetch` registrado o Chrome não
// considera a central instalável (e sem isso não há PWA nem app Android),
// uma tela de "sem conexão" decente é melhor que o dinossauro, e é ele quem
// recebe e mostra os avisos push do provedor.
//
// Não guardamos página nenhuma em cache: a central é renderizada no servidor
// e é autenticada. Cachear fatura de assinante no aparelho seria mostrar
// dado velho — ou o dado de outra pessoa, num celular compartilhado.

export const runtime = 'nodejs';

const SW = `
const OFFLINE = \`<!doctype html>
<html lang="pt-BR"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sem conexão</title>
<style>
  body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
       font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#0f1017;color:#fff}
  div{text-align:center;padding:32px;max-width:320px}
  h1{font-size:19px;margin:0 0 8px}
  p{font-size:14px;line-height:1.5;opacity:.7;margin:0}
</style>
<div><h1>Sem conexão</h1><p>Assim que a internet voltar, sua central abre normalmente.</p></div>
</html>\`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    ),
  );
});

// Avisos do provedor. O texto já vem pronto do servidor; aqui só se desenha.
// Dentro do app da Play, o Chrome entrega a notificação ao app, que aparece
// com o nome e o ícone do provedor em vez de "Chrome".
self.addEventListener('push', (event) => {
  let m = {};
  try { m = event.data ? event.data.json() : {}; } catch (e) {}
  if (!m.title) return;
  event.waitUntil(
    self.registration.showNotification(m.title, {
      body: m.body || '',
      icon: '/icons/icon-192.png',
      // Um aviso por tela de destino: o lembrete novo da mesma fatura
      // substitui o antigo em vez de empilhar.
      tag: m.url || 'linkhub',
      renotify: true,
      data: { url: m.url || '/', d: m.d || null },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const destino = new URL(data.url || '/', self.location.origin).href;

  event.waitUntil((async () => {
    if (data.d) {
      fetch('/api/push/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ d: data.d }),
        keepalive: true,
      }).catch(() => {});
    }
    // App já aberto: traz para a frente na tela certa, sem abrir outra cópia.
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const janela of janelas) {
      if (new URL(janela.url).origin !== self.location.origin) continue;
      await janela.focus();
      if ('navigate' in janela) return janela.navigate(destino);
      return;
    }
    return self.clients.openWindow(destino);
  })());
});
`;

export function GET() {
  return new NextResponse(SW, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
