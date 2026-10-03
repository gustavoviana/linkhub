import { NextResponse, type NextRequest } from 'next/server';
import { requireTenantApi } from '@/lib/auth/api-guard';

// Envio de logo, favicon, foto da entrada e ícone do app.
//
// Era um upload direto do navegador para o Storage, liberado pela policy de
// RLS a quem está em tenant_admins. O super administrador da plataforma não
// está lá — e não deve estar (ver migração 009) —, então o envio passa pelo
// servidor, com a mesma guarda das outras rotas do painel.

export const runtime = 'nodejs';

// Abaixo do teto de 4,5MB do corpo de requisição na Vercel. A foto da entrada
// chega já convertida para WebP pelo navegador.
const MAX_BYTES = 4 * 1024 * 1024;

const PREFIXOS = new Set(['logo', 'logo-dark', 'favicon', 'login', 'app-icon']);
const EXTENSOES = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg', 'ico', 'gif']);

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireTenantApi(id, 'admin');
  if (auth.error) return auth.error;

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const prefixo = String(form?.get('prefix') ?? '');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Arquivo ausente.' }, { status: 400 });
  if (!PREFIXOS.has(prefixo)) return NextResponse.json({ error: 'Destino inválido.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Arquivo acima de 4MB.' }, { status: 400 });

  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  if (!EXTENSOES.has(ext) || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Envie uma imagem (PNG, JPG, WebP, SVG ou ICO).' }, { status: 400 });
  }

  const path = `tenants/${id}/${prefixo}-${Date.now()}.${ext}`;
  const storage = auth.admin.storage.from('tenant-assets');
  const { error } = await storage.upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url: storage.getPublicUrl(path).data.publicUrl });
}
