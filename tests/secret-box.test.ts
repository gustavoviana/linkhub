import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { sealWith } from '../scripts/keystore-crypto.mjs';
import { open, seal } from '@/lib/tenant/secret-box';

const erp = randomBytes(32);
const ks = randomBytes(32);

beforeEach(() => {
  process.env.ERP_CONFIG_ENCRYPTION_KEY = erp.toString('base64');
  process.env.KEYSTORE_ENCRYPTION_KEY = ks.toString('base64');
});

describe('secret-box', () => {
  it('grava sempre em v2, com a chave própria das keystores', () => {
    const sealed = seal('segredo');
    expect(sealed.startsWith('v2.')).toBe(true);
    expect(open(sealed)).toBe('segredo');
  });

  it('ainda lê v1 (chave do ERP) durante a transição', () => {
    expect(open(sealWith('antigo', erp, 'v1'))).toBe('antigo');
  });

  it('v2 não abre com a chave do ERP', () => {
    const sealed = seal('segredo');
    process.env.KEYSTORE_ENCRYPTION_KEY = erp.toString('base64');
    expect(open(sealed)).toBeNull();
  });

  it('sem KEYSTORE_ENCRYPTION_KEY, não grava', () => {
    delete process.env.KEYSTORE_ENCRYPTION_KEY;
    expect(() => seal('x')).toThrow(/KEYSTORE_ENCRYPTION_KEY ausente/);
  });
});
