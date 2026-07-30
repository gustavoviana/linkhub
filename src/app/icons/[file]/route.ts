import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { resolveTenantByHost } from '@/lib/tenant/resolve';
import { getTenantApp } from '@/lib/tenant/app-store-db';
import { backgroundColorOf, iconSource } from '@/lib/tenant/app-config';

// Ícones do provedor, no tamanho que quem pediu precisa.
//
// Fica fora do matcher do middleware (o caminho termina em .png): assim a
// resposta sai sem cookie de sessão. Parece detalhe, mas o gerador do app
// Android baixa este ícone com uma biblioteca que quebra em cookie de
// domínio público — e sem ícone não há build.
//
// A imagem de origem é a do painel: ícone do app > ícone do navegador > logo.
// Aqui ela vira PNG quadrado sobre a cor da marca, no tamanho pedido — vale
// para logo .webp, .svg ou deitada, que é o que os provedores mandam.

export const runtime = 'nodejs';

const SIZES: Record<string, { size: number; maskable: boolean }> = {
  'icon-192.png': { size: 192, maskable: false },
  'icon-512.png': { size: 512, maskable: false },
  'icon-1024.png': { size: 1024, maskable: false },
  'icon-maskable-512.png': { size: 512, maskable: true },
  'apple-touch-icon.png': { size: 180, maskable: false },
};

function backdrop(size: number, from: string, to: string) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
       </linearGradient></defs>
       <rect width="${size}" height="${size}" fill="url(#g)"/>
     </svg>`,
  );
}

/** Sem logo enviada: um sinal de conexão branco, desenhado em vetor. Nada de
 *  texto — a fonte pode não existir no servidor e sairia um quadrado vazio. */
function fallbackMark(size: number) {
  const c = size / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <g fill="none" stroke="#fff" stroke-linecap="round" stroke-width="${size * 0.075}">
         <path d="M${c - size * 0.3} ${c + size * 0.02}a${size * 0.42} ${size * 0.42} 0 0 1 ${size * 0.6} 0"/>
         <path d="M${c - size * 0.18} ${c + size * 0.14}a${size * 0.25} ${size * 0.25} 0 0 1 ${size * 0.36} 0"/>
       </g>
       <circle cx="${c}" cy="${c + size * 0.26}" r="${size * 0.055}" fill="#fff"/>
     </svg>`,
  );
}

export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const spec = SIZES[file];
  if (!spec) return new NextResponse('Not found', { status: 404 });

  const tenant = await resolveTenantByHost(new URL(req.url).searchParams.get('tenant'));
  if (!tenant) return new NextResponse('Not found', { status: 404 });

  const { app } = await getTenantApp(tenant);
  const source = iconSource(tenant, app);
  const { size, maskable } = spec;

  // Maskable: o Android recorta em círculo, então a marca fica dentro dos
  // 60% centrais. No ícone normal ela pode usar quase toda a área.
  const inner = Math.round(size * (maskable ? 0.58 : 0.78));

  let mark: Buffer | null = null;
  if (source) {
    try {
      const res = await fetch(source, { cache: 'no-store' });
      if (res.ok) {
        mark = await sharp(Buffer.from(await res.arrayBuffer()))
          .resize({ width: inner, height: inner, fit: 'inside', withoutEnlargement: false })
          .png()
          .toBuffer();
      }
    } catch {
      mark = null;
    }
  }
  if (!mark) {
    mark = await sharp(fallbackMark(inner)).png().toBuffer();
  }

  const png = await sharp(backdrop(size, tenant.primary_color, tenant.accent_color))
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      // Curto no CDN: trocar o ícone no painel tem que refletir rápido.
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
      'X-Tenant-Background': backgroundColorOf(tenant, app),
    },
  });
}
