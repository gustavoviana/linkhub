import 'server-only';
import { promises as dns } from 'node:dns';

// Cliente da API de domínios da Vercel.
//
// Cada provedor que se cadastra ganha <slug>.linkhub.api.br. O DNS já resolve
// pelo curinga, mas a Vercel só entrega o host (e emite certificado) depois
// que ele é registrado no projeto — é o passo que faltava e que fazia todo
// subdomínio novo responder DEPLOYMENT_NOT_FOUND.
//
// Sem VERCEL_API_TOKEN o app não quebra: o provisionamento é marcado como
// pendente e o painel mostra o que fazer à mão.

const API = 'https://api.vercel.com';

export type DomainState =
  | 'ready'          // apontado e com certificado válido
  | 'issuing'        // DNS correto; falta o certificado
  | 'dns_missing'    // registrado no projeto, mas o DNS não aponta para cá
  | 'pending'        // registrado, aguardando verificação de propriedade
  | 'unconfigured'   // integração da Vercel não configurada
  | 'error';

/** Registro que precisa existir no painel de DNS do provedor. */
export interface DnsRecord {
  type: 'A' | 'CNAME' | 'TXT';
  /** Nome do registro como se digita na maioria dos painéis: "app", "@". */
  name: string;
  value: string;
  /** Outros valores que a Vercel também aceita para o mesmo registro. */
  alternatives?: string[];
}

export interface DomainStatus {
  state: DomainState;
  domain: string;
  message?: string;
  /** Registro de propriedade que a Vercel pede, quando há verificação pendente. */
  verification?: { type: string; domain: string; value: string }[];
  /** O apontamento que falta. */
  expected?: DnsRecord[];
  /** O que existe hoje no DNS, para o provedor comparar com o esperado. */
  found?: { cnames: string[]; aValues: string[]; nameservers: string[] };
  /** Registros que atrapalham o apontamento (A e CNAME no mesmo nome, por exemplo). */
  conflicts?: { type: string; name: string; value: string }[];
  /** O domínio raiz não existe no DNS. Quase sempre é erro de digitação. */
  apexUnresolved?: boolean;
  /** Domínio raiz de onde sai o registro: fibranet.com.br para app.fibranet.com.br. */
  apex?: string;
  /** Handshake TLS bateu — a prova de que o certificado existe mesmo. */
  ssl?: boolean;
}

function config() {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token || !projectId) return null;
  return { token, projectId, teamId };
}

export function isVercelConfigured() {
  return config() !== null;
}

function withTeam(path: string, teamId?: string) {
  if (!teamId) return path;
  return `${path}${path.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(teamId)}`;
}

async function call(path: string, init: RequestInit = {}) {
  const cfg = config();
  if (!cfg) throw new Error('unconfigured');
  const res = await fetch(API + withTeam(path, cfg.teamId), {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body } as {
    ok: boolean;
    status: number;
    body: Record<string, unknown>;
  };
}

/** Registra o domínio no projeto. Idempotente: já existente conta como sucesso. */
export async function addDomain(domain: string): Promise<DomainStatus> {
  const cfg = config();
  if (!cfg) return { state: 'unconfigured', domain, message: 'Integração com a Vercel não configurada.' };

  try {
    const res = await call(`/v10/projects/${cfg.projectId}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    });

    const code = (res.body?.error as { code?: string } | undefined)?.code;
    // domain_already_in_use pelo próprio projeto é o caso de re-provisionar.
    if (!res.ok && code !== 'domain_already_exists' && code !== 'domain_already_in_use') {
      const message =
        (res.body?.error as { message?: string } | undefined)?.message ?? `Vercel respondeu ${res.status}`;
      return { state: 'error', domain, message };
    }

    return await getDomainStatus(domain);
  } catch (e) {
    return { state: 'error', domain, message: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Pede à Vercel para reconferir o TXT de propriedade.
 *
 * Registrar o domínio de novo NÃO dispara nova checagem — sem esta chamada o
 * host fica "verificação pendente" para sempre, mesmo com o TXT já publicado.
 */
export async function verifyDomain(domain: string): Promise<boolean> {
  const cfg = config();
  if (!cfg) return false;
  try {
    const res = await call(
      `/v9/projects/${cfg.projectId}/domains/${encodeURIComponent(domain)}/verify`,
      { method: 'POST' },
    );
    return res.ok && res.body.verified === true;
  } catch {
    return false;
  }
}

interface VercelDomainConfig {
  configuredBy: string | null;
  misconfigured: boolean;
  cnames: string[];
  aValues: string[];
  nameservers: string[];
  conflicts: { type: string; name: string; value: string }[];
  recommendedIPv4?: { rank: number; value: string[] }[];
  recommendedCNAME?: { rank: number; value: string }[];
}

/**
 * O que o DNS público responde para este domínio, na visão da Vercel.
 *
 * É esta chamada que sabe se o apontamento existe. `verified` na ficha do
 * projeto responde outra pergunta: se a posse do domínio foi provada, o que a
 * Vercel dá de graça quando ninguém mais reivindicou o nome. Confundir os dois
 * fazia a tela anunciar "emitindo certificado" para um domínio que nem tinha
 * registro criado ainda.
 */
async function getConfig(domain: string): Promise<VercelDomainConfig | null> {
  try {
    const res = await call(`/v6/domains/${encodeURIComponent(domain)}/config`);
    if (!res.ok) return null;
    const b = res.body as Record<string, unknown>;
    return {
      configuredBy: (b.configuredBy as string | null) ?? null,
      misconfigured: b.misconfigured === true,
      cnames: (b.cnames as string[]) ?? [],
      aValues: (b.aValues as string[]) ?? [],
      nameservers: (b.nameservers as string[]) ?? [],
      conflicts: (b.conflicts as VercelDomainConfig['conflicts']) ?? [],
      recommendedIPv4: b.recommendedIPv4 as VercelDomainConfig['recommendedIPv4'],
      recommendedCNAME: b.recommendedCNAME as VercelDomainConfig['recommendedCNAME'],
    };
  } catch {
    return null;
  }
}

const trimDot = (v: string) => v.replace(/\.$/, '');

/**
 * O domínio raiz existe no DNS público?
 *
 * Separa as duas causas de "não aponta para cá", que pedem ações opostas:
 * domínio certo com registro faltando, ou domínio que não existe. O segundo é
 * quase sempre erro de digitação, e sem esta checagem a tela mandava criar um
 * CNAME num domínio inexistente — o provedor cria, funciona no domínio certo,
 * e a tela continua dizendo que falta apontar.
 */
async function apexResolves(apex: string): Promise<boolean> {
  try {
    const ns = await Promise.race([
      dns.resolveNs(apex),
      new Promise<string[]>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
    ]);
    return ns.length > 0;
  } catch {
    return false;
  }
}

/**
 * O registro que o provedor precisa criar.
 *
 * Os valores vêm da própria Vercel, não de constante no código: cada projeto
 * recebe um destino de CNAME próprio, e os IPs mudaram mais de uma vez. Ficam
 * ordenados por `rank`, então o primeiro é o recomendado hoje e o resto entra
 * como alternativa aceita.
 */
function expectedRecords(domain: string, apexName: string, cfg: VercelDomainConfig): DnsRecord[] {
  const isApex = domain === apexName;

  if (isApex) {
    const ranked = [...(cfg.recommendedIPv4 ?? [])].sort((a, b) => a.rank - b.rank);
    const primary = ranked[0]?.value ?? ['76.76.21.21'];
    const alternatives = ranked.slice(1).flatMap((r) => r.value);
    return primary.map((value) => ({ type: 'A' as const, name: '@', value, alternatives }));
  }

  const host = domain.slice(0, -(apexName.length + 1));
  const ranked = [...(cfg.recommendedCNAME ?? [])].sort((a, b) => a.rank - b.rank);
  const primary = ranked[0]?.value ? trimDot(ranked[0].value) : 'cname.vercel-dns.com';
  return [
    {
      type: 'CNAME',
      name: host,
      value: primary,
      alternatives: ranked.slice(1).map((r) => trimDot(r.value)),
    },
  ];
}

/**
 * Manda a Vercel emitir o certificado agora.
 *
 * Ela emite sozinha alguns segundos depois de o DNS ficar correto, mas quando o
 * apontamento demorou a propagar a emissão automática já passou, e o domínio
 * fica sem cadeado até alguém cutucar. Este é o cutucão.
 */
export async function issueCertificate(domain: string): Promise<{ ok: boolean; message?: string }> {
  const cfg = config();
  if (!cfg) return { ok: false, message: 'Integração com a Vercel não configurada.' };

  try {
    const res = await call('/v8/certs', {
      method: 'POST',
      body: JSON.stringify({ cns: [domain] }),
    });
    if (res.ok) return { ok: true };

    const message =
      (res.body?.error as { message?: string } | undefined)?.message ??
      `Vercel respondeu ${res.status}`;
    return { ok: false, message };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Confirma que o certificado existe de verdade.
 *
 * Quem responde essa pergunta sem margem para dúvida é o próprio handshake
 * TLS: se ele completa, há certificado válido. O status HTTP não importa —
 * 404 serve igual.
 */
async function hasCertificate(domain: string): Promise<boolean> {
  try {
    await fetch(`https://${domain}/favicon.ico`, {
      method: 'HEAD',
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    return true;
  } catch {
    return false;
  }
}

export async function getDomainStatus(domain: string): Promise<DomainStatus> {
  const cfg = config();
  if (!cfg) return { state: 'unconfigured', domain };

  try {
    const res = await call(`/v9/projects/${cfg.projectId}/domains/${encodeURIComponent(domain)}`);
    if (!res.ok) {
      return { state: 'error', domain, message: `Domínio não encontrado no projeto (${res.status}).` };
    }

    const verification = (res.body.verification as DomainStatus['verification']) ?? undefined;
    const apexName = (res.body.apexName as string | undefined) ?? domain;

    // Não verificado ainda: pode ser só falta de reconferir o TXT.
    const verified = res.body.verified === true || (await verifyDomain(domain));

    if (!verified) {
      return {
        state: 'pending',
        domain,
        message:
          'A Vercel precisa confirmar que o domínio é seu. Publique o registro abaixo e confira de novo.',
        verification,
        ssl: false,
      };
    }

    const conf = await getConfig(domain);
    if (!conf) {
      return { state: 'error', domain, message: 'Não foi possível consultar o DNS na Vercel.' };
    }

    const found = { cnames: conf.cnames, aValues: conf.aValues, nameservers: conf.nameservers };
    const expected = expectedRecords(domain, apexName, conf);

    if (conf.misconfigured) {
      const apexOk = await apexResolves(apexName);
      return {
        state: 'dns_missing',
        domain,
        message: apexOk
          ? 'O DNS ainda não aponta para cá. Crie o registro abaixo no painel onde o domínio está registrado e confira de novo.'
          : `O domínio ${apexName} não responde no DNS: ou está escrito errado, ou ainda não foi registrado, ou não tem servidores DNS configurados no registrador.`,
        expected,
        found,
        conflicts: conf.conflicts,
        apexUnresolved: !apexOk,
        apex: apexName,
        ssl: false,
      };
    }

    if (!(await hasCertificate(domain))) {
      return {
        state: 'issuing',
        domain,
        message: 'Apontamento correto. Falta emitir o certificado SSL.',
        expected,
        found,
        ssl: false,
      };
    }

    return { state: 'ready', domain, found, ssl: true };
  } catch (e) {
    return { state: 'error', domain, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function removeDomain(domain: string): Promise<boolean> {
  const cfg = config();
  if (!cfg) return false;
  const res = await call(`/v9/projects/${cfg.projectId}/domains/${encodeURIComponent(domain)}`, {
    method: 'DELETE',
  });
  return res.ok;
}

export function tenantDomain(slug: string) {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'linkhub.api.br';
  return `${slug}.${root}`;
}
