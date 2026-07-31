import 'server-only';

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
  | 'ready'          // registrado, verificado e com certificado válido
  | 'issuing'        // verificado; o certificado ainda está saindo
  | 'pending'        // registrado, aguardando verificação de propriedade
  | 'unconfigured'   // integração da Vercel não configurada
  | 'error';

export interface DomainStatus {
  state: DomainState;
  domain: string;
  message?: string;
  /** Registro DNS que a Vercel está pedindo, quando há verificação pendente. */
  verification?: { type: string; domain: string; value: string }[];
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

/**
 * Confirma que o certificado existe de verdade.
 *
 * A Vercel dizer "verified" só significa que a posse do domínio foi provada; o
 * certificado sai alguns segundos depois. Quem responde essa pergunta sem
 * margem para dúvida é o próprio handshake TLS: se ele completa, há
 * certificado válido. O status HTTP não importa — 404 serve igual.
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
    // Não verificado ainda: pode ser só falta de reconferir o TXT.
    const verified = res.body.verified === true || (await verifyDomain(domain));

    if (!verified) {
      return {
        state: 'pending',
        domain,
        message: 'Aguardando o registro DNS abaixo. Depois de publicá-lo, é só recarregar.',
        verification,
        ssl: false,
      };
    }

    if (!(await hasCertificate(domain))) {
      return {
        state: 'issuing',
        domain,
        message: 'Domínio verificado. O certificado SSL está sendo emitido — costuma levar menos de um minuto.',
        ssl: false,
      };
    }

    return { state: 'ready', domain, ssl: true };
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
