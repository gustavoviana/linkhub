import { NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { ensureTenantApp, APP_TABLE_MISSING } from '@/lib/tenant/app-store-db';
import { buildIosProject } from '@/lib/appgen/ios-project';

// Baixa o projeto iOS do provedor, pronto para o Xcode.

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTenantAdmin(id);

  const supabase = createAdminClient();
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) return NextResponse.json({ error: 'Provedor não encontrado.' }, { status: 404 });

  try {
    const app = await ensureTenantApp(tenant);
    const { filename, zip } = await buildIosProject(tenant, app);

    return new NextResponse(new Uint8Array(zip), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === APP_TABLE_MISSING) {
      return NextResponse.json({ error: 'Rode a migração 006 no banco antes.' }, { status: 503 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Falha.' }, { status: 500 });
  }
}
