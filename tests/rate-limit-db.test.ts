import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Roda a migração 015 de verdade (PGlite) e confere a janela deslizante.

let db: PGlite;

interface Hit {
  allowed: boolean;
  remaining: number;
  retry_after_seconds: number;
}

async function hit(key: string, limit = 3, windowSeconds = 600): Promise<Hit> {
  const r = await db.query<Hit>('select * from rate_limit_hit($1, $2, $3)', [key, limit, windowSeconds]);
  return r.rows[0]!;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec('create role anon nologin; create role authenticated nologin; create role service_role nologin;');
  const sql = readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261127_015_rate_limit.sql'), 'utf8');
  await db.exec(sql);
  await db.exec(sql); // idempotente
});

beforeEach(async () => {
  await db.exec('delete from rate_limit_hits');
});

describe('rate_limit_hit', () => {
  it('deixa passar até o limite e barra o seguinte', async () => {
    expect(await hit('k')).toMatchObject({ allowed: true, remaining: 2 });
    expect(await hit('k')).toMatchObject({ allowed: true, remaining: 1 });
    expect(await hit('k')).toMatchObject({ allowed: true, remaining: 0 });
    const blocked = await hit('k');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retry_after_seconds).toBeGreaterThan(0);
    expect(blocked.retry_after_seconds).toBeLessThanOrEqual(600);
  });

  it('tentativa barrada não conta', async () => {
    for (let i = 0; i < 6; i++) await hit('k');
    const r = await db.query<{ n: number }>(`select count(*)::int as n from rate_limit_hits where key = 'k'`);
    expect(r.rows[0]!.n).toBe(3);
  });

  it('janela deslizante: libera conforme as tentativas antigas saem da janela', async () => {
    await hit('k');
    await hit('k');
    await hit('k');
    // A mais antiga sai da janela; as outras duas continuam.
    await db.exec(`
      update rate_limit_hits set at = now() - interval '11 minutes'
       where id = (select min(id) from rate_limit_hits where key = 'k')
    `);
    expect(await hit('k')).toMatchObject({ allowed: true, remaining: 0 });
    expect((await hit('k')).allowed).toBe(false);
  });

  it('limpa as linhas vencidas, inclusive de chaves que ninguém mais usa', async () => {
    await hit('esquecida');
    await hit('k');
    await db.exec(`update rate_limit_hits set at = now() - interval '2 days' where key = 'esquecida'`);
    await db.exec(`update rate_limit_hits set at = now() - interval '11 minutes' where key = 'k'`);
    await hit('k');
    const r = await db.query<{ key: string }>('select key from rate_limit_hits order by id');
    expect(r.rows.map((x) => x.key)).toEqual(['k']);
  });

  it('chaves diferentes não se misturam', async () => {
    for (let i = 0; i < 3; i++) await hit('app-build:a');
    expect((await hit('app-build:a')).allowed).toBe(false);
    expect((await hit('app-build:b')).allowed).toBe(true);
  });

  it('pedidos simultâneos não passam do limite', async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => hit('k')));
    expect(results.filter((r) => r.allowed)).toHaveLength(3);
  });

  it('recusa parâmetros inválidos', async () => {
    await expect(hit('', 3, 60)).rejects.toThrow(/invalid_key/);
    await expect(hit('k', 0, 60)).rejects.toThrow(/invalid_limit/);
  });
});
