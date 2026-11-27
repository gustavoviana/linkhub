#!/usr/bin/env node
// Passa as keystores de upload da chave do ERP (v1) para a chave própria
// (v2, KEYSTORE_ENCRYPTION_KEY), e extrai o certificado público de cada uma.
//
// Uso (precisa das chaves de PRODUÇÃO, as mesmas da Vercel):
//
//   node --env-file=.env.producao scripts/recifrar-keystores.mjs            # só confere
//   node --env-file=.env.producao scripts/recifrar-keystores.mjs --apply    # grava
//   node --env-file=.env.producao scripts/recifrar-keystores.mjs --verify   # confere o que já foi gravado
//
// Variáveis: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// ERP_CONFIG_ENCRYPTION_KEY (antiga) e KEYSTORE_ENCRYPTION_KEY (nova).
// --verify só precisa da nova. Opcional: --backup-dir=caminho (padrão
// ./backups, fora do git).
//
// O que garante:
//  * Nada muda se qualquer linha falhar na conferência: primeiro confere
//    todas, depois grava.
//  * Antes de gravar, guarda os valores antigos (ainda cifrados) num arquivo
//    local e na tabela tenant_app_secret_backups, relê os dois e confere que
//    cada provedor tem cópia exata. Sem isso, para sem gravar.
//  * Cada keystore é decifrada, aberta com a senha e comparada com o
//    SHA-256 gravado, antes e depois de recifrar. Depois de gravar, relê a
//    linha do banco e confere; se não bater, volta o valor antigo.
//  * No fim, relê todos os provedores e decifra SÓ com a chave nova.
//  * Idempotente: linha já em v2 só é conferida.
//  * Nunca imprime senha, keystore ou chave. Só nome do provedor, versão do
//    formato e SHA-256 (que é público).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  KeystoreError,
  inspectKeystore,
  missingBackups,
  normalizeFingerprint,
  openWith,
  parseKey,
  planRow,
  verifyRowV2,
  versionOf,
} from './keystore-crypto.mjs';

const apply = process.argv.includes('--apply');
const verifyOnly = process.argv.includes('--verify');
const backupDir = path.resolve(
  process.argv.find((a) => a.startsWith('--backup-dir='))?.slice('--backup-dir='.length) ?? 'backups',
);

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}
const code = (e) => (e instanceof KeystoreError ? e.code : 'erro inesperado');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) fail('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');

let keys;
try {
  keys = {
    v1: verifyOnly ? undefined : parseKey(process.env.ERP_CONFIG_ENCRYPTION_KEY, 'ERP_CONFIG_ENCRYPTION_KEY'),
    v2: parseKey(process.env.KEYSTORE_ENCRYPTION_KEY, 'KEYSTORE_ENCRYPTION_KEY'),
  };
} catch (e) {
  fail(`Chave inválida: ${code(e)}.`);
}
if (keys.v1?.equals(keys.v2)) fail('KEYSTORE_ENCRYPTION_KEY é igual à ERP_CONFIG_ENCRYPTION_KEY. Gere uma nova.');

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
console.log(`Banco: ${new URL(url).host}\n`);

const COLS = 'tenant_id, app_name, keystore_data, keystore_password, keystore_sha256, keystore_alias, upload_cert_pem';

async function readRows() {
  const { data, error } = await db.from('tenant_apps').select(COLS).order('app_name');
  if (error) fail(`Não consegui ler tenant_apps (${error.code ?? 'erro'}). A migração 014 já rodou?`);
  return data;
}

// Relê tudo do banco e decifra só com a chave nova.
async function finalCheck() {
  console.log('Conferência só com a KEYSTORE_ENCRYPTION_KEY (relido do banco):');
  let bad = 0;
  for (const row of await readRows()) {
    if (!row.keystore_data) {
      console.log(`  ${row.app_name.padEnd(12)} sem keystore (nenhum build ainda)`);
      continue;
    }
    try {
      const { sha256 } = verifyRowV2(row, keys.v2);
      console.log(`  ${row.app_name.padEnd(12)} ✓ decifra com a chave nova · SHA-256 ${sha256} · .pem confere`);
    } catch (e) {
      bad++;
      console.log(`  ${row.app_name.padEnd(12)} ✗ ${code(e)}`);
    }
  }
  return bad;
}

if (verifyOnly) {
  const bad = await finalCheck();
  if (bad) fail(`${bad} provedor(es) não passaram.`);
  console.log('\n✓ Todos conferem.');
  process.exit(0);
}

const rows = await readRows();
console.log(`${apply ? 'GRAVANDO' : 'Conferência (nada é gravado; use --apply para gravar)'}\n`);

// 1) Confere todas antes de mexer em qualquer uma.
const plans = [];
let problems = 0;
for (const row of rows) {
  const label = row.app_name.padEnd(12);
  const fmt = `formato ${versionOf(row.keystore_data) ?? '-'}`;
  let decrypts = 'sem keystore';
  if (row.keystore_data) {
    try {
      openWith(row.keystore_data, keys);
      if (row.keystore_password) openWith(row.keystore_password, keys);
      decrypts = `decifrou com a chave ${versionOf(row.keystore_data) === 'v2' ? 'nova' : 'antiga'}: sim`;
    } catch (e) {
      decrypts = `decifrou: NÃO (${code(e)})`;
    }
  }
  try {
    const plan = planRow(row, keys);
    plans.push({ row, plan });
    const what = plan.action === 'skip' ? 'nada a fazer' : `recifrar ${Object.keys(plan.patch).join(', ')}`;
    const sha = plan.sha256
      ? `SHA-256 ${plan.sha256} = banco ✓`
      : '';
    console.log(`  ${label} ${fmt} · ${decrypts} · ${sha}\n  ${' '.repeat(12)} → ${what}`);
  } catch (e) {
    problems++;
    let detail = code(e);
    if (detail === 'sha256_nao_confere') {
      // Mostra os dois para comparar (SHA-256 é público).
      try {
        const ks = openWith(row.keystore_data, keys);
        const pass = openWith(row.keystore_password, keys);
        detail += ` (keystore ${inspectKeystore(ks, pass, row.keystore_alias).sha256} ≠ banco ${normalizeFingerprint(row.keystore_sha256)})`;
      } catch {
        /* já reportado */
      }
    }
    console.log(`  ${label} ${fmt} · ${decrypts} · ✗ ${detail}`);
  }
}

if (problems) fail(`${problems} provedor(es) não passaram na conferência. Nada foi gravado.`);
const todo = plans.filter((p) => p.plan.action === 'update');
if (!todo.length) {
  console.log('\n✓ Nada a recifrar.');
  const bad = await finalCheck();
  process.exit(bad ? 1 : 0);
}
if (!apply) {
  console.log(`\n✓ ${todo.length} provedor(es) prontos para recifrar. Rode de novo com --apply.`);
  process.exit(0);
}

// 2) Backup: valores antigos, ainda cifrados com a chave antiga. Só segue se
//    o arquivo e a tabela, relidos, tiverem cópia exata de cada provedor.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const reason = `recifrar v1→v2 ${stamp}`;
mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(backupDir, `keystores-${stamp}.json`);
const backup = todo.map(({ row }) => ({
  tenant_id: row.tenant_id,
  app_name: row.app_name,
  keystore_data: row.keystore_data,
  keystore_password: row.keystore_password,
  keystore_sha256: row.keystore_sha256,
}));
writeFileSync(backupFile, `${JSON.stringify({ created_at: new Date().toISOString(), rows: backup }, null, 2)}\n`, {
  mode: 0o600,
});
const { error: backupError } = await db.from('tenant_app_secret_backups').insert(
  backup.map((b) => ({
    tenant_id: b.tenant_id,
    keystore_data: b.keystore_data,
    keystore_password: b.keystore_password,
    keystore_sha256: b.keystore_sha256,
    reason,
  })),
);
if (backupError) fail(`Backup no banco falhou (${backupError.code ?? 'erro'}). Nada foi gravado.`);

const { data: savedRows, error: readBackError } = await db
  .from('tenant_app_secret_backups')
  .select('tenant_id, keystore_data, keystore_password, keystore_sha256')
  .eq('reason', reason);
if (readBackError) fail(`Não consegui reler o backup (${readBackError.code ?? 'erro'}). Nada foi gravado.`);
const fileRows = JSON.parse(readFileSync(backupFile, 'utf8')).rows;
const missingDb = missingBackups(backup, savedRows);
const missingFile = missingBackups(backup, fileRows);
if (missingDb.length || missingFile.length) {
  fail(
    `Backup incompleto (tabela: ${missingDb.length}, arquivo: ${missingFile.length} sem cópia exata). Nada foi gravado.`,
  );
}
console.log(`\nBackup conferido (cópia exata de keystore, senha e SHA-256):`);
for (const b of backup) console.log(`  ${b.app_name.padEnd(12)} ✓ tabela tenant_app_secret_backups · ✓ arquivo`);
console.log(`  Arquivo: ${backupFile}\n`);

// 3) Grava uma a uma, só se a linha ainda estiver como foi conferida.
let ok = 0;
for (const { row, plan } of todo) {
  let q = db.from('tenant_apps').update(plan.patch).eq('tenant_id', row.tenant_id);
  q = row.keystore_data ? q.eq('keystore_data', row.keystore_data) : q.is('keystore_data', null);
  q = row.keystore_password ? q.eq('keystore_password', row.keystore_password) : q.is('keystore_password', null);
  const { data: updated, error: upError } = await q.select(COLS);
  if (upError || updated?.length !== 1) {
    console.log(`  ${row.app_name}: ✗ a linha mudou desde a conferência ou a gravação falhou. Não mexi.`);
    continue;
  }

  // Relê e confere com a chave nova só.
  const after = updated[0];
  try {
    const pass = after.keystore_password ? openWith(after.keystore_password, { v2: keys.v2 }) : null;
    if (after.keystore_data) {
      const ks = openWith(after.keystore_data, { v2: keys.v2 });
      if (inspectKeystore(ks, pass, after.keystore_alias).sha256 !== plan.sha256) {
        throw new KeystoreError('sha256_nao_confere_depois');
      }
    }
    ok++;
    console.log(`  ${row.app_name}: ✓ gravada`);
  } catch (e) {
    await db
      .from('tenant_apps')
      .update({ keystore_data: row.keystore_data, keystore_password: row.keystore_password })
      .eq('tenant_id', row.tenant_id);
    console.log(`  ${row.app_name}: ✗ ${code(e)}. Valor antigo restaurado.`);
  }
}
console.log(`\n${ok}/${todo.length} gravados.\n`);

// 4) Conferência final, do zero.
const bad = await finalCheck();
if (ok !== todo.length || bad) process.exit(1);
console.log(
  '\n✓ Pronto. Guarde o arquivo de backup fora desta máquina. Depois de um build bem-sucedido de cada\n' +
    'provedor, as linhas de tenant_app_secret_backups e o arquivo podem ser apagados (me consulte antes).',
);
