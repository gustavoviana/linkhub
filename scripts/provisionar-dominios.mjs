#!/usr/bin/env node
// Registra na Vercel o subdomínio de cada provedor já cadastrado.
//
// O DNS curinga (*.linkhub.api.br) faz o host resolver, mas a Vercel só
// apresenta certificado para domínio registrado no projeto — quem entrou antes
// da automação ficar de pé continua sem HTTPS até passar por aqui.
//
//   node scripts/provisionar-dominios.mjs            # registra o que falta
//   node scripts/provisionar-dominios.mjs --dry-run  # só mostra o estado
//
// Lê as credenciais do .env.local (ou do ambiente, se já estiverem exportadas).

import { readFileSync } from 'node:fs';

const DRY_RUN = process.argv.includes('--dry-run');

function loadEnv(file = '.env.local') {
  let raw = '';
  try {
    raw = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  } catch {
    return; // sem arquivo: assume variáveis já exportadas no shell
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, '');
    if (value && !process.env[m[1]]) process.env[m[1]] = value;
  }
}

loadEnv();

const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  VERCEL_API_TOKEN: TOKEN,
  VERCEL_PROJECT_ID: PROJECT_ID,
  VERCEL_TEAM_ID: TEAM_ID,
  NEXT_PUBLIC_ROOT_DOMAIN: ROOT = 'linkhub.api.br',
} = process.env;

const faltando = Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  VERCEL_API_TOKEN: TOKEN,
  VERCEL_PROJECT_ID: PROJECT_ID,
})
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (faltando.length) {
  console.error(`Faltam variáveis no .env.local: ${faltando.join(', ')}`);
  process.exit(1);
}

async function vercel(path, init = {}) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `https://api.vercel.com${path}${TEAM_ID ? `${sep}teamId=${encodeURIComponent(TEAM_ID)}` : ''}`;
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function listarTenants() {
  const url = `${SUPABASE_URL}/rest/v1/tenants?select=slug,name,custom_domain,custom_domain_verified&order=slug`;
  const res = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase respondeu ${res.status}: ${await res.text()}`);
  return res.json();
}

async function estado(domain) {
  const r = await vercel(`/v9/projects/${PROJECT_ID}/domains/${encodeURIComponent(domain)}`);
  if (!r.ok) return { registrado: false };
  return { registrado: true, verificado: r.body.verified === true, verification: r.body.verification };
}

async function registrar(domain) {
  const r = await vercel(`/v10/projects/${PROJECT_ID}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name: domain }),
  });
  const code = r.body?.error?.code;
  if (!r.ok && code !== 'domain_already_exists' && code !== 'domain_already_in_use') {
    return { ok: false, erro: r.body?.error?.message ?? `HTTP ${r.status}` };
  }
  return { ok: true };
}

const tenants = await listarTenants();
console.log(`${tenants.length} provedor(es) no banco. Domínio raiz: ${ROOT}${DRY_RUN ? ' — DRY RUN' : ''}\n`);

let novos = 0;
let pendentes = 0;

for (const t of tenants) {
  const alvos = [`${t.slug}.${ROOT}`];
  if (t.custom_domain) alvos.push(t.custom_domain);

  for (const domain of alvos) {
    const antes = await estado(domain);

    if (antes.registrado && antes.verificado) {
      console.log(`  ok       ${domain}`);
      continue;
    }
    if (antes.registrado && !antes.verificado) {
      pendentes++;
      console.log(`  pendente ${domain} — aguardando verificação`);
      if (antes.verification?.length) {
        for (const v of antes.verification) console.log(`           ${v.type} ${v.domain} → ${v.value}`);
      }
      continue;
    }
    if (DRY_RUN) {
      console.log(`  faltando ${domain}`);
      novos++;
      continue;
    }

    const r = await registrar(domain);
    if (!r.ok) {
      console.log(`  ERRO     ${domain} — ${r.erro}`);
      continue;
    }
    const depois = await estado(domain);
    novos++;
    console.log(`  criado   ${domain} — ${depois.verificado ? 'verificado' : 'aguardando verificação'}`);
    if (!depois.verificado && depois.verification?.length) {
      for (const v of depois.verification) console.log(`           ${v.type} ${v.domain} → ${v.value}`);
    }
  }
}

console.log(
  `\n${DRY_RUN ? 'Faltam registrar' : 'Registrados agora'}: ${novos}. Aguardando verificação: ${pendentes}.`,
);
console.log('O certificado sai sozinho poucos segundos depois do domínio ficar verificado.');
