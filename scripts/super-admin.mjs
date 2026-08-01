#!/usr/bin/env node
// Cria (ou promove) um super administrador da plataforma.
//
//   node scripts/super-admin.mjs gustavo@iconestudio.com.br
//   node scripts/super-admin.mjs gustavo@iconestudio.com.br --senha
//
// Sem --senha, um usuário que já existe mantém a senha atual e só ganha o
// acesso ao painel. Com --senha, uma senha nova é gerada e impressa uma vez.
//
// Lê SUPABASE_SERVICE_ROLE_KEY do .env.local. É a chave que ignora RLS: rode
// isto da sua máquina, nunca de um servidor compartilhado.

import { readFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const ALFABETO = 'abcdefghjkmnpqrtuvwxyzACDEFGHJKLMNPQRTUVWXY3467689';
const senhaNova = () =>
  Array.from({ length: 3 }, () =>
    Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join(''),
  ).join('-');

function env() {
  const out = {};
  try {
    for (const linha of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(linha.trim());
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    // sem .env.local: cai nas variáveis do ambiente
  }
  return { ...out, ...process.env };
}

const email = process.argv[2]?.trim().toLowerCase();
const trocarSenha = process.argv.includes('--senha');

if (!email || !email.includes('@')) {
  console.error('Uso: node scripts/super-admin.mjs <e-mail> [--senha]');
  process.exit(1);
}

const cfg = env();
const url = cfg.NEXT_PUBLIC_SUPABASE_URL;
const key = cfg.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// 1. Achar ou criar o usuário.
let userId = null;
let senha = null;

const { data: lista, error: erroLista } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (erroLista) {
  console.error('Não foi possível listar os usuários:', erroLista.message);
  process.exit(1);
}

const existente = lista.users.find((u) => u.email?.toLowerCase() === email);

if (existente) {
  userId = existente.id;
  console.log(`Usuário encontrado: ${email}`);
  if (trocarSenha) {
    senha = senhaNova();
    const { error } = await supabase.auth.admin.updateUserById(userId, { password: senha });
    if (error) {
      console.error('Não foi possível trocar a senha:', error.message);
      process.exit(1);
    }
  }
} else {
  senha = senhaNova();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (error) {
    console.error('Não foi possível criar o usuário:', error.message);
    process.exit(1);
  }
  userId = data.user.id;
  console.log(`Usuário criado: ${email}`);
}

// A credencial sai antes da concessão: se a migração ainda não rodou, o passo
// seguinte falha, e perder a senha por causa disso seria perder o acesso.
console.log('');
console.log(`  E-mail: ${email}`);
if (senha) console.log(`  Senha:  ${senha}   <- aparece só agora`);
else console.log('  Senha:  a que já existia (use --senha para gerar outra)');
console.log('');

// 2. Conceder o acesso.
const { error: erroAcesso } = await supabase
  .from('platform_admins')
  .upsert({ user_id: userId, email }, { onConflict: 'user_id' });

if (erroAcesso) {
  if (/does not exist|schema cache/i.test(erroAcesso.message)) {
    console.log('⚠ A tabela platform_admins ainda não existe neste banco.');
    console.log('  Rode supabase/migrations/20260801_009_platform_admin.sql no SQL Editor.');
    console.log('  A própria migração já promove este e-mail a super administrador.');
    process.exit(0);
  }
  console.error('Não foi possível conceder o acesso:', erroAcesso.message);
  process.exit(1);
}

console.log('✓ Super administrador liberado. Entre em /login e acesse /plataforma.');
