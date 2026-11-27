import { describe, expect, it } from 'vitest';
import {
  bumpMinor,
  compareSemver,
  isSemver,
  nextIosVersion,
  nextVersion,
  type AndroidVersionState,
} from '@/lib/tenant/app-version';

const fresh: AndroidVersionState = {
  version_code: 0,
  version_name: '1.0.0',
  store_version_floor: 0,
  store_version_name: null,
  next_version_name: null,
};

describe('nextVersion', () => {
  it('provedor novo: o primeiro build sai 1.0.0 (1)', () => {
    expect(nextVersion(fresh)).toEqual({ version_code: 1, version_name: '1.0.0' });
  });

  it('provedor novo: o segundo build sai 1.1.0 (2)', () => {
    const afterFirst = { ...fresh, version_code: 1, version_name: '1.0.0' };
    expect(nextVersion(afterFirst)).toEqual({ version_code: 2, version_name: '1.1.0' });
  });

  it('Fibra NET: piso 30011 (3.0.11) sai 3.1.0 (30012)', () => {
    // Estado real: o LinkHub já gerou 1.0.0 (1), que nunca foi para a loja.
    const fibra = {
      ...fresh,
      version_code: 1,
      version_name: '1.0.0',
      store_version_floor: 30011,
      store_version_name: '3.0.11',
    };
    expect(nextVersion(fibra)).toEqual({ version_code: 30012, version_name: '3.1.0' });
  });

  it('LM NET: continua de onde parou (1.0.2 (3) → 4)', () => {
    const lm = { ...fresh, version_code: 3, version_name: '1.0.2' };
    expect(nextVersion(lm)).toEqual({ version_code: 4, version_name: '1.1.0' });
  });

  it('Marau Net: continua de onde parou (1.0.0 (1) → 2)', () => {
    const marau = { ...fresh, version_code: 1, version_name: '1.0.0' };
    expect(nextVersion(marau).version_code).toBe(2);
  });

  it('piso abaixo do que o LinkHub já gerou não volta o número', () => {
    const app = { ...fresh, version_code: 40, version_name: '2.3.0', store_version_floor: 12, store_version_name: '1.2.0' };
    expect(nextVersion(app)).toEqual({ version_code: 41, version_name: '2.4.0' });
  });

  it('piso sem versionName da loja usa a última do LinkHub', () => {
    const app = { ...fresh, version_code: 1, version_name: '1.0.0', store_version_floor: 500 };
    expect(nextVersion(app)).toEqual({ version_code: 501, version_name: '1.1.0' });
  });

  it('versão escolhida pelo admin vence o automático', () => {
    const app = { ...fresh, version_code: 3, version_name: '1.0.2', next_version_name: '2.0.0' };
    expect(nextVersion(app)).toEqual({ version_code: 4, version_name: '2.0.0' });
  });

  it('versão escolhida inválida é ignorada', () => {
    const app = { ...fresh, version_code: 3, version_name: '1.0.2', next_version_name: 'v2' };
    expect(nextVersion(app).version_name).toBe('1.1.0');
  });
});

describe('nextIosVersion', () => {
  it('tem contador próprio, separado do Android', () => {
    expect(nextIosVersion({ ios_build_number: 0, ios_version_name: '1.0.0', ios_next_version_name: null })).toEqual({
      version_code: 1,
      version_name: '1.0.0',
    });
    expect(nextIosVersion({ ios_build_number: 1, ios_version_name: '1.0.0', ios_next_version_name: null })).toEqual({
      version_code: 2,
      version_name: '1.1.0',
    });
    expect(nextIosVersion({ ios_build_number: 7, ios_version_name: '1.6.0', ios_next_version_name: '3.0.0' })).toEqual({
      version_code: 8,
      version_name: '3.0.0',
    });
  });
});

describe('semver', () => {
  it('aceita só MAJOR.MINOR.PATCH numérico', () => {
    expect(isSemver('3.1.0')).toBe(true);
    expect(isSemver('3.1')).toBe(false);
    expect(isSemver('3.1.0-beta')).toBe(false);
    expect(isSemver('v3.1.0')).toBe(false);
  });

  it('bumpMinor zera o patch', () => {
    expect(bumpMinor('3.0.11')).toBe('3.1.0');
    expect(bumpMinor('lixo')).toBe('1.0.0');
  });

  it('compareSemver compara número a número', () => {
    expect(compareSemver('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
  });
});
