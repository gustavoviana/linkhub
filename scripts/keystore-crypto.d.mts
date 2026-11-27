// Tipos de keystore-crypto.mjs, para os testes em TypeScript strict.

export class KeystoreError extends Error {
  code: string;
  constructor(code: string);
}

export interface Keys {
  v1?: Buffer;
  v2?: Buffer;
}

export interface KeystoreRow {
  keystore_data: string | null;
  keystore_password: string | null;
  keystore_sha256: string | null;
  keystore_alias: string;
  upload_cert_pem: string | null;
}

export interface RowPlan {
  action: 'skip' | 'update';
  patch: { keystore_data?: string; keystore_password?: string; upload_cert_pem?: string };
  sha256: string | null;
}

export function parseKey(raw: string | undefined, name: string): Buffer;
export function versionOf(sealed: string | null | undefined): 'v1' | 'v2' | 'desconhecida' | null;
export function sealWith(plain: string, key: Buffer, version: 'v1' | 'v2'): string;
export function openWith(sealed: string, keys: Keys): string;
export function normalizeFingerprint(value: string | null | undefined): string;
export function inspectKeystore(keystoreBase64: string, password: string, alias: string): { certPem: string; sha256: string };
export function planRow(row: KeystoreRow, keys: Keys & { v2: Buffer }): RowPlan;

export interface BackupComparable {
  tenant_id: string;
  keystore_data: string | null;
  keystore_password: string | null;
  keystore_sha256: string | null;
}
export function verifyRowV2(row: KeystoreRow, v2: Buffer): { sha256: string };
export function missingBackups(current: BackupComparable[], backups: BackupComparable[]): string[];
