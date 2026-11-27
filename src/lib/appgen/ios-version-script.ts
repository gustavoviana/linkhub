// Script que vai dentro do zip do iOS (versao-ios.cjs).
//
// O projeto do Xcode só nasce no Mac, com `npx cap add ios`. O Info.plist que
// o Capacitor gera lê a versão de MARKETING_VERSION e CURRENT_PROJECT_VERSION
// no project.pbxproj, então é ali que gravamos, a partir de versao-ios.json.
// Sem dependência nenhuma: roda com o Node que o Capacitor já exige.

export const IOS_VERSION_SCRIPT = `#!/usr/bin/env node
// Grava a versão reservada pelo LinkHub no projeto do Xcode.
//   MARKETING_VERSION       -> CFBundleShortVersionString
//   CURRENT_PROJECT_VERSION -> CFBundleVersion
const fs = require('node:fs');
const path = require('node:path');

const dir = process.argv[2] || __dirname;
const { versionName, buildNumber } = JSON.parse(fs.readFileSync(path.join(dir, 'versao-ios.json'), 'utf8'));
if (!/^\\d{1,4}\\.\\d{1,4}\\.\\d{1,4}$/.test(versionName) || !Number.isInteger(buildNumber) || buildNumber < 1) {
  console.error('versao-ios.json inválido.');
  process.exit(1);
}

const pbx = path.join(dir, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
if (!fs.existsSync(pbx)) {
  console.error('Projeto do Xcode não encontrado. Rode antes: npx cap add ios');
  process.exit(1);
}

const before = fs.readFileSync(pbx, 'utf8');
const after = before
  .replace(/MARKETING_VERSION = [^;]+;/g, 'MARKETING_VERSION = ' + versionName + ';')
  .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, 'CURRENT_PROJECT_VERSION = ' + buildNumber + ';');

if (!/MARKETING_VERSION = /.test(after) || !/CURRENT_PROJECT_VERSION = /.test(after)) {
  console.error('O projeto do Xcode não tem MARKETING_VERSION / CURRENT_PROJECT_VERSION.');
  process.exit(1);
}
fs.writeFileSync(pbx, after);
console.log('Versão do iOS: ' + versionName + ' (build ' + buildNumber + ')');
`;
