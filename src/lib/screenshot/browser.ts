import 'server-only';
import { existsSync } from 'node:fs';
import puppeteer, { type Browser } from 'puppeteer-core';

// Chrome sem janela, nos três lugares onde este código roda.
//
// 1. BROWSER_WS_ENDPOINT — um serviço de navegador (Browserless e afins).
//    É a saída quando a função da Vercel não dá conta: nada pra instalar.
// 2. Serverless (Vercel/Lambda) — o Chromium empacotado do @sparticuz.
// 3. Máquina de dev — o Chrome que você já tem instalado.

const LOCAL_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

function localChrome(): string | null {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  return LOCAL_CANDIDATES.find((p) => existsSync(p)) ?? null;
}

export async function launchBrowser(): Promise<Browser> {
  const endpoint = process.env.BROWSER_WS_ENDPOINT;
  if (endpoint) return puppeteer.connect({ browserWSEndpoint: endpoint });

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // O @sparticuz/chromium só descompacta as bibliotecas do Chrome (libnss3
    // e companhia) quando reconhece um ambiente Lambda por AWS_EXECUTION_ENV
    // ou AWS_LAMBDA_JS_RUNTIME. A Vercel roda em Lambda mas não define
    // nenhuma das duas — sem esta dica o binário é extraído sozinho, sem as
    // bibliotecas, e o navegador morre com "libnss3.so: cannot open shared
    // object file". Precisa vir antes do import: a detecção roda na carga
    // do módulo.
    process.env.AWS_LAMBDA_JS_RUNTIME ??= 'nodejs20.x';
    const chromium = (await import('@sparticuz/chromium')).default;
    // Uma fonte extra (emoji, por exemplo) quando o provedor quiser: o
    // Chromium de serverless vem sem nenhuma instalada.
    const font = process.env.STORE_SHOT_FONT_URL;
    if (font) await chromium.font(font).catch(() => undefined);
    return puppeteer.launch({
      args: [...chromium.args, '--hide-scrollbars', '--font-render-hinting=none'],
      executablePath: await chromium.executablePath(),
      headless: true,
      defaultViewport: null,
    });
  }

  const executablePath = localChrome();
  if (!executablePath) {
    throw new Error(
      'Nenhum Chrome encontrado nesta máquina. Aponte CHROME_PATH para o executável ou use BROWSER_WS_ENDPOINT.',
    );
  }

  return puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--hide-scrollbars', '--font-render-hinting=none'],
    defaultViewport: null,
  });
}
