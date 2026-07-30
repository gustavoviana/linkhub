import { NextResponse } from 'next/server';

// Service worker mínimo — e mínimo de propósito.
//
// Ele existe por dois motivos: sem um `fetch` registrado o Chrome não
// considera a central instalável (e sem isso não há PWA nem app Android),
// e uma tela de "sem conexão" decente é melhor que o dinossauro.
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
