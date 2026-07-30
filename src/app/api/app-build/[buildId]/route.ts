import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { getBuild, ARTIFACT_BUCKET } from '@/lib/tenant/app-store-db';
import { verifyBuildToken } from '@/lib/tenant/build-token';
import { open, seal } from '@/lib/tenant/secret-box';
import { backgroundColorOf, tenantOrigin, themeColorOf, type TenantApp } from '@/lib/tenant/app-config';

// A ponta do CI. Só o passe assinado do build entra aqui — nenhum cookie,
// nenhuma sessão.
//
//   GET   devolve tudo que o runner precisa para montar e assinar o app.
//   POST  recebe de volta o .aab, a keystore recém-criada e o status.

export const runtime = 'nodejs';
export const maxDuration = 60;

async function authorize(req: NextRequest, buildId: string) {
  const token = new URL(req.url).searchParams.get('token');
  if (!verifyBuildToken(buildId, token)) return null;
  return getBuild(buildId);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = await params;
  const build = await authorize(req, buildId);
  if (!build) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const supabase = createAdminClient();
  const [{ data: tenantRow }, { data: appRow }] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', build.tenant_id).single(),
    supabase.from('tenant_apps').select('*').eq('tenant_id', build.tenant_id).single(),
  ]);

  const tenant = asTenantOrNull(tenantRow);
  const app = appRow as TenantApp | null;
  if (!tenant || !app) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const origin = tenantOrigin(tenant);
  const host = origin.replace(/^https?:\/\//, '');

  await supabase.from('tenant_app_builds').update({ status: 'running' } as never).eq('id', buildId);

  return NextResponse.json({
    build_id: buildId,
    package_id: app.package_id,
    app_name: app.app_name,
    version_code: build.version_code ?? app.version_code,
    version_name: build.version_name ?? app.version_name,
    origin,
    host,
    manifest_url: `${origin}/manifest.webmanifest`,
    icon_url: `${origin}/icons/icon-512.png`,
    maskable_icon_url: `${origin}/icons/icon-maskable-512.png`,
    theme_color: themeColorOf(tenant, app),
    background_color: backgroundColorOf(tenant, app),
    keystore_alias: app.keystore_alias,
    keystore_password: open(app.keystore_password),
    // Vazio no primeiro build: o runner cria a chave e devolve aqui.
    keystore_base64: open(app.keystore_data),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = await params;
  const build = await authorize(req, buildId);
  if (!build) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const supabase = createAdminClient();
  const form = await req.formData();
  const status = String(form.get('status') ?? 'error');
  const runUrl = form.get('run_url');
  const errorText = form.get('error');

  // Keystore nova: guarda cifrada. É ela que vai assinar todas as
  // atualizações futuras deste app — perdê-la é perder o app na loja.
  const keystore = form.get('keystore');
  const fingerprint = form.get('keystore_sha256');
  if (keystore instanceof File && typeof fingerprint === 'string') {
    const bytes = Buffer.from(await keystore.arrayBuffer());
    await supabase
      .from('tenant_apps')
      .update({
        keystore_data: seal(bytes.toString('base64')),
        keystore_sha256: fingerprint.trim().toUpperCase(),
      } as never)
      .eq('tenant_id', build.tenant_id);
  }

  const patch: Record<string, unknown> = {
    status,
    run_url: typeof runUrl === 'string' ? runUrl : null,
    error: typeof errorText === 'string' && errorText ? errorText.slice(0, 2000) : null,
  };

  const aab = form.get('aab');
  if (aab instanceof File) {
    const path = `${build.tenant_id}/${buildId}.aab`;
    const bytes = new Uint8Array(await aab.arrayBuffer());
    const { error } = await supabase.storage
      .from(ARTIFACT_BUCKET)
      .upload(path, bytes, { contentType: 'application/octet-stream', upsert: true });
    if (error) {
      patch.status = 'error';
      patch.error = `Falha ao guardar o pacote: ${error.message}`;
    } else {
      patch.artifact_path = path;
      patch.artifact_bytes = bytes.byteLength;
    }
  }

  await supabase.from('tenant_app_builds').update(patch as never).eq('id', buildId);
  return NextResponse.json({ ok: true });
}
