import { NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/auth/tenant-access';
import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { rateLimitResponse } from '@/lib/rate-limit-shared';
import { ensureTenantApp, finishBuild, reserveBuild, APP_TABLE_MISSING } from '@/lib/tenant/app-store-db';
import { nextIosVersion } from '@/lib/tenant/app-version';
import { auditApp } from '@/lib/tenant/app-audit';
import { buildIosProject } from '@/lib/appgen/ios-project';

// Baixa o projeto iOS do provedor, pronto para o Xcode.
//
// Cada download é um "build" do iOS: reserva o próximo CFBundleVersion com o
// contador próprio do iOS (ios_build_number) e já o marca como usado, porque
// o projeto sai inteiro daqui e não há etapa que possa falhar depois.

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireTenantAdmin(id);

  const limited = await rateLimitResponse(
    `app-ios:${id}`,
    10,
    60 * 60_000,
    () => 'Muitos downloads seguidos. Tente de novo mais tarde.',
  );
  if (limited) return limited;

  const supabase = createAdminClient();
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) return NextResponse.json({ error: 'Provedor não encontrado.' }, { status: 404 });

  try {
    const app = await ensureTenantApp(tenant);
    const planned = nextIosVersion(app);
    const reserved = await reserveBuild({
      tenantId: id,
      platform: 'ios',
      versionName: planned.version_name,
      createdBy: access.userId,
      expectedCode: planned.version_code,
    });
    if (!reserved.ok) return NextResponse.json({ error: reserved.error }, { status: reserved.status });

    const version = {
      version_code: reserved.build.version_code ?? planned.version_code,
      version_name: reserved.build.version_name ?? planned.version_name,
    };

    let project: Awaited<ReturnType<typeof buildIosProject>>;
    try {
      project = await buildIosProject(tenant, app, version);
    } catch (e) {
      await finishBuild({ buildId: reserved.build.id, status: 'error', error: 'Falha ao montar o projeto iOS.' });
      throw e;
    }
    await finishBuild({ buildId: reserved.build.id, status: 'done' });
    await auditApp({
      tenantId: id,
      actorUserId: access.userId,
      action: 'app.build_done',
      resourceType: 'tenant_app_build',
      resourceId: reserved.build.id,
      metadata: { platform: 'ios', version_code: version.version_code, version_name: version.version_name },
    });

    return new NextResponse(new Uint8Array(project.zip), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${project.filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === APP_TABLE_MISSING) {
      return NextResponse.json({ error: 'Rode a migração 006 no banco antes.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Não foi possível montar o projeto iOS.' }, { status: 500 });
  }
}
