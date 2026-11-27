import { NextResponse, type NextRequest } from 'next/server';
import { requireTenantApi } from '@/lib/auth/api-guard';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { rateLimitResponse } from '@/lib/rate-limit-shared';
import { ensureTenantApp, finishBuild, reserveBuild, APP_TABLE_MISSING } from '@/lib/tenant/app-store-db';
import { tenantOrigin } from '@/lib/tenant/app-config';
import { nextVersion } from '@/lib/tenant/app-version';
import { buildBlockReason } from '@/lib/tenant/app-rules';
import { storeVersionSourceFor } from '@/lib/tenant/store-version-source';
import { auditApp } from '@/lib/tenant/app-audit';
import { createBuildToken } from '@/lib/tenant/build-token';
import { newKeystorePassword, seal } from '@/lib/tenant/secret-box';

// Dispara o build do Android.
//
// O trabalho pesado (Gradle, SDK do Android, assinatura) roda no GitHub
// Actions: a função da Vercel só reserva a versão, registra o build e chuta
// a bola. O runner volta com o .aab pela API de callback, e só aí a versão
// conta como usada.

export const runtime = 'nodejs';

const REPO = process.env.GITHUB_BUILD_REPO ?? 'gustavoviana/linkhub';
const WORKFLOW = process.env.GITHUB_BUILD_WORKFLOW ?? 'android-build.yml';
const REF = process.env.GITHUB_BUILD_REF ?? 'main';

function baseUrlFrom(req: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && !configured.includes('localhost')) return configured.replace(/\/$/, '');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTenantApi(id, 'admin');
  if (auth.error) return auth.error;

  // Cada build ocupa um runner por 5 a 10 minutos. Seis por hora por
  // provedor sobra para o uso normal e corta o clique repetido.
  const limited = await rateLimitResponse(
    `app-build:${id}`,
    6,
    60 * 60_000,
    (s) => `Muitos builds seguidos. Tente de novo em ${Math.ceil(s / 60)} min.`,
  );
  if (limited) return limited;

  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'GITHUB_DISPATCH_TOKEN não configurado: sem ele não há como acionar o build.' },
      { status: 503 },
    );
  }

  const supabase = auth.admin;
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) return NextResponse.json({ error: 'Provedor não encontrado.' }, { status: 404 });

  try {
    let app = await ensureTenantApp(tenant);

    const blocked = buildBlockReason(app);
    if (blocked) return NextResponse.json({ error: blocked }, { status: 409 });

    // Hoje o piso vem do campo manual; na fase 2, da API da Play.
    const store = await storeVersionSourceFor(app).highest(app);
    if (store && store.versionCode > app.store_version_floor) {
      await supabase
        .from('tenant_apps')
        .update({ store_version_floor: store.versionCode, store_version_name: store.versionName } as never)
        .eq('tenant_id', id);
      app = { ...app, store_version_floor: store.versionCode, store_version_name: store.versionName };
    }

    // A senha da keystore nasce aqui, no primeiro build, e fica guardada
    // cifrada. Precisa existir antes de o runner criar a chave.
    if (!app.keystore_password) {
      const { error } = await supabase
        .from('tenant_apps')
        .update({ keystore_password: seal(newKeystorePassword()) } as never)
        .eq('tenant_id', id);
      if (error) return NextResponse.json({ error: 'Não foi possível preparar a chave.' }, { status: 500 });
    }

    const planned = nextVersion(app);
    const reserved = await reserveBuild({
      tenantId: id,
      platform: 'android',
      versionName: planned.version_name,
      createdBy: auth.userId,
      expectedCode: planned.version_code,
    });
    if (!reserved.ok) return NextResponse.json({ error: reserved.error }, { status: reserved.status });

    const build = reserved.build;
    const versionCode = build.version_code ?? planned.version_code;
    const versionName = build.version_name ?? planned.version_name;
    const buildToken = createBuildToken(build.id);

    await auditApp({
      tenantId: id,
      actorUserId: auth.userId,
      action: 'app.build_started',
      resourceType: 'tenant_app_build',
      resourceId: build.id,
      metadata: { version_code: versionCode, version_name: versionName, package_id: app.package_id },
    });

    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: REF,
          inputs: {
            build_id: build.id,
            api_url: baseUrlFrom(req),
            token: buildToken,
            version_code: String(versionCode),
            version_name: versionName,
            label: `${app.app_name} ${versionName} (${versionCode})`,
          },
        }),
      },
    );

    if (!res.ok) {
      // O corpo da resposta do GitHub fica fora da mensagem: pode ecoar parte
      // do pedido, e o pedido leva o passe do build.
      await finishBuild({ buildId: build.id, status: 'error', error: `O GitHub recusou o pedido (${res.status}).` });
      await auditApp({
        tenantId: id,
        actorUserId: auth.userId,
        action: 'app.build_failed',
        resourceType: 'tenant_app_build',
        resourceId: build.id,
        metadata: { stage: 'dispatch', http_status: res.status },
      });
      return NextResponse.json({ error: `Não consegui acionar o build (${res.status}).` }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      build_id: build.id,
      version_code: versionCode,
      version_name: versionName,
      origin: tenantOrigin(tenant),
    });
  } catch (e) {
    if (e instanceof Error && e.message === APP_TABLE_MISSING) {
      return NextResponse.json({ error: 'Rode a migração 006 no banco antes.' }, { status: 503 });
    }
    console.error('[app-build] falha ao iniciar:', e instanceof Error ? e.name : 'erro');
    return NextResponse.json({ error: 'Não foi possível iniciar o build.' }, { status: 500 });
  }
}
