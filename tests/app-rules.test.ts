import { describe, expect, it } from 'vitest';
import {
  buildBlockReason,
  checkPackageChange,
  isValidPackageId,
  migrationSteps,
  type MigrationState,
} from '@/lib/tenant/app-rules';

describe('isValidPackageId', () => {
  it('aceita pacotes reais', () => {
    expect(isValidPackageId('com.app.w5f7d39aa2b6d9551370a2582')).toBe(true);
    expect(isValidPackageId('br.api.linkhub.lmnet')).toBe(true);
  });

  it('recusa formato inválido', () => {
    for (const bad of ['lmnet', 'Br.api.x', 'br.1api.x', 'br..x', 'br.api.', 'br.api-x.y']) {
      expect(isValidPackageId(bad), bad).toBe(false);
    }
  });

  it('recusa acima de 150 caracteres', () => {
    const long = `br.${'a'.repeat(147)}`;
    expect(long.length).toBe(150);
    expect(isValidPackageId(long)).toBe(true);
    expect(isValidPackageId(`${long}b`)).toBe(false);
  });
});

describe('checkPackageChange', () => {
  const base = { current: 'br.api.linkhub.lmnet', next: 'br.com.lmnet.app', confirmation: null };

  it('sem build publicado, troca livre (mesmo com keystore)', () => {
    expect(checkPackageChange({ ...base, published: false, isPlatformAdmin: false })).toEqual({
      ok: true,
      mode: 'free',
    });
  });

  it('publicado: admin do provedor não troca', () => {
    const r = checkPackageChange({ ...base, published: true, isPlatformAdmin: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });

  it('publicado: super administrador precisa confirmar digitando o pacote novo', () => {
    const semConfirmar = checkPackageChange({ ...base, published: true, isPlatformAdmin: true });
    expect(semConfirmar.ok).toBe(false);
    const errado = checkPackageChange({ ...base, published: true, isPlatformAdmin: true, confirmation: 'br.com.outro' });
    expect(errado.ok).toBe(false);
    const certo = checkPackageChange({
      ...base,
      published: true,
      isPlatformAdmin: true,
      confirmation: 'br.com.lmnet.app',
    });
    expect(certo).toEqual({ ok: true, mode: 'override' });
  });

  it('mesmo pacote nunca é bloqueado', () => {
    expect(
      checkPackageChange({ ...base, next: base.current, published: true, isPlatformAdmin: false }),
    ).toEqual({ ok: true, mode: 'unchanged' });
  });

  it('pacote inválido é recusado antes de tudo', () => {
    const r = checkPackageChange({ ...base, next: 'invalido', published: false, isPlatformAdmin: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });
});

describe('migração', () => {
  const off: MigrationState = {
    migration_enabled: false,
    package_id: 'com.app.w5f7d39aa2b6d9551370a2582',
    store_version_floor: 0,
    migration_pem_downloaded_at: null,
    migration_reset_requested_at: null,
    migration_reset_approved_at: null,
    play_signing_sha256: null,
  };

  it('sem migração ligada, o build não é bloqueado', () => {
    expect(buildBlockReason(off)).toBeNull();
  });

  it('bloqueia até o passo 3 ser concluído', () => {
    const on = { ...off, migration_enabled: true };
    expect(buildBlockReason(on)).toMatch(/código de versão/);
    const comPiso = { ...on, store_version_floor: 30011 };
    expect(buildBlockReason(comPiso)).toMatch(/Peça a redefinição/);
    const pedido = { ...comPiso, migration_reset_requested_at: '2026-11-27T10:00:00Z' };
    expect(buildBlockReason(pedido)).toMatch(/Aguarde o Google/);
    const aprovado = { ...pedido, migration_reset_approved_at: '2026-11-29T10:00:00Z' };
    expect(buildBlockReason(aprovado)).toBeNull();
  });

  it('marca os passos concluídos', () => {
    const steps = migrationSteps({
      ...off,
      migration_enabled: true,
      store_version_floor: 30011,
      migration_pem_downloaded_at: '2026-11-27T10:00:00Z',
    });
    expect(steps.map((s) => [s.key, s.done])).toEqual([
      ['package', true],
      ['certificate', true],
      ['reset', false],
      ['signing', false],
      ['build', false],
    ]);
  });
});
