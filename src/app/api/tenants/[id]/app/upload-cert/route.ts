import { X509Certificate } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { requireTenantApi } from '@/lib/auth/api-guard';
import { rateLimit } from '@/lib/rate-limit';
import { auditApp } from '@/lib/tenant/app-audit';

// Certificado público da chave de upload, em PEM. É o equivalente a
// `keytool -export -rfc -alias upload`: o que o provedor manda ao Google ao
// pedir a redefinição da chave de upload.
//
// Só o certificado. A keystore (.jks) nunca sai por rota nenhuma.
// Dono do provedor ou super administrador (que entra como dono).

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTenantApi(id, 'owner');
  if (auth.error) return auth.error;

  const limit = rateLimit(`upload-cert:${id}:${auth.userId}`, 10, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Muitos downloads seguidos. Tente de novo em alguns minutos.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const { data } = await auth.admin
    .from('tenant_apps')
    .select('package_id, keystore_sha256, upload_cert_pem, migration_enabled, migration_pem_downloaded_at')
    .eq('tenant_id', id)
    .maybeSingle();
  const app = data as {
    package_id: string;
    keystore_sha256: string | null;
    upload_cert_pem: string | null;
    migration_enabled: boolean;
    migration_pem_downloaded_at: string | null;
  } | null;

  if (!app?.keystore_sha256) {
    return NextResponse.json(
      { error: 'Este provedor ainda não tem chave de upload. Gere o primeiro build para criá-la.' },
      { status: 404 },
    );
  }
  if (!app.upload_cert_pem) {
    return NextResponse.json(
      { error: 'O certificado desta chave ainda não foi extraído. Rode scripts/recifrar-keystores.mjs.' },
      { status: 409 },
    );
  }

  // Confere antes de entregar: o arquivo tem que bater com o SHA-256 da tela.
  let fingerprint: string;
  try {
    fingerprint = new X509Certificate(app.upload_cert_pem).fingerprint256.toUpperCase();
  } catch {
    return NextResponse.json({ error: 'O certificado guardado está corrompido.' }, { status: 500 });
  }
  if (fingerprint !== app.keystore_sha256.toUpperCase()) {
    return NextResponse.json(
      { error: 'O certificado guardado não confere com a chave de upload. Nada foi baixado.' },
      { status: 500 },
    );
  }

  await auditApp({
    tenantId: id,
    actorUserId: auth.userId,
    action: 'app.upload_cert_downloaded',
    metadata: { sha256: fingerprint, via_platform: auth.viaPlatform },
  });
  if (app.migration_enabled && !app.migration_pem_downloaded_at) {
    await auth.admin
      .from('tenant_apps')
      .update({ migration_pem_downloaded_at: new Date().toISOString() } as never)
      .eq('tenant_id', id);
  }

  return new NextResponse(`${app.upload_cert_pem.trim()}\n`, {
    headers: {
      'Content-Type': 'application/x-pem-file',
      'Content-Disposition': `attachment; filename="upload_certificate-${app.package_id}.pem"`,
      'Cache-Control': 'no-store',
      'X-Upload-Cert-SHA256': fingerprint,
    },
  });
}
