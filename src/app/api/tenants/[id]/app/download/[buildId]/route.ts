import { NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBuild, ARTIFACT_BUCKET } from '@/lib/tenant/app-store-db';

// Download do pacote assinado. O bucket é privado — o link sai assinado e
// vale poucos minutos, o suficiente para o navegador baixar.

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; buildId: string }> },
) {
  const { id, buildId } = await params;
  await requireTenantAdmin(id);

  const build = await getBuild(buildId);
  if (!build || build.tenant_id !== id || !build.artifact_path) {
    return NextResponse.json({ error: 'Pacote não encontrado.' }, { status: 404 });
  }

  const supabase = createAdminClient();
  const { data: appRow } = await supabase
    .from('tenant_apps')
    .select('package_id, version_name')
    .eq('tenant_id', id)
    .maybeSingle();
  const app = appRow as { package_id: string; version_name: string } | null;
  const filename = `${app?.package_id ?? 'app'}-${build.version_name ?? app?.version_name ?? '1'}.aab`;

  const { data, error } = await supabase.storage
    .from(ARTIFACT_BUCKET)
    .createSignedUrl(build.artifact_path, 300, { download: filename });

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Falha ao gerar o link.' }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
