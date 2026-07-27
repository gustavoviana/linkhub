import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptErpConfig, mergeErpSecrets } from '@/lib/erp/crypto';

// Gravação da integração de ERP.
//
// Antes isso era um UPDATE direto do browser via RLS, o que dava ao
// navegador poder de escrita sobre `tenants.erp_config`. Como as
// credenciais do ERP moram nessa coluna, a escrita passa pelo servidor:
// aqui validamos papel (owner/admin) e formato, e gravamos com service
// role. O trigger trg_tenants_protect no banco recusa qualquer tentativa
// de escrever erp_config por outro caminho.

const CONFIG_SCHEMA = z.object({
  ixc: z.object({
    baseUrl: z.string().url(),
    token: z.string().min(1),
  }).partial().optional(),
  sgp: z.object({
    baseUrl: z.string().url(),
    app: z.string().min(1),
    token: z.string().min(1),
  }).partial().optional(),
  hubsoft: z.object({
    baseUrl: z.string().url(),
    clientId: z.string().min(1),
    clientSecret: z.string().min(1),
    username: z.string().min(1),
    password: z.string().min(1),
  }).partial().optional(),
  mk_solutions: z.object({
    baseUrl: z.string().url(),
    user: z.string().min(1),
    password: z.string().min(1),
    wsLogin: z.string().optional(),
    wsPass: z.string().optional(),
  }).partial().optional(),
});

const BODY_SCHEMA = z.object({
  erp_type: z.enum(['mock', 'ixc', 'sgp', 'hubsoft', 'mk_solutions']),
  // `.strip()` do zod descarta chaves desconhecidas — evita que o form
  // empurre lixo (ou colunas inventadas) pro jsonb.
  erp_config: CONFIG_SCHEMA,
});

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from('tenant_admins')
    .select('role')
    .eq('tenant_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  const role = (membership as { role?: string } | null)?.role;
  if (role !== 'owner' && role !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const parsed = BODY_SCHEMA.safeParse(await req.json());
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return new NextResponse(
      `Configuração inválida em "${first.path.join('.')}": ${first.message}`,
      { status: 400 },
    );
  }

  const { erp_type, erp_config } = parsed.data;

  // Segredo vazio = "não mexi nesse campo": recupera o que já estava salvo em
  // vez de apagar a credencial só porque o formulário não a exibe.
  const { data: currentRow } = await admin
    .from('tenants')
    .select('erp_config')
    .eq('id', id)
    .single();

  const merged =
    erp_type === 'mock'
      ? {}
      : {
          [erp_type]: mergeErpSecrets(
            erp_type,
            (erp_config[erp_type] ?? {}) as Record<string, string | undefined>,
            (currentRow as { erp_config?: unknown } | null)?.erp_config,
          ),
        };

  // Guarda só o bloco do ERP escolhido — não faz sentido manter credencial
  // de uma integração que o provedor abandonou — e cifrado.
  const config = encryptErpConfig(merged);

  const { error } = await admin
    .from('tenants')
    .update({ erp_type, erp_config: config } as never)
    .eq('id', id);
  if (error) return new NextResponse(error.message, { status: 500 });

  await admin.from('audit_log').insert({
    tenant_id: id,
    actor_user_id: user.id,
    action: 'tenant.erp_updated',
    resource_type: 'tenant',
    resource_id: id,
    metadata: { erp_type },
  } as never);

  return NextResponse.json({ ok: true });
}
