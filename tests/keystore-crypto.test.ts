import { X509Certificate, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import forge from 'node-forge';
import { describe, expect, it } from 'vitest';
import {
  inspectKeystore,
  missingBackups,
  openWith,
  planRow,
  sealWith,
  verifyRowV2,
  versionOf,
} from '../scripts/keystore-crypto.mjs';

// Keystore de teste gerada com `keytool -genkeypair -storetype PKCS12` (o
// mesmo comando do workflow). Não assina nada de verdade.
const FIX = path.join(__dirname, 'fixtures');
const P12_B64 = readFileSync(path.join(FIX, 'upload-test.p12')).toString('base64');
const PEM = readFileSync(path.join(FIX, 'upload-test.pem'), 'utf8');
const SHA = readFileSync(path.join(FIX, 'upload-test.sha256'), 'utf8').trim();
const PASS = 'senha-de-teste-nao-secreta';

const v1 = randomBytes(32);
const v2 = randomBytes(32);

function legacyRow() {
  return {
    keystore_data: sealWith(P12_B64, v1, 'v1'),
    keystore_password: sealWith(PASS, v1, 'v1'),
    keystore_sha256: SHA,
    keystore_alias: 'linkhub',
    upload_cert_pem: null as string | null,
  };
}

describe('inspectKeystore', () => {
  it('o certificado extraído confere com o SHA-256 do keytool e com o -exportcert', () => {
    const info = inspectKeystore(P12_B64, PASS, 'linkhub');
    expect(info.sha256).toBe(SHA);
    expect(new X509Certificate(info.certPem).fingerprint256).toBe(new X509Certificate(PEM).fingerprint256);
  });

  it('senha errada não abre', () => {
    expect(() => inspectKeystore(P12_B64, 'errada', 'linkhub')).toThrow('keystore_nao_abre');
  });
});

describe('planRow (recifragem)', () => {
  it('passa v1 para v2 e extrai o certificado', () => {
    const plan = planRow(legacyRow(), { v1, v2 });
    expect(plan.action).toBe('update');
    expect(versionOf(plan.patch.keystore_data)).toBe('v2');
    expect(versionOf(plan.patch.keystore_password)).toBe('v2');
    const { keystore_data, keystore_password, upload_cert_pem } = plan.patch;
    if (!keystore_data || !keystore_password || !upload_cert_pem) throw new Error('patch incompleto');
    // Decifra só com a chave nova.
    expect(openWith(keystore_data, { v2 })).toBe(P12_B64);
    expect(openWith(keystore_password, { v2 })).toBe(PASS);
    expect(new X509Certificate(upload_cert_pem).fingerprint256).toBe(SHA);
  });

  it('é idempotente: linha já em v2 e com certificado não muda', () => {
    const first = planRow(legacyRow(), { v1, v2 });
    const migrated = { ...legacyRow(), ...first.patch };
    const second = planRow(migrated, { v1, v2 });
    expect(second.action).toBe('skip');
    expect(second.patch).toEqual({});
    // Nem precisa mais da chave antiga.
    expect(planRow(migrated, { v2 }).action).toBe('skip');
  });

  it('para se o SHA-256 gravado não confere com a keystore', () => {
    const row = { ...legacyRow(), keystore_sha256: SHA.replace(/^../, SHA.startsWith('00') ? '11' : '00') };
    expect(() => planRow(row, { v1, v2 })).toThrow('sha256_nao_confere');
  });

  it('para se a chave antiga estiver errada', () => {
    expect(() => planRow(legacyRow(), { v1: randomBytes(32), v2 })).toThrow('nao_decifra_v1');
  });

  it('senha sem keystore (build nunca terminou) só recifra a senha', () => {
    const row = { ...legacyRow(), keystore_data: null, keystore_sha256: null };
    const plan = planRow(row, { v1, v2 });
    expect(Object.keys(plan.patch)).toEqual(['keystore_password']);
  });
});

describe('verifyRowV2 (conferência depois de gravar)', () => {
  function migrated() {
    return { ...legacyRow(), ...planRow(legacyRow(), { v1, v2 }).patch };
  }

  it('abre só com a chave nova e confere SHA-256 e certificado', () => {
    expect(verifyRowV2(migrated(), v2).sha256).toBe(SHA);
  });

  it('recusa linha que ainda está em v1', () => {
    expect(() => verifyRowV2({ ...legacyRow(), upload_cert_pem: PEM }, v2)).toThrow('ainda_nao_e_v2');
  });

  it('recusa chave nova errada', () => {
    expect(() => verifyRowV2(migrated(), randomBytes(32))).toThrow('nao_decifra_v2');
  });

  it('recusa certificado válido de outra chave', () => {
    const keys = forge.pki.rsa.generateKeyPair({ bits: 1024, e: 0x10001 });
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date(Date.now() + 86_400_000);
    cert.setSubject([{ name: 'commonName', value: 'outra' }]);
    cert.setIssuer([{ name: 'commonName', value: 'outra' }]);
    cert.sign(keys.privateKey, forge.md.sha256.create());
    const other = forge.pki.certificateToPem(cert);
    expect(() => verifyRowV2({ ...migrated(), upload_cert_pem: other }, v2)).toThrow('certificado_nao_confere');
  });

  it('recusa certificado corrompido', () => {
    expect(() => verifyRowV2({ ...migrated(), upload_cert_pem: 'lixo' }, v2)).toThrow('certificado_corrompido');
  });

  it('recusa sem certificado extraído', () => {
    expect(() => verifyRowV2({ ...migrated(), upload_cert_pem: null }, v2)).toThrow('certificado_nao_extraido');
  });
});

describe('missingBackups', () => {
  const a = { tenant_id: 'a', keystore_data: 'v1.x', keystore_password: 'v1.p', keystore_sha256: 'AA' };
  const b = { tenant_id: 'b', keystore_data: 'v1.y', keystore_password: 'v1.q', keystore_sha256: 'BB' };

  it('backup completo e exato: nada falta', () => {
    expect(missingBackups([a, b], [b, a])).toEqual([]);
  });

  it('aponta quem não tem cópia ou tem cópia diferente', () => {
    expect(missingBackups([a, b], [a])).toEqual(['b']);
    expect(missingBackups([a, b], [a, { ...b, keystore_data: 'v1.outro' }])).toEqual(['b']);
    expect(missingBackups([a], [{ ...a, tenant_id: 'b' }])).toEqual(['a']);
  });
});
