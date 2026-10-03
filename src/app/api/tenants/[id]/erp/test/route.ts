import { NextResponse, type NextRequest } from 'next/server';
import { requireTenantApi } from '@/lib/auth/api-guard';
import { IxcAdapter } from '@/lib/erp/ixc';
import { SgpAdapter } from '@/lib/erp/sgp';
import { IspfyAdapter } from '@/lib/erp/ispfy';
import { HubsoftAdapter } from '@/lib/erp/hubsoft';
import { MockAdapter } from '@/lib/erp/mock';
import { mergeErpSecrets } from '@/lib/erp/crypto';
import type { ErpType } from '@/lib/supabase/types';
import type { ErpAdapter, ErpConfig } from '@/lib/erp/types';

function incomplete(name: string) {
  return NextResponse.json({ ok: false, message: `Preencha os campos do ${name} antes de testar.` });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const auth = await requireTenantApi(id, 'viewer');
  if (auth.error) return auth.error;
  const { admin } = auth;

  const body = await req.json();
  const erpType: ErpType = body.erp_type;

  // O formulário não devolve os segredos já salvos, então completa com o que
  // está no banco antes de testar — senão "Testar conexão" falharia sempre
  // que o admin não redigitasse a senha.
  const { data: row } = await admin.from('tenants').select('erp_config').eq('id', id).single();
  const cfg = {
    ...(body.erp_config ?? {}),
    [erpType]: mergeErpSecrets(
      erpType,
      (body.erp_config?.[erpType] ?? {}) as Record<string, string | undefined>,
      (row as { erp_config?: unknown } | null)?.erp_config,
    ),
  } as ErpConfig;

  let adapter: ErpAdapter;
  try {
    switch (erpType) {
      case 'ixc':
        if (!cfg.ixc?.baseUrl || !cfg.ixc?.token) return incomplete('IXC');
        adapter = new IxcAdapter(cfg.ixc); break;
      case 'sgp':
        if (!cfg.sgp?.baseUrl || !cfg.sgp?.token) return incomplete('SGP');
        adapter = new SgpAdapter(cfg.sgp); break;
      case 'ispfy':
        if (!cfg.ispfy?.baseUrl || !cfg.ispfy?.token) return incomplete('ISPFY');
        adapter = new IspfyAdapter(cfg.ispfy); break;
      case 'hubsoft':
        if (!cfg.hubsoft?.baseUrl || !cfg.hubsoft?.clientId) return incomplete('Hubsoft');
        adapter = new HubsoftAdapter(cfg.hubsoft); break;
      default:
        adapter = new MockAdapter();
    }
    const result = await adapter.testConnection();
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? String(e) });
  }
}
