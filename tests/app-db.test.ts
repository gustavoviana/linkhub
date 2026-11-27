import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Roda as migrações 006 e 014 de verdade num Postgres em memória (PGlite),
// sobre o mínimo do schema do Supabase de que elas dependem.

const MIGRATIONS = path.join(__dirname, '..', 'supabase', 'migrations');
const read = (f: string) => readFileSync(path.join(MIGRATIONS, f), 'utf8');

const PRELUDE = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create table tenants (id uuid primary key, name text not null);
create table tenant_admins (tenant_id uuid references tenants(id), user_id uuid, role text);
create function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create function public.user_managed_tenant_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from public.tenant_admins where user_id = auth.uid() and role in ('owner', 'admin');
$$;
`;

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
const USER_A = '00000000-0000-0000-0000-0000000000a1';

let db: PGlite;

interface BuildRow {
  id: string;
  version_code: number;
  version_name: string;
  status: string;
}

async function reserve(tenant: string, name: string, platform = 'android'): Promise<BuildRow> {
  const r = await db.query<BuildRow>('select * from app_reserve_build($1, $2, $3)', [tenant, platform, name]);
  return r.rows[0]!;
}
async function finish(build: string, status: 'done' | 'error') {
  await db.query('select app_finish_build($1, $2)', [build, status]);
}
async function app(tenant: string) {
  const r = await db.query<{ version_code: number; version_name: string; ios_build_number: number }>(
    'select version_code, version_name, ios_build_number from tenant_apps where tenant_id = $1',
    [tenant],
  );
  return r.rows[0]!;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(PRELUDE);
  await db.exec(read('20260729_006_tenant_apps.sql'));
  const m014 = read('20261127_014_app_versions.sql');
  await db.exec(m014);
  // Idempotente: rodar de novo não quebra.
  await db.exec(m014);
});

beforeEach(async () => {
  await db.exec(`
    delete from tenant_app_builds; delete from tenant_apps; delete from tenant_admins; delete from tenants;
    insert into auth.users values ('${USER_A}') on conflict do nothing;
    insert into tenants values ('${A}', 'Provedor A'), ('${B}', 'Provedor B');
    insert into tenant_admins values ('${A}', '${USER_A}', 'owner');
    insert into tenant_apps (tenant_id, app_name, package_id) values
      ('${A}', 'A', 'br.api.linkhub.a'), ('${B}', 'B', 'br.api.linkhub.b');
  `);
});

describe('app_reserve_build', () => {
  it('provedor novo: 1, depois 2', async () => {
    const first = await reserve(A, '1.0.0');
    expect(first.version_code).toBe(1);
    await finish(first.id, 'done');
    const second = await reserve(A, '1.1.0');
    expect(second.version_code).toBe(2);
    await finish(second.id, 'done');
    expect(await app(A)).toMatchObject({ version_code: 2, version_name: '1.1.0' });
  });

  it('pedidos simultâneos nunca repetem número', async () => {
    const builds = await Promise.all(Array.from({ length: 8 }, () => reserve(A, '1.0.0')));
    const codes = builds.map((b) => b.version_code).sort((x, y) => x - y);
    expect(codes).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('o índice único barra número repetido mesmo fora da função', async () => {
    const b = await reserve(A, '1.0.0');
    await expect(
      db.query(`insert into tenant_app_builds (tenant_id, platform, status, version_code) values ($1, 'android', 'queued', $2)`, [
        A,
        b.version_code,
      ]),
    ).rejects.toThrow(/uq_app_builds_code/);
  });

  it('build que falhou não consome número', async () => {
    const failed = await reserve(A, '1.0.0');
    await finish(failed.id, 'error');
    expect((await app(A)).version_code).toBe(0);
    const retry = await reserve(A, '1.0.0');
    expect(retry.version_code).toBe(1);
  });

  it('número de build concluído nunca volta', async () => {
    const one = await reserve(A, '1.0.0');
    const two = await reserve(A, '1.0.0');
    await finish(two.id, 'done');
    await finish(one.id, 'done');
    expect((await app(A)).version_code).toBe(2);
    expect((await reserve(A, '1.1.0')).version_code).toBe(3);
  });

  it('Fibra NET: piso da loja 30011 → 30012', async () => {
    await db.query(`update tenant_apps set version_code = 1, store_version_floor = 30011 where tenant_id = $1`, [A]);
    expect((await reserve(A, '3.1.0')).version_code).toBe(30012);
  });

  it('LM NET: continua de 3 para 4', async () => {
    await db.query(`update tenant_apps set version_code = 3, version_name = '1.0.2' where tenant_id = $1`, [A]);
    expect((await reserve(A, '1.1.0')).version_code).toBe(4);
  });

  it('iOS tem contador próprio', async () => {
    await db.query(`update tenant_apps set version_code = 40 where tenant_id = $1`, [A]);
    const ios = await reserve(A, '1.0.0', 'ios');
    expect(ios.version_code).toBe(1);
    await finish(ios.id, 'done');
    expect(await app(A)).toMatchObject({ version_code: 40, ios_build_number: 1 });
  });

  it('provedores diferentes não se misturam', async () => {
    await reserve(A, '1.0.0');
    await reserve(A, '1.0.0');
    expect((await reserve(B, '1.0.0')).version_code).toBe(1);
  });

  it('build esquecido há mais de 3 horas é encerrado e libera o número', async () => {
    const stale = await reserve(A, '1.0.0');
    await db.query(`update tenant_app_builds set created_at = now() - interval '4 hours' where id = $1`, [stale.id]);
    const next = await reserve(A, '1.0.0');
    expect(next.version_code).toBe(1);
    const r = await db.query<{ status: string }>('select status from tenant_app_builds where id = $1', [stale.id]);
    expect(r.rows[0]!.status).toBe('error');
  });

  it('não encerra build já encerrado', async () => {
    const b = await reserve(A, '1.0.0');
    await finish(b.id, 'done');
    await expect(finish(b.id, 'error')).rejects.toThrow(/build_already_finished/);
  });

  it('recusa versionName fora do formato e piso fora da faixa', async () => {
    await expect(reserve(A, 'v1')).rejects.toThrow(/invalid_version_name/);
    await expect(db.query(`update tenant_apps set store_version_floor = 2100000000 where tenant_id = $1`, [A])).rejects.toThrow(
      /tenant_apps_store_floor_range/,
    );
  });
});

describe('trava do identificador do pacote', () => {
  async function publishOne() {
    const b = await reserve(A, '1.0.0');
    await finish(b.id, 'done');
    await db.query('update tenant_app_builds set published_at = now() where id = $1', [b.id]);
  }

  it('livre enquanto nada foi publicado', async () => {
    const b = await reserve(A, '1.0.0');
    await finish(b.id, 'done');
    await db.query(`update tenant_apps set package_id = 'br.com.a.novo' where tenant_id = $1`, [A]);
  });

  it('bloqueado no banco depois de publicado', async () => {
    await publishOne();
    await expect(
      db.query(`update tenant_apps set package_id = 'br.com.a.novo' where tenant_id = $1`, [A]),
    ).rejects.toThrow(/package_locked/);
  });

  it('a função do super administrador troca, e a trava volta logo depois', async () => {
    await publishOne();
    await db.query(`select app_change_locked_package($1, 'br.com.a.novo')`, [A]);
    const r = await db.query<{ package_id: string }>('select package_id from tenant_apps where tenant_id = $1', [A]);
    expect(r.rows[0]!.package_id).toBe('br.com.a.novo');
    await expect(
      db.query(`update tenant_apps set package_id = 'br.com.a.outro' where tenant_id = $1`, [A]),
    ).rejects.toThrow(/package_locked/);
  });

  it('formato inválido é recusado no banco', async () => {
    await expect(db.query(`update tenant_apps set package_id = 'Invalido' where tenant_id = $1`, [A])).rejects.toThrow(
      /tenant_apps_package_format/,
    );
  });
});

describe('isolamento por provedor (RLS)', () => {
  it('admin de A lê só os builds de A, e não lê tenant_apps', async () => {
    await reserve(A, '1.0.0');
    await reserve(B, '1.0.0');
    await db.exec(`
      grant usage on schema public, auth to authenticated;
      grant select on tenant_app_builds, tenant_apps to authenticated;
      grant execute on function auth.uid() to authenticated;
    `);
    await db.exec(`set request.jwt.claim.sub = '${USER_A}'; set role authenticated;`);
    try {
      const builds = await db.query<{ tenant_id: string }>('select tenant_id from tenant_app_builds');
      expect(builds.rows.map((r) => r.tenant_id)).toEqual([A]);
      const apps = await db.query('select * from tenant_apps');
      expect(apps.rows).toHaveLength(0);
      await expect(db.query(`select app_reserve_build($1, 'android', '1.0.0')`, [A])).rejects.toThrow(
        /permission denied/,
      );
    } finally {
      await db.exec('reset role; reset request.jwt.claim.sub;');
    }
  });
});
