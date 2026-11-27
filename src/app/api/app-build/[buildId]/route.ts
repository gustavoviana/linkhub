import { X509Certificate } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { getBuild, finishBuild, ARTIFACT_BUCKET } from '@/lib/tenant/app-store-db';
import { verifyBuildToken } from '@/lib/tenant/build-token';
import { open, seal } from '@/lib/tenant/secret-box';
import { auditApp } from '@/lib/tenant/app-audit';
import { backgroundColorOf, tenantOrigin, themeColorOf, type AppBuild, type TenantApp } from '@/lib/tenant/app-config';

// A ponta do CI. Só o passe assinado do build entra aqui: nenhum cookie,
// nenhuma sessão.
//
//   GET   devolve tudo que o runner precisa para montar e assinar o app.
//         Vale uma vez só: o build sai de "queued" para "running".
//   POST  recebe de volta o .aab, a keystore recém-criada e o status.
//         Só com o build em andamento ("error" também na fila, para o
//         runner conseguir avisar falha que aconteceu antes do GET).
//
// O passe aparece no log do Actions, que é público. Por isso ele não vale
// nada fora dessa janela, e a keystore só é aceita se o provedor ainda não
// tiver uma: quem achar um passe não troca a chave de ninguém.

export const runtime = 'nodejs';
export const maxDuration = 60;

const SHA256 = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;
const MAX_KEYSTORE_BYTES = 64 * 1024;

function tokenOk(req: NextRequest, buildId: string) {
  return verifyBuildToken(buildId, new URL(req.url).searchParams.get('token'));
}

const notFound = () => NextResponse.json({ error: 'not found' }, { status: 404 });

export async function GET(req: NextRequest, { params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = await params;
  if (!tokenOk(req, buildId)) return notFound();

  const supabase = createAdminClient();
  // Troca de status condicional: se dois pedidos chegarem juntos, só um leva.
  const { data: claimed } = await supabase
    .from('tenant_app_builds')
    .update({ status: 'running' } as never)
    .eq('id', buildId)
    .eq('status', 'queued')
    .eq('platform', 'android')
    .select('*')
    .maybeSingle();
  const build = claimed as AppBuild | null;
  if (!build) return notFound();

  const [{ data: tenantRow }, { data: appRow }] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', build.tenant_id).single(),
    supabase.from('tenant_apps').select('*').eq('tenant_id', build.tenant_id).single(),
  ]);

  const tenant = asTenantOrNull(tenantRow);
  const app = appRow as TenantApp | null;
  if (!tenant || !app || build.version_code === null || !build.version_name) return notFound();

  const origin = tenantOrigin(tenant);
  const host = origin.replace(/^https?:\/\//, '');

  return NextResponse.json(
    {
      build_id: buildId,
      package_id: app.package_id,
      app_name: app.app_name,
      // Sempre do build reservado, nunca da ficha: é o número que o banco
      // garantiu único.
      version_code: build.version_code,
      version_name: build.version_name,
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
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = await params;
  if (!tokenOk(req, buildId)) return notFound();

  const build = await getBuild(buildId);
  if (!build) return notFound();

  const form = await req.formData();
  const status = form.get('status') === 'done' ? 'done' : 'error';
  const live = status === 'done' ? build.status === 'running' : build.status === 'running' || build.status === 'queued';
  if (!live) return notFound();

  const supabase = createAdminClient();
  const runUrl = form.get('run_url');
  const errorText = form.get('error');

  // Keystore nova: só no primeiro build do provedor. É ela que vai assinar
  // todas as atualizações futuras deste app: perdê-la é perder o app na loja.
  const keystore = form.get('keystore');
  const fingerprintRaw = form.get('keystore_sha256');
  const certRaw = form.get('upload_cert');
  if (status === 'done' && keystore instanceof File) {
    const { data: appRow } = await supabase
      .from('tenant_apps')
      .select('keystore_data')
      .eq('tenant_id', build.tenant_id)
      .single();
    const current = appRow as Pick<TenantApp, 'keystore_data'> | null;
    const fingerprint = typeof fingerprintRaw === 'string' ? fingerprintRaw.trim().toUpperCase() : '';
    const certPem = certRaw instanceof File ? await certRaw.text() : null;

    if (current?.keystore_data) {
      await finishBuild({ buildId, status: 'error', error: 'O runner tentou trocar a chave de um app que já tem chave.' });
      return NextResponse.json({ error: 'keystore já existe' }, { status: 409 });
    }
    if (!SHA256.test(fingerprint) || keystore.size === 0 || keystore.size > MAX_KEYSTORE_BYTES) {
      await finishBuild({ buildId, status: 'error', error: 'A chave criada no runner veio incompleta.' });
      return NextResponse.json({ error: 'keystore inválida' }, { status: 400 });
    }
    // O certificado tem que ser o da chave: é o que o provedor manda ao
    // Google na redefinição da chave de upload.
    let certOk: string | null = null;
    if (certPem) {
      try {
        if (new X509Certificate(certPem).fingerprint256.toUpperCase() === fingerprint) certOk = certPem.trim();
      } catch {
        certOk = null;
      }
    }

    const bytes = Buffer.from(await keystore.arrayBuffer());
    const { error } = await supabase
      .from('tenant_apps')
      .update({
        keystore_data: seal(bytes.toString('base64')),
        keystore_sha256: fingerprint,
        upload_cert_pem: certOk,
      } as never)
      .eq('tenant_id', build.tenant_id)
      .is('keystore_data', null);
    if (error) {
      await finishBuild({ buildId, status: 'error', error: 'Não foi possível guardar a chave nova.' });
      return NextResponse.json({ error: 'falha ao guardar' }, { status: 500 });
    }
    await auditApp({
      tenantId: build.tenant_id,
      actorUserId: null,
      action: 'app.keystore_created',
      resourceType: 'tenant_app_build',
      resourceId: buildId,
      metadata: { sha256: fingerprint, certificate_saved: Boolean(certOk) },
    });
  }

  let finalStatus: 'done' | 'error' = status;
  let finalError = typeof errorText === 'string' && errorText ? errorText : null;
  let artifactPath: string | null = null;
  let artifactBytes: number | null = null;

  const aab = form.get('aab');
  if (status === 'done') {
    if (aab instanceof File) {
      const path = `${build.tenant_id}/${buildId}.aab`;
      const bytes = new Uint8Array(await aab.arrayBuffer());
      const { error } = await supabase.storage
        .from(ARTIFACT_BUCKET)
        .upload(path, bytes, { contentType: 'application/octet-stream', upsert: true });
      if (error) {
        finalStatus = 'error';
        finalError = 'Falha ao guardar o pacote.';
      } else {
        artifactPath = path;
        artifactBytes = bytes.byteLength;
      }
    } else {
      finalStatus = 'error';
      finalError = 'O runner não devolveu o pacote.';
    }
  }

  const finished = await finishBuild({
    buildId,
    status: finalStatus,
    error: finalError,
    runUrl: typeof runUrl === 'string' ? runUrl : null,
    artifactPath,
    artifactBytes,
  });

  await auditApp({
    tenantId: build.tenant_id,
    actorUserId: null,
    action: finalStatus === 'done' ? 'app.build_done' : 'app.build_failed',
    resourceType: 'tenant_app_build',
    resourceId: buildId,
    metadata: {
      version_code: build.version_code,
      version_name: build.version_name,
      upload_sha256: finished?.upload_sha256 ?? null,
    },
  });

  return NextResponse.json({ ok: Boolean(finished) });
}
