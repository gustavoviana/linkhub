import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTenantApi } from '@/lib/auth/api-guard';
import { auditApp } from '@/lib/tenant/app-audit';
import { rateLimitResponse } from '@/lib/rate-limit-shared';

// "Marcar como publicado na loja". Só super administrador.
//
// A marcação é o que trava o identificador do pacote: a partir dela, trocar
// o pacote criaria outro app na loja.

export const runtime = 'nodejs';

const UUID = z.string().uuid();

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; buildId: string }> },
) {
  const { id, buildId } = await params;
  if (!UUID.safeParse(buildId).success) return NextResponse.json({ error: 'Build inválido.' }, { status: 400 });

  const auth = await requireTenantApi(id, 'owner');
  if (auth.error) return auth.error;
  if (!auth.viaPlatform) {
    return NextResponse.json({ error: 'Só o super administrador marca um build como publicado.' }, { status: 403 });
  }

  const limited = await rateLimitResponse(
    `app-published:${auth.userId}`,
    20,
    10 * 60_000,
    () => 'Muitas marcações seguidas. Tente de novo em alguns minutos.',
  );
  if (limited) return limited;

  // Filtro por tenant_id: o build tem que ser deste provedor.
  const { data, error } = await auth.admin
    .from('tenant_app_builds')
    .update({ published_at: new Date().toISOString(), published_by: auth.userId } as never)
    .eq('id', buildId)
    .eq('tenant_id', id)
    .eq('status', 'done')
    .is('published_at', null)
    .select('id, version_code, version_name, platform')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Não foi possível marcar.' }, { status: 500 });
  if (!data) {
    return NextResponse.json(
      { error: 'Só build pronto, deste provedor e ainda não marcado, pode ser marcado como publicado.' },
      { status: 409 },
    );
  }

  const build = data as { id: string; version_code: number; version_name: string; platform: string };
  await auditApp({
    tenantId: id,
    actorUserId: auth.userId,
    action: 'app.build_published',
    resourceType: 'tenant_app_build',
    resourceId: build.id,
    metadata: { version_code: build.version_code, version_name: build.version_name, platform: build.platform },
  });

  return NextResponse.json({ ok: true });
}
