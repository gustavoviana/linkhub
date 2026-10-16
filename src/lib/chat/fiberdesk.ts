import 'server-only';

// Cliente da integração de app do FiberDesk.
//
// O FiberDesk emite um link PESSOAL do atendimento: quem tiver o link entra
// no chat como aquele assinante. Por isso a chamada sai sempre daqui, do
// servidor, no instante do toque — o token da conta nunca vai para o
// navegador nem para dentro do aplicativo.
//
// Contrato (apps/api/src/integracao-app no FiberDesk):
//   POST /api/integracao-app/acesso   x-api-key: fdapp_…
//   { cpfCnpj?, telefone?, nome? }  →  { url, expiresAt }   (link de 15 min)
// Assinante que nunca falou com o provedor nasce como contato lá.

const BASE = (process.env.FIBERDESK_API_URL ?? 'https://api.fiberdesk.com.br').replace(/\/$/, '');

export const PREFIXO_TOKEN_FIBERDESK = 'fdapp_';

/** Formato do token gerado no FiberDesk: prefixo + 32 bytes em base64url. */
export function tokenFiberdeskValido(token: string): boolean {
  return /^fdapp_[A-Za-z0-9_-]{20,}$/.test(token);
}

/** "fdapp_a1b2…" — o bastante para reconhecer, nada para usar. */
export function dicaDoToken(token: string): string {
  return `${token.slice(0, PREFIXO_TOKEN_FIBERDESK.length + 4)}…`;
}

export interface AssinanteDoChat {
  cpfCnpj?: string | null;
  telefone?: string | null;
  nome?: string | null;
}

export type LinkDoChat =
  | { ok: true; url: string; expiresAt: string }
  | { ok: false; status: number; motivo: string };

const digitos = (v: string | null | undefined) => String(v ?? '').replace(/\D/g, '');

export async function pedirLinkDoChat(token: string, assinante: AssinanteDoChat): Promise<LinkDoChat> {
  const cpfCnpj = digitos(assinante.cpfCnpj);
  const telefone = digitos(assinante.telefone);

  // Os limites são os do schema do FiberDesk: fora deles a resposta seria um
  // 400 genérico, e aqui dá para dizer o que falta.
  const corpo: Record<string, string> = {};
  if (cpfCnpj.length >= 11 && cpfCnpj.length <= 20) corpo.cpfCnpj = cpfCnpj;
  if (telefone.length >= 8 && telefone.length <= 20) corpo.telefone = telefone;
  if (!corpo.cpfCnpj && !corpo.telefone) {
    return { ok: false, status: 400, motivo: 'O cadastro do assinante não tem CPF/CNPJ nem telefone.' };
  }
  const nome = assinante.nome?.trim();
  if (nome) corpo.nome = nome.slice(0, 120);

  let r: Response;
  try {
    r = await fetch(`${BASE}/api/integracao-app/acesso`, {
      method: 'POST',
      headers: { 'x-api-key': token, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      cache: 'no-store',
      // O assinante está olhando para um botão girando. Passou disso, é
      // melhor dizer que não deu do que deixá-lo esperando.
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return { ok: false, status: 504, motivo: 'O sistema de atendimento não respondeu a tempo.' };
  }

  const dados = (await r.json().catch(() => null)) as
    | { url?: string; expiresAt?: string; message?: string | string[] }
    | null;

  if (r.ok && dados?.url) {
    return { ok: true, url: dados.url, expiresAt: dados.expiresAt ?? '' };
  }

  if (r.status === 401) {
    return { ok: false, status: 401, motivo: 'Token recusado pelo FiberDesk: inválido ou revogado.' };
  }
  const msg = Array.isArray(dados?.message) ? dados?.message.join(', ') : dados?.message;
  return {
    ok: false,
    status: r.status || 502,
    motivo: msg ? `FiberDesk: ${msg}` : `O FiberDesk respondeu ${r.status}.`,
  };
}
