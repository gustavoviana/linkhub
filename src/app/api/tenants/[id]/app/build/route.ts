import { NextResponse, type NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { ensureTenantApp, APP_TABLE_MISSING } from '@/lib/tenant/app-store-db';
import { nextVersion, tenantOrigin } from '@/lib/tenant/app-config';
import { createBuildToken } from '@/lib/tenant/build-token';
import { newKeystorePassword, seal } from '@/lib/tenant/secret-box';

// Dispara o build do Android.
//
// O trabalho pesado (Gradle, SDK do Android, assinatura) roda no GitHub
// Actions — a função da Vercel só registra o build e chuta a bola. O runner
// volta com o .aab pela API de callback.

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
  await requireTenantAdmin(id);

  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'GITHUB_DISPATCH_TOKEN não configurado — sem ele não há como acionar o build.' },
      { status: 503 },
    );
  }

  const supabase = createAdminClient();
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) return NextResponse.json({ error: 'Provedor não encontrado.' }, { status: 404 });

  try {
    const app = await ensureTenantApp(tenant);

    // A senha da keystore nasce aqui, no primeiro build, e fica guardada
    // cifrada. Precisa existir antes de o runner criar a chave.
    if (!app.keystore_password) {
      const { error } = await supabase
        .from('tenant_apps')
        .update({ keystore_password: seal(newKeystorePassword()) } as never)
        .eq('tenant_id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const version = app.keystore_data
      ? nextVersion(app)
      : { version_code: app.version_code, version_name: app.version_name };

    const { data: created, error: buildError } = await supabase
      .from('tenant_app_builds')
      .insert({
        tenant_id: id,
        platform: 'android',
        status: 'queued',
        version_code: version.version_code,
        version_name: version.version_name,
      } as never)
      .select('*')
      .single();

    if (buildError || !created) {
      return NextResponse.json({ error: buildError?.message ?? 'Falha ao criar o build.' }, { status: 500 });
    }

    const build = created as { id: string };
    const buildToken = createBuildToken(build.id);

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
            label: `${app.app_name} ${version.version_name}`,
          },
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.text();
      await supabase
        .from('tenant_app_builds')
        .update({ status: 'error', error: `GitHub recusou: ${res.status} ${detail.slice(0, 300)}` } as never)
        .eq('id', build.id);
      return NextResponse.json({ error: `Não consegui acionar o build (${res.status}).` }, { status: 502 });
    }

    // Guarda a versão já reservada: o próximo build parte dela.
    await supabase
      .from('tenant_apps')
      .update({ version_code: version.version_code, version_name: version.version_name } as never)
      .eq('tenant_id', id);

    return NextResponse.json({ ok: true, build_id: build.id, origin: tenantOrigin(tenant) });
  } catch (e) {
    if (e instanceof Error && e.message === APP_TABLE_MISSING) {
      return NextResponse.json({ error: 'Rode a migração 006 no banco antes.' }, { status: 503 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Falha.' }, { status: 500 });
  }
}
