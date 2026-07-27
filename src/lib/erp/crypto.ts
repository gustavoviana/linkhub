import 'server-only';
import crypto from 'node:crypto';
import type { ErpConfig } from './types';

// Criptografia das credenciais de ERP guardadas em tenants.erp_config.
//
// A RLS já impede que a chave pública leia a coluna, mas isso protege só o
// caminho da API: quem obtiver um dump do banco ou a service key ainda veria
// token do IXC e senha do Hubsoft em texto puro. Aqui os segredos viram
// AES-256-GCM com a chave do ambiente, que nunca sai do servidor.
//
// Formato guardado:
//   { "__enc": 1, "iv": "...", "tag": "...", "data": "..." }
// Configuração antiga (texto puro) continua sendo lida — o campo __enc é o
// que distingue as duas, então não precisa de migração de dados.

const ALGO = 'aes-256-gcm';

interface EncryptedEnvelope {
  __enc: 1;
  iv: string;
  tag: string;
  data: string;
}

function getKey(): Buffer | null {
  const raw = process.env.ERP_CONFIG_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) return null;
  return key;
}

export function isEncrypted(value: unknown): value is EncryptedEnvelope {
  return !!value && typeof value === 'object' && (value as EncryptedEnvelope).__enc === 1;
}

/** Sem chave configurada, guarda em texto puro e avisa — melhor que perder a config. */
export function encryptErpConfig(config: ErpConfig): Record<string, unknown> {
  const key = getKey();
  if (!key) {
    console.warn(
      '[erp] ERP_CONFIG_ENCRYPTION_KEY ausente ou inválida (esperado 32 bytes em base64). ' +
        'Credenciais serão gravadas sem criptografia.',
    );
    return config as Record<string, unknown>;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(config), 'utf8'), cipher.final()]);

  return {
    __enc: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  } satisfies EncryptedEnvelope;
}

export function decryptErpConfig(stored: unknown): ErpConfig {
  if (!stored || typeof stored !== 'object') return {};
  if (!isEncrypted(stored)) return stored as ErpConfig;

  const key = getKey();
  if (!key) {
    console.error('[erp] config criptografada mas sem chave para abrir — integração vai cair no mock.');
    return {};
  }

  try {
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(stored.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(stored.tag, 'base64'));
    const out = Buffer.concat([
      decipher.update(Buffer.from(stored.data, 'base64')),
      decipher.final(),
    ]);
    return JSON.parse(out.toString('utf8')) as ErpConfig;
  } catch (e) {
    // Chave trocada ou dado corrompido. Não derruba o portal: o adapter cai
    // no mock e o painel mostra a integração como pendente.
    console.error('[erp] falha ao decifrar erp_config', e);
    return {};
  }
}

/** Campos que nunca voltam para o navegador. */
const SECRET_FIELDS: Record<string, string[]> = {
  ixc: ['token'],
  sgp: ['token'],
  hubsoft: ['clientSecret', 'password'],
  mk_solutions: ['password', 'wsPass'],
};

export interface MaskedErpConfig {
  /** Config sem os segredos — só o que é seguro exibir (URLs, usuários). */
  config: Record<string, Record<string, string>>;
  /** Quais segredos já estão salvos, por ERP: { ixc: { token: true } } */
  saved: Record<string, Record<string, boolean>>;
}

/**
 * Prepara a configuração para o formulário: devolve os campos públicos e, no
 * lugar dos segredos, apenas a informação de que existem. O admin só digita
 * de novo o que quiser trocar.
 */
export function maskErpConfig(stored: unknown): MaskedErpConfig {
  const config = decryptErpConfig(stored) as Record<string, Record<string, string>>;
  const out: MaskedErpConfig = { config: {}, saved: {} };

  for (const [erp, block] of Object.entries(config ?? {})) {
    if (!block || typeof block !== 'object') continue;
    const secrets = SECRET_FIELDS[erp] ?? [];
    out.config[erp] = {};
    out.saved[erp] = {};
    for (const [field, value] of Object.entries(block)) {
      if (secrets.includes(field)) {
        out.saved[erp][field] = !!value;
      } else {
        out.config[erp][field] = value as string;
      }
    }
  }
  return out;
}

/**
 * Junta o que o formulário mandou com o que já estava salvo: segredo vazio
 * significa "não mexi nesse campo", então preserva o valor anterior.
 */
export function mergeErpSecrets(
  erpType: string,
  incoming: Record<string, string | undefined>,
  stored: unknown,
): Record<string, string> {
  const previous = (decryptErpConfig(stored) as Record<string, Record<string, string>>)?.[erpType] ?? {};
  const secrets = SECRET_FIELDS[erpType] ?? [];
  const merged: Record<string, string> = {};

  for (const [field, value] of Object.entries(incoming)) {
    if (value === undefined) continue;
    if (secrets.includes(field) && value === '') {
      if (previous[field]) merged[field] = previous[field];
      continue;
    }
    merged[field] = value;
  }

  // Mantém segredos que o formulário nem enviou.
  for (const field of secrets) {
    if (merged[field] === undefined && previous[field]) merged[field] = previous[field];
  }

  return merged;
}
