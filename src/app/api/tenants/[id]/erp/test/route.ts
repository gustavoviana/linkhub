import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { IxcAdapter } from '@/lib/erp/ixc';
import { SgpAdapter } from '@/lib/erp/sgp';
import { HubsoftAdapter } from '@/lib/erp/hubsoft';
import { MockAdapter } from '@/lib/erp/mock';
import type { ErpType } from '@/lib/supabase/types';
import type { ErpAdapter } from '@/lib/erp/types';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const admin = createAdminClient();
  const { data: isAdmin } = await admin
    .from('tenant_admins')
    .select('id')
    .eq('tenant_id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!isAdmin) return new NextResponse('Forbidden', { status: 403 });

  const body = await req.json();
  const erpType: ErpType = body.erp_type;
  const cfg = body.erp_config ?? {};

  let adapter: ErpAdapter;
  try {
    switch (erpType) {
      case 'ixc':
        adapter = new IxcAdapter(cfg.ixc); break;
      case 'sgp':
        adapter = new SgpAdapter(cfg.sgp); break;
      case 'hubsoft':
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
