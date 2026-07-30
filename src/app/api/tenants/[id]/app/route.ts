import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireTenantAdmin } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { ensureTenantApp, APP_TABLE_MISSING } from '@/lib/tenant/app-store-db';

// Ficha do aplicativo do provedor.

export const runtime = 'nodejs';

const HEX = /^#[0-9a-fA-F]{6}$/;
// Regra do Android: segmentos separados por ponto, cada um começando com letra.
const PACKAGE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const SHA256 = /^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$/;

const schema = z.object({
  app_name: z.string().trim().min(1).max(30),
  package_id: z.string().trim().regex(PACKAGE, 'Pacote inválido. Use algo como br.com.provedor.central.'),
  icon_url: z.string().url().nullable().optional(),
  theme_color: z.string().regex(HEX).nullable().optional(),
  background_color: z.string().regex(HEX).nullable().optional(),
  play_signing_sha256: z
    .string()
    .trim()
    .regex(SHA256, 'A impressão digital tem 32 pares hexadecimais separados por “:”.')
    .nullable()
    .optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTenantAdmin(id);

  const supabase = createAdminClient();
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) return NextResponse.json({ error: 'Provedor não encontrado.' }, { status: 404 });

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  try {
    const app = await ensureTenantApp(tenant);

    // Trocar o pacote depois de publicar cria um app novo na loja e abandona
    // o antigo, com os usuários dentro. Só deixamos enquanto nada foi assinado.
    if (body.data.package_id !== app.package_id && app.keystore_data) {
      return NextResponse.json(
        { error: 'Este app já foi assinado — trocar o pacote criaria outro app na loja.' },
        { status: 409 },
      );
    }

    const { error } = await supabase
      .from('tenant_apps')
      .update({
        app_name: body.data.app_name,
        package_id: body.data.package_id,
        icon_url: body.data.icon_url ?? null,
        theme_color: body.data.theme_color ?? null,
        background_color: body.data.background_color ?? null,
        play_signing_sha256: body.data.play_signing_sha256?.toUpperCase() ?? null,
      } as never)
      .eq('tenant_id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === APP_TABLE_MISSING) {
      return NextResponse.json({ error: 'Rode a migração 006 no banco antes.' }, { status: 503 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Falha.' }, { status: 500 });
  }
}
