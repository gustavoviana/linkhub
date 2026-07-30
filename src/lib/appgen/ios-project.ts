import 'server-only';
import JSZip from 'jszip';
import type { Tenant } from '@/lib/supabase/types';
import type { TenantApp } from '@/lib/tenant/app-config';
import { backgroundColorOf, tenantOrigin, themeColorOf } from '@/lib/tenant/app-config';

// Projeto Capacitor do provedor, pronto para abrir no Xcode.
//
// Por que zip e não build: `.ipa` só se assina em macOS, e o Xcode é quem
// monta o projeto nativo. Então entregamos tudo o que é específico do
// provedor — identificador, nome, cores, ícone, endereço da central — e o
// `npx cap add ios` no Mac gera o projeto do Xcode a partir disso. É o mesmo
// caminho que qualquer app Capacitor segue; nada aqui é gambiarra.
//
// O app é uma casca WKWebView apontando para a central. Sozinho, isso é
// reprovado pela diretriz 4.2 da Apple — o LEIA-ME explica o que precisa ser
// nativo antes de submeter.

const CAPACITOR_VERSION = '^7.0.0';

interface IosProject {
  filename: string;
  zip: Buffer;
}

export async function buildIosProject(tenant: Tenant, app: TenantApp): Promise<IosProject> {
  const origin = tenantOrigin(tenant);
  const theme = themeColorOf(tenant, app);
  const background = backgroundColorOf(tenant, app);
  const zip = new JSZip();

  zip.file(
    'package.json',
    `${JSON.stringify(
      {
        name: app.package_id.split('.').pop() ?? 'central',
        version: app.version_name,
        private: true,
        scripts: {
          'ios:add': 'cap add ios',
          'ios:sync': 'cap sync ios',
          'ios:open': 'cap open ios',
          'ios:assets': 'capacitor-assets generate --ios',
        },
        dependencies: {
          '@capacitor/app': CAPACITOR_VERSION,
          '@capacitor/browser': CAPACITOR_VERSION,
          '@capacitor/core': CAPACITOR_VERSION,
          '@capacitor/ios': CAPACITOR_VERSION,
          '@capacitor/splash-screen': CAPACITOR_VERSION,
          '@capacitor/status-bar': CAPACITOR_VERSION,
        },
        devDependencies: {
          '@capacitor/assets': '^3.0.5',
          '@capacitor/cli': CAPACITOR_VERSION,
        },
      },
      null,
      2,
    )}\n`,
  );

  zip.file(
    'capacitor.config.json',
    `${JSON.stringify(
      {
        appId: app.package_id,
        appName: app.app_name,
        webDir: 'www',
        // A central é servida ao vivo: atualizar o site atualiza o app, sem
        // passar por revisão. `cleartext` fica falso — só HTTPS.
        server: { url: origin, cleartext: false, androidScheme: 'https', iosScheme: 'https' },
        backgroundColor: background,
        ios: { contentInset: 'always', limitsNavigationsToAppBoundDomains: false },
        plugins: {
          SplashScreen: {
            launchShowDuration: 1200,
            backgroundColor: background,
            showSpinner: false,
            splashImmersive: false,
          },
          StatusBar: { style: 'DEFAULT', backgroundColor: theme },
        },
      },
      null,
      2,
    )}\n`,
  );

  // O Capacitor exige um webDir mesmo carregando de um servidor remoto. Esta
  // página só aparece se o aparelho estiver sem internet no primeiro acesso.
  zip.file(
    'www/index.html',
    `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${escapeHtml(app.app_name)}</title>
<style>
  body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
       font-family:-apple-system,system-ui,sans-serif;background:${background};color:${theme}}
  div{text-align:center;padding:32px;max-width:320px}
  h1{font-size:19px;margin:0 0 8px}
  p{font-size:14px;line-height:1.5;opacity:.7;margin:0}
</style>
</head>
<body>
  <div>
    <h1>${escapeHtml(app.app_name)}</h1>
    <p>Conectando com a central. Se a tela não mudar, verifique sua internet.</p>
  </div>
</body>
</html>
`,
  );

  const [icon, splash] = await Promise.all([
    fetchBinary(`${origin}/icons/icon-1024.png`),
    fetchBinary(`${origin}/icons/icon-1024.png`),
  ]);
  if (icon) zip.file('resources/icon.png', icon);
  if (splash) zip.file('resources/splash.png', splash);

  zip.file('.gitignore', 'node_modules/\nios/App/Pods/\nios/App/App/public/\n');
  zip.file('LEIA-ME.md', readme(tenant, app, origin));

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return { filename: `${app.package_id}-ios.zip`, zip: buffer };
}

async function fetchBinary(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function readme(tenant: Tenant, app: TenantApp, origin: string) {
  return `# ${app.app_name} — aplicativo iOS

Projeto Capacitor do provedor **${tenant.name}**, gerado pelo painel LinkHub.
O app abre ${origin} numa WKWebView em tela cheia.

## No MacBook

Precisa de Xcode 16 ou mais novo, Node 20+ e CocoaPods.

    npm install
    npx cap add ios            # gera o projeto do Xcode
    npx capacitor-assets generate --ios   # ícones e splash a partir de resources/
    npx cap sync ios
    npx cap open ios

No Xcode: selecione o time de desenvolvimento em *Signing & Capabilities*,
troque o destino para *Any iOS Device*, e então *Product → Archive →
Distribute App → App Store Connect*.

Identificador do pacote: \`${app.package_id}\`
Versão: \`${app.version_name}\` (build ${app.version_code})

## Antes de submeter — leia isto

A Apple **reprova** app que é só um site embrulhado (diretriz 4.2, Minimum
Functionality). Este projeto sozinho é exatamente isso. O que faz passar:

1. **Notificação push** de fatura vencendo. É o recurso mais forte na
   resposta ao revisor, e o que os assinantes mais usam.
   \`npm i @capacitor/push-notifications\` + APNs no Apple Developer.
2. **Face ID / Touch ID** para entrar sem digitar CPF.
   \`npm i @aparajita/capacitor-biometric-auth\`
3. **Cache offline** da última fatura e do código Pix.
4. **Deep links** — a central já serve /.well-known/apple-app-site-association
   quando essa etapa for ligada no painel.

Sem push, a chance de reprovação é alta.

## Quem publica

A diretriz 4.2.6 recusa apps de gerador enviados pela conta do fornecedor.
O caminho limpo é publicar **na conta de desenvolvedor do próprio provedor**
(US$ 99/ano), com você adicionado como desenvolvedor autorizado.

## Atualizações

Mudou a central? Nada a fazer: o app carrega o site ao vivo. Só é preciso
gerar versão nova quando mudar ícone, nome ou algo do projeto nativo.
`;
}
