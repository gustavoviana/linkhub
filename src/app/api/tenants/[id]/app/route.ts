import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTenantApi } from '@/lib/auth/api-guard';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { ensureTenantApp, hasPublishedBuild, APP_TABLE_MISSING } from '@/lib/tenant/app-store-db';
import { checkPackageChange, PACKAGE_ID, PACKAGE_ID_MAX } from '@/lib/tenant/app-rules';
import { MAX_VERSION_CODE, SEMVER } from '@/lib/tenant/app-version';
import { auditApp } from '@/lib/tenant/app-audit';

// Ficha do aplicativo do provedor.

export const runtime = 'nodejs';

const HEX = /^#[0-9a-fA-F]{6}$/;
const SHA256 = /^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$/;
const SEMVER_MSG = 'Use o formato 1.2.3, só com números.';

const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);
const semverField = z.preprocess(emptyToNull, z.string().trim().regex(SEMVER, SEMVER_MSG).nullable().optional());

const schema = z
  .object({
    app_name: z.string().trim().min(1).max(30),
    package_id: z
      .string()
      .trim()
      .max(PACKAGE_ID_MAX, `O pacote tem no máximo ${PACKAGE_ID_MAX} caracteres.`)
      .regex(PACKAGE_ID, 'Pacote inválido. Use algo como br.com.provedor.central.'),
    /** Pacote novo digitado de novo: exigido para trocar o de um app publicado. */
    confirm_package_id: z.string().trim().max(PACKAGE_ID_MAX).nullable().optional(),
    icon_url: z.string().url().nullable().optional(),
    theme_color: z.string().regex(HEX).nullable().optional(),
    background_color: z.string().regex(HEX).nullable().optional(),
    play_signing_sha256: z.preprocess(
      emptyToNull,
      z
        .string()
        .trim()
        .regex(SHA256, 'A impressão digital tem 32 pares hexadecimais separados por “:”.')
        .nullable()
        .optional(),
    ),
    next_version_name: semverField,
    store_version_name: semverField,
    ios_next_version_name: semverField,
    store_version_floor: z.coerce
      .number()
      .int('O código de versão é um número inteiro.')
      .min(0, 'O código de versão não pode ser negativo.')
      .max(MAX_VERSION_CODE - 1, 'A Play aceita código de versão até 2100000000.')
      .optional(),
  })
  .strict();

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTenantApi(id, 'admin');
  if (auth.error) return auth.error;

  const supabase = auth.admin;
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) return NextResponse.json({ error: 'Provedor não encontrado.' }, { status: 404 });

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }
  const input = body.data;

  try {
    const app = await ensureTenantApp(tenant);

    // Trocar o pacote depois de publicar cria um app novo na loja e abandona
    // o antigo, com os usuários dentro. A regra vale aqui e no banco (trigger
    // da migração 014).
    const published = await hasPublishedBuild(id);
    const pkg = checkPackageChange({
      current: app.package_id,
      next: input.package_id,
      published,
      isPlatformAdmin: auth.viaPlatform,
      confirmation: input.confirm_package_id,
    });
    if (!pkg.ok) return NextResponse.json({ error: pkg.error }, { status: pkg.status });

    const storeFloor = input.store_version_floor ?? app.store_version_floor;
    const patch = {
      app_name: input.app_name,
      icon_url: input.icon_url ?? null,
      theme_color: input.theme_color ?? null,
      background_color: input.background_color ?? null,
      play_signing_sha256: input.play_signing_sha256?.toUpperCase() ?? null,
      next_version_name: input.next_version_name === undefined ? app.next_version_name : input.next_version_name,
      store_version_name:
        input.store_version_name === undefined ? app.store_version_name : input.store_version_name,
      ios_next_version_name:
        input.ios_next_version_name === undefined ? app.ios_next_version_name : input.ios_next_version_name,
      store_version_floor: storeFloor,
      ...(pkg.mode === 'free' ? { package_id: input.package_id } : {}),
    };

    const { error } = await supabase.from('tenant_apps').update(patch as never).eq('tenant_id', id);
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Esse pacote já é usado por outro provedor.' }, { status: 409 });
      }
      if (error.message?.includes('package_locked')) {
        return NextResponse.json(
          { error: 'O app já foi publicado. Trocar o pacote criaria outro app na loja.' },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: 'Não foi possível salvar a ficha.' }, { status: 400 });
    }

    if (pkg.mode === 'override') {
      const { error: overrideError } = await supabase.rpc('app_change_locked_package' as never, {
        p_tenant: id,
        p_package: input.package_id,
      } as never);
      if (overrideError) {
        const taken = overrideError.code === '23505';
        return NextResponse.json(
          { error: taken ? 'Esse pacote já é usado por outro provedor.' : 'Não foi possível trocar o pacote.' },
          { status: taken ? 409 : 500 },
        );
      }
      await auditApp({
        tenantId: id,
        actorUserId: auth.userId,
        action: 'app.package_override',
        metadata: { from: app.package_id, to: input.package_id, published: true },
      });
    } else if (pkg.mode === 'free') {
      await auditApp({
        tenantId: id,
        actorUserId: auth.userId,
        action: 'app.package_changed',
        metadata: { from: app.package_id, to: input.package_id },
      });
    }

    const versionChanged =
      patch.next_version_name !== app.next_version_name ||
      patch.store_version_name !== app.store_version_name ||
      patch.ios_next_version_name !== app.ios_next_version_name ||
      patch.store_version_floor !== app.store_version_floor;
    if (versionChanged) {
      await auditApp({
        tenantId: id,
        actorUserId: auth.userId,
        action: 'app.version_changed',
        metadata: {
          next_version_name: patch.next_version_name,
          store_version_floor: patch.store_version_floor,
          store_version_name: patch.store_version_name,
          ios_next_version_name: patch.ios_next_version_name,
          previous_store_version_floor: app.store_version_floor,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === APP_TABLE_MISSING) {
      return NextResponse.json({ error: 'Rode a migração 006 no banco antes.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Falha ao salvar.' }, { status: 500 });
  }
}
