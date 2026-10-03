#!/usr/bin/env node
// Grava o token da Cloudflare no .env.local, sem abrir o arquivo.
//
//   node scripts/configurar-cloudflare.mjs
//
// Pede o token (a digitação não aparece na tela) e o ID da zona, confere na
// Cloudflare se o token funciona e enxerga linkhub.api.br, e só então grava.
// Linhas que já existirem no .env.local são substituídas, não duplicadas.
//
// O token também precisa estar nas variáveis de ambiente da Vercel — este
// script cuida só da sua máquina, que é onde roda o provisionar-dominios.mjs.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import readline from 'node:readline';

const ENV = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local');
const ROOT = 'linkhub.api.br';

function perguntar(texto, { oculto = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (oculto) {
      // Escreve a pergunta e depois engole o eco do que for colado.
      rl._writeToOutput = (s) => {
        if (s.includes(texto)) rl.output.write(s);
        else if (s.includes('\n') || s.includes('\r')) rl.output.write('\n');
      };
    }
    rl.question(texto, (resposta) => {
      rl.close();
      resolve(resposta.trim().replace(/^["']|["']$/g, ''));
    });
  });
}

async function cloudflare(token, caminho) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${caminho}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok && body.success !== false, body };
}

function gravar(valores) {
  let texto = existsSync(ENV) ? readFileSync(ENV, 'utf8') : '';
  const nl = texto.includes('\r\n') ? '\r\n' : '\n';
  for (const [chave, valor] of Object.entries(valores)) {
    const linha = `${chave}=${valor}`;
    const re = new RegExp(`^\\s*${chave}\\s*=.*$`, 'm');
    if (re.test(texto)) texto = texto.replace(re, linha);
    else texto = `${texto.replace(/\s*$/, '')}${nl}${linha}${nl}`;
  }
  writeFileSync(ENV, texto);
}

console.log('\nToken da Cloudflare para o DNS de linkhub.api.br\n');

const token = await perguntar('Cole o token e aperte Enter (não aparece na tela): ', { oculto: true });
if (!token) {
  console.error('Nenhum token colado. Nada foi gravado.');
  process.exit(1);
}

const verificacao = await cloudflare(token, '/user/tokens/verify');
if (!verificacao.ok || verificacao.body.result?.status !== 'active') {
  console.error('\n✗ A Cloudflare não aceitou este token. Confira se copiou inteiro. Nada foi gravado.');
  process.exit(1);
}
console.log('✓ Token válido e ativo.');

let zona = await perguntar('Cole o ID da zona (ou só Enter para pular): ');

if (zona) {
  const r = await cloudflare(token, `/zones/${encodeURIComponent(zona)}/dns_records?type=TXT&per_page=1`);
  if (!r.ok) {
    console.error(`✗ O token não acessa o DNS desta zona: ${r.body.errors?.[0]?.message ?? 'erro desconhecido'}.`);
    console.error('  Confira o ID da zona e se o token foi criado para linkhub.api.br. Nada foi gravado.');
    process.exit(1);
  }
} else {
  // Sem ID: tenta descobrir. Funciona se o token também puder ler a zona.
  const r = await cloudflare(token, `/zones?name=${ROOT}`);
  zona = r.ok ? (r.body.result?.[0]?.id ?? '') : '';
  if (zona) console.log(`✓ Zona encontrada sozinha: ${zona}`);
  else {
    console.error('✗ O token não consegue descobrir a zona sozinho. Rode de novo e cole o ID da zona');
    console.error('  (Cloudflare → linkhub.api.br → Visão geral → coluna da direita → API). Nada foi gravado.');
    process.exit(1);
  }
}
console.log('✓ O token consegue editar o DNS de linkhub.api.br.');

gravar({ CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ZONE_ID: zona });
console.log(`\n✓ Gravado em .env.local. Pode avisar que está pronto.\n`);
