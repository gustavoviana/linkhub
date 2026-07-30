import { NextResponse } from 'next/server';
import { resolveTenantByHost } from '@/lib/tenant/resolve';
import { getTenantApp } from '@/lib/tenant/app-store-db';
import { backgroundColorOf, defaultAppName, themeColorOf } from '@/lib/tenant/app-config';

// Manifesto do PWA, um por provedor, servido no domínio dele.
//
// É o que faz o Chrome oferecer "instalar" e é a base do app Android: o
// gerador do TWA lê este arquivo para saber nome, cores e ícones.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const tenant = await resolveTenantByHost();
  if (!tenant) return new NextResponse('Not found', { status: 404 });

  const { app } = await getTenantApp(tenant);

  const manifest = {
    id: '/',
    name: `${tenant.name} — Central do Cliente`,
    short_name: app?.app_name ?? defaultAppName(tenant),
    description: `Faturas, Pix, consumo e suporte da ${tenant.name}.`,
    lang: 'pt-BR',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: themeColorOf(tenant, app),
    background_color: backgroundColorOf(tenant, app),
    categories: ['utilities', 'business'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Faturas', short_name: 'Faturas', url: '/fatura' },
      { name: 'Suporte', short_name: 'Suporte', url: '/suporte' },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
    },
  });
}
