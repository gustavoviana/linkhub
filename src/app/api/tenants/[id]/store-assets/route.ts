import { NextResponse, type NextRequest } from 'next/server';
import type { Browser } from 'puppeteer-core';
import { requireTenantAdmin } from '@/lib/auth/session';
import { launchBrowser } from '@/lib/screenshot/browser';
import { createStoreShotToken } from '@/lib/tenant/store-token';
import { PREVIEW_SCREENS, SCREEN_ANCHOR, STORE_SCREEN_ORDER } from '@/lib/tenant/preview-screens';
import { STORE_ASSETS, findFormat } from '@/lib/tenant/store-formats';

// Gera as imagens da ficha da loja para UM provedor.
//
// Uma chamada por formato, de propósito: cada uma sobe o navegador, tira as
// cinco ou seis telas e volta. Assim nenhuma requisição chega perto do teto
// de tempo da função, e o painel consegue mostrar o progresso. Quem junta
// tudo num ZIP é o navegador do provedor, no fim.

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ShotFile {
  path: string;
  base64: string;
}

function baseUrlFrom(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTenantAdmin(id);

  const body = (await req.json().catch(() => ({}))) as { target?: string };
  const target = body.target ?? '';
  const format = findFormat(target);
  if (!format && target !== 'marca') {
    return NextResponse.json({ error: 'Formato desconhecido.' }, { status: 400 });
  }

  const base = baseUrlFrom(req);
  const token = createStoreShotToken(id);
  const files: ShotFile[] = [];

  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    // O navegador da captura não precisa de imagem de terceiros nem de som;
    // um user agent de celular evita que algum CDN devolva versão desktop.
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    );

    const shoot = async (
      url: string,
      width: number,
      height: number,
      scale: number,
      anchor?: string,
    ) => {
      await page.setViewport({ width, height, deviceScaleFactor: scale, isMobile: true });
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 });
      // Fonte carregada antes do clique: sem isto sai o fallback do sistema.
      await page.evaluate(() => document.fonts.ready);
      // A tela de consumo é a home rolada até o gráfico. O componente também
      // rola sozinho, mas ele depende da hidratação — aqui é garantido.
      if (anchor) {
        await page.evaluate((selector) => {
          document.querySelector(selector)?.scrollIntoView({ block: 'center' });
        }, anchor);
      }
      return (await page.screenshot({ type: 'png', encoding: 'base64' })) as unknown as string;
    };

    if (format) {
      for (const screen of STORE_SCREEN_ORDER) {
        const meta = PREVIEW_SCREENS.find((s) => s.id === screen);
        if (!meta) continue;
        const url = `${base}/store-shot/${id}?token=${token}&format=${format.id}&screen=${screen}`;
        const base64 = await shoot(
          url,
          format.width,
          format.height,
          format.scale,
          SCREEN_ANCHOR[screen],
        );
        files.push({ path: `${format.folder}/${meta.file}.png`, base64 });
      }
    } else {
      for (const asset of STORE_ASSETS) {
        const url = `${base}/store-shot/${id}?token=${token}&asset=${asset.id}`;
        const base64 = await shoot(url, asset.width, asset.height, asset.scale);
        files.push({ path: asset.path, base64 });
      }
    }

    return NextResponse.json({ files });
  } catch (e) {
    console.error('[store-assets] falhou', e);
    const message = e instanceof Error ? e.message : 'Falha ao gerar as imagens.';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
