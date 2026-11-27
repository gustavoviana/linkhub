// Cifra e leitura das keystores, para scripts que rodam fora do Next
// (recifrar-keystores.mjs) e para os testes. Mesmo formato de
// src/lib/tenant/secret-box.ts:
//
//   v1.<iv>.<tag>.<dados>  AES-256-GCM, chave ERP_CONFIG_ENCRYPTION_KEY (antiga)
//   v2.<iv>.<tag>.<dados>  AES-256-GCM, chave KEYSTORE_ENCRYPTION_KEY (nova)
//
// Nada aqui escreve segredo em log. Erros saem com código, sem o valor.

import crypto from 'node:crypto';
import forge from 'node-forge';

const ALGO = 'aes-256-gcm';

export class KeystoreError extends Error {
  /** @param {string} code */
  constructor(code) {
    super(code);
    this.code = code;
  }
}

/** @param {string | undefined} raw @param {string} name */
export function parseKey(raw, name) {
  if (!raw) throw new KeystoreError(`${name}_ausente`);
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new KeystoreError(`${name}_tamanho`);
  return key;
}

/** @param {string | null} sealed */
export function versionOf(sealed) {
  if (!sealed) return null;
  const v = sealed.split('.')[0];
  return v === 'v1' || v === 'v2' ? v : 'desconhecida';
}

/** @param {string} plain @param {Buffer} key @param {'v1' | 'v2'} version */
export function sealWith(plain, key, version) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${version}.${iv.toString('base64url')}.${tag.toString('base64url')}.${data.toString('base64url')}`;
}

/**
 * @param {string} sealed
 * @param {{ v1?: Buffer, v2?: Buffer }} keys
 * @returns {string}
 */
export function openWith(sealed, keys) {
  const [version, iv, tag, data] = sealed.split('.');
  if ((version !== 'v1' && version !== 'v2') || !iv || !tag || !data) throw new KeystoreError('formato_invalido');
  const key = keys[version];
  if (!key) throw new KeystoreError(`sem_chave_${version}`);
  try {
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    throw new KeystoreError(`nao_decifra_${version}`);
  }
}

/** "AB:CD:…" maiúsculo, para comparar impressões digitais. */
export function normalizeFingerprint(value) {
  return String(value ?? '').trim().toUpperCase();
}

/**
 * Abre a keystore PKCS12 e devolve o certificado do alias.
 * @param {string} keystoreBase64
 * @param {string} password
 * @param {string} alias
 * @returns {{ certPem: string, sha256: string }}
 */
export function inspectKeystore(keystoreBase64, password, alias) {
  let p12;
  try {
    const der = Buffer.from(keystoreBase64, 'base64').toString('binary');
    p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(der), false, password);
  } catch {
    // Senha errada, MAC que não confere ou arquivo que não é PKCS12.
    throw new KeystoreError('keystore_nao_abre');
  }
  const bags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
  const bag =
    bags.find((b) => (b.attributes?.friendlyName ?? []).includes(alias)) ?? (bags.length === 1 ? bags[0] : null);
  if (!bag?.cert) throw new KeystoreError('certificado_ausente');
  const certPem = forge.pki.certificateToPem(bag.cert).trim();
  const sha256 = new crypto.X509Certificate(certPem).fingerprint256.toUpperCase();
  return { certPem, sha256 };
}

/**
 * Decide o que fazer com uma linha de tenant_apps. Puro: não lê nem grava
 * banco. Devolve os valores novos só depois de conferir que a keystore
 * decifrada abre e bate com o SHA-256 gravado, e que o valor recifrado
 * decifra de volta igual.
 *
 * @param {{
 *   keystore_data: string | null,
 *   keystore_password: string | null,
 *   keystore_sha256: string | null,
 *   keystore_alias: string,
 *   upload_cert_pem: string | null,
 * }} row
 * @param {{ v1?: Buffer, v2: Buffer }} keys
 * @returns {{
 *   action: 'skip' | 'update',
 *   patch: { keystore_data?: string, keystore_password?: string, upload_cert_pem?: string },
 *   sha256: string | null,
 * }}
 */
export function planRow(row, keys) {
  const patch = {};
  const password = row.keystore_password ? openWith(row.keystore_password, keys) : null;
  const keystore = row.keystore_data ? openWith(row.keystore_data, keys) : null;

  let sha256 = null;
  let certPem = null;
  if (keystore) {
    if (!password) throw new KeystoreError('keystore_sem_senha');
    const info = inspectKeystore(keystore, password, row.keystore_alias);
    if (!row.keystore_sha256) throw new KeystoreError('sha256_nao_gravado');
    if (info.sha256 !== normalizeFingerprint(row.keystore_sha256)) throw new KeystoreError('sha256_nao_confere');
    sha256 = info.sha256;
    certPem = info.certPem;
  }

  if (row.keystore_password && versionOf(row.keystore_password) !== 'v2') {
    patch.keystore_password = sealWith(password, keys.v2, 'v2');
    if (openWith(patch.keystore_password, { v2: keys.v2 }) !== password) throw new KeystoreError('recifra_senha_falhou');
  }
  if (row.keystore_data && versionOf(row.keystore_data) !== 'v2') {
    patch.keystore_data = sealWith(keystore, keys.v2, 'v2');
    const back = openWith(patch.keystore_data, { v2: keys.v2 });
    if (back !== keystore) throw new KeystoreError('recifra_keystore_falhou');
    // Confere de novo a partir do valor novo, com a senha também decifrada
    // do valor novo quando ela mudou.
    const pass2 = patch.keystore_password ? openWith(patch.keystore_password, { v2: keys.v2 }) : password;
    if (inspectKeystore(back, pass2, row.keystore_alias).sha256 !== sha256) {
      throw new KeystoreError('recifra_sha256_nao_confere');
    }
  }
  if (certPem && !row.upload_cert_pem) patch.upload_cert_pem = certPem;

  return { action: Object.keys(patch).length ? 'update' : 'skip', patch, sha256 };
}

/**
 * Conferência depois de recifrar: a linha tem que abrir SÓ com a chave nova,
 * a keystore tem que bater com o SHA-256 gravado e o certificado guardado
 * (upload_cert_pem) tem que ter a mesma impressão digital.
 *
 * @param {{
 *   keystore_data: string | null,
 *   keystore_password: string | null,
 *   keystore_sha256: string | null,
 *   keystore_alias: string,
 *   upload_cert_pem: string | null,
 * }} row
 * @param {Buffer} v2
 * @returns {{ sha256: string }}
 */
export function verifyRowV2(row, v2) {
  if (!row.keystore_data || !row.keystore_password) throw new KeystoreError('sem_keystore');
  if (versionOf(row.keystore_data) !== 'v2' || versionOf(row.keystore_password) !== 'v2') {
    throw new KeystoreError('ainda_nao_e_v2');
  }
  const password = openWith(row.keystore_password, { v2 });
  const keystore = openWith(row.keystore_data, { v2 });
  const { sha256 } = inspectKeystore(keystore, password, row.keystore_alias);
  if (sha256 !== normalizeFingerprint(row.keystore_sha256)) throw new KeystoreError('sha256_nao_confere');
  if (!row.upload_cert_pem) throw new KeystoreError('certificado_nao_extraido');
  let pemSha;
  try {
    pemSha = new crypto.X509Certificate(row.upload_cert_pem).fingerprint256.toUpperCase();
  } catch {
    throw new KeystoreError('certificado_corrompido');
  }
  if (pemSha !== sha256) throw new KeystoreError('certificado_nao_confere');
  return { sha256 };
}

/**
 * Quais provedores NÃO têm no backup uma cópia exata (keystore, senha e
 * SHA-256) dos valores atuais. Lista vazia = backup completo.
 *
 * @param {Array<{ tenant_id: string, keystore_data: string | null, keystore_password: string | null, keystore_sha256: string | null }>} current
 * @param {Array<{ tenant_id: string, keystore_data: string | null, keystore_password: string | null, keystore_sha256: string | null }>} backups
 * @returns {string[]}
 */
export function missingBackups(current, backups) {
  return current
    .filter(
      (c) =>
        !backups.some(
          (b) =>
            b.tenant_id === c.tenant_id &&
            b.keystore_data === c.keystore_data &&
            b.keystore_password === c.keystore_password &&
            b.keystore_sha256 === c.keystore_sha256,
        ),
    )
    .map((c) => c.tenant_id);
}
