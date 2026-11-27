#!/usr/bin/env node
// Passa as keystores de upload da chave do ERP (v1) para a chave própria
// (v2, KEYSTORE_ENCRYPTION_KEY), e extrai o certificado público de cada uma.
//
// Uso (precisa das chaves de PRODUÇÃO, as mesmas da Vercel):
//
//   node --env-file=.env.producao scripts/recifrar-keystores.mjs            # só confere
//   node --env-file=.env.producao scripts/recifrar-keystores.mjs --apply    # grava
//
// Variáveis: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// ERP_CONFIG_ENCRYPTION_KEY (antiga) e KEYSTORE_ENCRYPTION_KEY (nova).
// Opcional: --backup-dir=caminho (padrão ./backups, fora do git).
//
// O que garante:
//  * Nada muda se qualquer linha falhar na conferência: primeiro confere
//    todas, depois grava.
//  * Antes de gravar, guarda os valores antigos (já cifrados) num arquivo
//    local e na tabela tenant_app_secret_backups (migração 014).
//  * Cada keystore é decifrada, aberta com a senha e comparada com o
//    SHA-256 gravado, antes e depois de recifrar. Depois de gravar, relê a
//    linha do banco e confere de novo; se não bater, volta o valor antigo.
//  * Idempotente: linha já em v2 só é conferida. Rodar duas vezes não muda
//    nada na segunda.
//  * Nunca imprime senha, keystore ou chave. Só nome do provedor, versão do
//    formato e SHA-256 (que é público).

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { KeystoreError, inspectKeystore, openWith, parseKey, planRow, versionOf } from './keystore-crypto.mjs';

const apply = process.argv.includes('--apply');
const backupDir = path.resolve(
  process.argv.find((a) => a.startsWith('--backup-dir='))?.slice('--backup-dir='.length) ?? 'backups',
);

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) fail('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');

let keys;
try {
  keys = {
    v1: parseKey(process.env.ERP_CONFIG_ENCRYPTION_KEY, 'ERP_CONFIG_ENCRYPTION_KEY'),
    v2: parseKey(process.env.KEYSTORE_ENCRYPTION_KEY, 'KEYSTORE_ENCRYPTION_KEY'),
  };
} catch (e) {
  fail(`Chave inválida: ${e instanceof KeystoreError ? e.code : 'erro'}.`);
}
if (keys.v1.equals(keys.v2)) fail('KEYSTORE_ENCRYPTION_KEY é igual à ERP_CONFIG_ENCRYPTION_KEY. Gere uma nova.');

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const COLS = 'tenant_id, app_name, keystore_data, keystore_password, keystore_sha256, keystore_alias, upload_cert_pem';
const { data: rows, error } = await db.from('tenant_apps').select(COLS);
if (error) fail(`Não consegui ler tenant_apps (${error.code ?? 'erro'}). A migração 014 já rodou?`);

console.log(`${apply ? 'GRAVANDO' : 'Conferência (nada é gravado; use --apply para gravar)'}\n`);

// 1) Confere todas antes de mexer em qualquer uma.
const plans = [];
let problems = 0;
for (const row of rows) {
  const label = row.app_name.padEnd(24);
  const fmt = `senha ${versionOf(row.keystore_password) ?? '-'} / keystore ${versionOf(row.keystore_data) ?? '-'}`;
  try {
    const plan = planRow(row, keys);
    plans.push({ row, plan });
    const what = plan.action === 'skip' ? 'nada a fazer' : `recifrar ${Object.keys(plan.patch).join(', ')}`;
    console.log(`  ${label} ${fmt.padEnd(28)} SHA-256 ${plan.sha256 ? 'confere' : 'sem keystore'}  → ${what}`);
  } catch (e) {
    problems++;
    console.log(`  ${label} ${fmt.padEnd(28)} ✗ ${e instanceof KeystoreError ? e.code : 'erro inesperado'}`);
  }
}

if (problems) fail(`${problems} provedor(es) não passaram na conferência. Nada foi gravado.`);
const todo = plans.filter((p) => p.plan.action === 'update');
if (!todo.length) {
  console.log('\n✓ Tudo já está em v2 e confere. Nada a fazer.');
  process.exit(0);
}
if (!apply) {
  console.log(`\n✓ ${todo.length} provedor(es) prontos para recifrar. Rode de novo com --apply.`);
  process.exit(0);
}

// 2) Backup: valores antigos, ainda cifrados com a chave antiga.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
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
    reason: `recifrar v1→v2 ${stamp}`,
  })),
);
if (backupError) fail(`Backup no banco falhou (${backupError.code ?? 'erro'}). Nada foi gravado.`);
console.log(`\nBackup: ${backupFile} e tabela tenant_app_secret_backups.\n`);

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

  // 4) Relê do banco e confere com a chave nova só.
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
    console.log(`  ${row.app_name}: ✓ recifrada e conferida (SHA-256 ${plan.sha256 ?? '-'})`);
  } catch (e) {
    await db
      .from('tenant_apps')
      .update({ keystore_data: row.keystore_data, keystore_password: row.keystore_password })
      .eq('tenant_id', row.tenant_id);
    console.log(`  ${row.app_name}: ✗ ${e instanceof KeystoreError ? e.code : 'erro'}. Valor antigo restaurado.`);
  }
}

console.log(`\n${ok}/${todo.length} gravados.`);
if (ok !== todo.length) process.exit(1);
console.log(
  'Guarde o arquivo de backup fora desta máquina. Depois de um build bem-sucedido de cada provedor,\n' +
    'as linhas de tenant_app_secret_backups e o arquivo podem ser apagados.',
);
