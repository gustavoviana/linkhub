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
// Pendente de verificação é o caso comum: o DNS de ${ROOT} mora na
// Cloudflare, e a Vercel pede um TXT em _vercel.<raiz> por subdomínio. Com
// CLOUDFLARE_API_TOKEN no .env.local o script publica esse TXT, pede a
// verificação e o certificado; sem ele, só imprime o registro a criar.
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
  CLOUDFLARE_API_TOKEN: CF_TOKEN,
  CLOUDFLARE_ZONE_ID: CF_ZONE,
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

async function cloudflare(path, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(body.errors?.[0]?.message ?? `Cloudflare respondeu ${res.status}`);
  }
  return body.result;
}

let zona = CF_ZONE;
async function publicarTxt(name, value) {
  if (!zona) zona = (await cloudflare(`/zones?name=${encodeURIComponent(ROOT)}`))[0]?.id;
  if (!zona) throw new Error(`zona ${ROOT} não encontrada na Cloudflare`);
  const existentes = await cloudflare(
    `/zones/${zona}/dns_records?type=TXT&name=${encodeURIComponent(name)}&per_page=100`,
  );
  if (existentes.some((r) => r.content.replace(/^"|"$/g, '') === value)) return 'já existia';
  await cloudflare(`/zones/${zona}/dns_records`, {
    method: 'POST',
    body: JSON.stringify({
      type: 'TXT',
      name,
      content: `"${value}"`,
      ttl: 60,
      comment: 'Verificação da Vercel — criado pelo LinkHub',
    }),
  });
  return 'publicado';
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/** Publica o TXT, pede a verificação (com paciência) e o certificado. */
async function resolverPendente(domain, verification) {
  if (!CF_TOKEN || !domain.endsWith(`.${ROOT}`)) return false;
  for (const v of verification.filter((x) => x.type === 'TXT')) {
    console.log(`           TXT ${await publicarTxt(v.domain, v.value)}`);
  }
  for (const ms of [2000, 5000, 10000, 20000]) {
    await espera(ms);
    const r = await vercel(`/v9/projects/${PROJECT_ID}/domains/${encodeURIComponent(domain)}/verify`, {
      method: 'POST',
    });
    if (r.ok && r.body.verified === true) {
      const c = await vercel('/v8/certs', { method: 'POST', body: JSON.stringify({ cns: [domain] }) });
      console.log(`           verificado; certificado ${c.ok ? 'pedido' : `não pedido (${c.body?.error?.message ?? c.status})`}`);
      return true;
    }
  }
  console.log('           a Vercel ainda não enxergou o TXT — rode de novo em alguns minutos');
  return false;
}

const tenants = await listarTenants();
// A demonstração tem subdomínio próprio mesmo onde não existe como provedor.
if (!tenants.some((t) => t.slug === 'demo')) tenants.push({ slug: 'demo' });
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
      console.log(`  pendente ${domain} — aguardando verificação`);
      if (antes.verification?.length) {
        for (const v of antes.verification) console.log(`           ${v.type} ${v.domain} → ${v.value}`);
        if (!DRY_RUN && (await resolverPendente(domain, antes.verification))) continue;
      }
      pendentes++;
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
      if (!(await resolverPendente(domain, depois.verification))) pendentes++;
    }
  }
}

console.log(
  `\n${DRY_RUN ? 'Faltam registrar' : 'Registrados agora'}: ${novos}. Aguardando verificação: ${pendentes}.`,
);
console.log(
  CF_TOKEN
    ? 'O certificado sai em até um minuto depois do domínio ficar verificado.'
    : 'Sem CLOUDFLARE_API_TOKEN: publique os TXT acima na Cloudflare e rode de novo.',
);
