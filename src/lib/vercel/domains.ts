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
  | 'ready'          // registrado e servindo
  | 'pending'        // registrado, aguardando verificação/certificado
  | 'unconfigured'   // integração da Vercel não configurada
  | 'error';

export interface DomainStatus {
  state: DomainState;
  domain: string;
  message?: string;
  /** Registro DNS que a Vercel está pedindo, quando há verificação pendente. */
  verification?: { type: string; domain: string; value: string }[];
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

export async function getDomainStatus(domain: string): Promise<DomainStatus> {
  const cfg = config();
  if (!cfg) return { state: 'unconfigured', domain };

  try {
    const res = await call(`/v9/projects/${cfg.projectId}/domains/${encodeURIComponent(domain)}`);
    if (!res.ok) {
      return { state: 'error', domain, message: `Domínio não encontrado no projeto (${res.status}).` };
    }

    const verification = (res.body.verification as DomainStatus['verification']) ?? undefined;
    const verified = res.body.verified === true;

    if (!verified) {
      return {
        state: 'pending',
        domain,
        message: 'Aguardando verificação de propriedade do domínio.',
        verification,
      };
    }
    return { state: 'ready', domain };
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
