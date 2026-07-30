// Monta o projeto Android (Trusted Web Activity) a partir da ficha que o
// painel devolveu.
//
// Uso: node twa-project.mjs config.json diretorio-de-saida
//
// Escrevemos o twa-manifest.json à mão e chamamos o gerador do Bubblewrap
// direto pela API — a CLI dele faz perguntas, e ninguém responde prompt
// dentro de um runner. O que sai é o projeto Gradle completo, com wrapper.

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// O Bubblewrap é instalado numa pasta à parte no runner, para não misturar
// com as dependências do painel. TWA_MODULES_DIR diz onde ele está.
const resolveFrom = process.env.TWA_MODULES_DIR
  ? path.join(path.resolve(process.env.TWA_MODULES_DIR), 'resolver.js')
  : fileURLToPath(import.meta.url);
const require = createRequire(resolveFrom);
const { TwaGenerator, TwaManifest, ConsoleLog } = require('@bubblewrap/core');

const [, , configPath, outDir = 'projeto'] = process.argv;
const config = JSON.parse(readFileSync(configPath, 'utf8'));

const out = path.resolve(outDir);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const manifest = {
  packageId: config.package_id,
  host: config.host,
  name: config.app_name,
  launcherName: config.app_name.slice(0, 20),
  display: 'standalone',
  themeColor: config.theme_color,
  themeColorDark: '#000000',
  navigationColor: '#000000',
  navigationColorDark: '#000000',
  navigationDividerColor: '#00000000',
  navigationDividerColorDark: '#00000000',
  backgroundColor: config.background_color,
  enableNotifications: true,
  startUrl: '/',
  iconUrl: config.icon_url,
  maskableIconUrl: config.maskable_icon_url,
  splashScreenFadeOutDuration: 300,
  signingKey: { path: './android.keystore', alias: config.keystore_alias },
  // O Bubblewrap lê a versão da chave `appVersion`; `appVersionName` sozinha
  // sai vazia no build.gradle.
  appVersion: config.version_name,
  appVersionName: config.version_name,
  appVersionCode: config.version_code,
  shortcuts: [],
  generatorApp: 'linkhub',
  webManifestUrl: config.manifest_url,
  fallbackType: 'customtabs',
  features: {},
  enableSiteSettingsShortcut: true,
  isChromeOSOnly: false,
  isMetaQuest: false,
  fullScopeUrl: `${config.origin}/`,
  minSdkVersion: 23,
  orientation: 'default',
  fingerprints: [],
  additionalTrustedOrigins: [],
  retainedBundles: [],
};

const manifestPath = path.join(out, 'twa-manifest.json');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

const twaManifest = await TwaManifest.fromFile(manifestPath);
const problem = twaManifest.validate();
if (problem) {
  console.error('twa-manifest inválido:', problem);
  process.exit(1);
}

await new TwaGenerator().createTwaProject(out, twaManifest, new ConsoleLog('twa'));
console.log(`Projeto pronto em ${out} — ${manifest.packageId} ${manifest.appVersion}`);
