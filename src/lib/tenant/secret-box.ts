import 'server-only';
import crypto from 'node:crypto';

// Cofre para os segredos do app: a keystore de upload e a senha dela.
//
// Mesma ideia (e mesma chave) da criptografia das credenciais de ERP em
// lib/erp/crypto.ts: quem pegar um dump do banco não leva a chave que assina
// os aplicativos dos provedores. Perder essa chave de assinatura significa
// não conseguir mais atualizar o app publicado — ela é o ativo mais sensível
// deste projeto.

const ALGO = 'aes-256-gcm';

function key(): Buffer {
  const raw = process.env.ERP_CONFIG_ENCRYPTION_KEY;
  if (!raw) throw new Error('ERP_CONFIG_ENCRYPTION_KEY ausente — sem ela não dá pra guardar a keystore.');
  const parsed = Buffer.from(raw, 'base64');
  if (parsed.length !== 32) throw new Error('ERP_CONFIG_ENCRYPTION_KEY precisa ter 32 bytes em base64.');
  return parsed;
}

export function seal(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${data.toString('base64url')}`;
}

export function open(sealed: string | null): string | null {
  if (!sealed) return null;
  const [version, iv, tag, data] = sealed.split('.');
  if (version !== 'v1' || !iv || !tag || !data) return null;
  try {
    const decipher = crypto.createDecipheriv(ALGO, key(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** Senha da keystore. Longa e aleatória: ninguém precisa digitar. */
export function newKeystorePassword() {
  return crypto.randomBytes(24).toString('base64url');
}
