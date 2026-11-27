import 'server-only';
import crypto from 'node:crypto';

// Cofre para os segredos do app: a keystore de upload e a senha dela.
//
// Quem pegar um dump do banco não leva a chave que assina os aplicativos dos
// provedores. Perder essa chave significa não conseguir mais atualizar o app
// publicado: é o ativo mais sensível deste projeto.
//
// Formatos:
//   v2.<iv>.<tag>.<dados>  AES-256-GCM com KEYSTORE_ENCRYPTION_KEY. Tudo que
//                          é gravado sai assim.
//   v1.<iv>.<tag>.<dados>  AES-256-GCM com ERP_CONFIG_ENCRYPTION_KEY, a chave
//                          das credenciais de ERP. Só leitura, até
//                          scripts/recifrar-keystores.mjs passar tudo para v2.
//                          Depois disso, a leitura de v1 pode sair.

const ALGO = 'aes-256-gcm';

type KeyVersion = 'v1' | 'v2';

const KEY_ENV: Record<KeyVersion, string> = {
  v1: 'ERP_CONFIG_ENCRYPTION_KEY',
  v2: 'KEYSTORE_ENCRYPTION_KEY',
};

function key(version: KeyVersion): Buffer {
  const name = KEY_ENV[version];
  const raw = process.env[name];
  if (!raw) throw new Error(`${name} ausente: sem ela não dá para abrir nem guardar a keystore.`);
  const parsed = Buffer.from(raw, 'base64');
  if (parsed.length !== 32) throw new Error(`${name} precisa ter 32 bytes em base64.`);
  return parsed;
}

export function seal(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key('v2'), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v2.${iv.toString('base64url')}.${tag.toString('base64url')}.${data.toString('base64url')}`;
}

export function open(sealed: string | null): string | null {
  if (!sealed) return null;
  const [version, iv, tag, data] = sealed.split('.');
  if ((version !== 'v1' && version !== 'v2') || !iv || !tag || !data) return null;
  try {
    const decipher = crypto.createDecipheriv(ALGO, key(version), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    // Sem detalhe de propósito: a mensagem do erro de cifra não ajuda ninguém
    // e não deve ir para log.
    return null;
  }
}

/** Senha da keystore. Longa e aleatória: ninguém precisa digitar. */
export function newKeystorePassword() {
  return crypto.randomBytes(24).toString('base64url');
}
