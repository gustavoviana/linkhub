import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { asTenantOrNull } from '@/lib/supabase/helpers';
import { buildPreviewData } from '@/lib/tenant/preview-data';
import { isPreviewScreen } from '@/lib/tenant/preview-screens';
import { findAsset, findFormat } from '@/lib/tenant/store-formats';
import { verifyStoreShotToken } from '@/lib/tenant/store-token';
import { StoreAssetView, StoreShotView } from './store-shot-view';

// Uma imagem da loja por requisição. Quem abre é o Chrome sem janela que a
// API de exportação sobe — por isso a porta é um passe assinado, e não o
// login do painel: aquele navegador não tem cookie nenhum.

export const dynamic = 'force-dynamic';

export const metadata = { robots: { index: false, follow: false } };

export default async function StoreShotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const pick = (key: string) => {
    const value = query[key];
    return typeof value === 'string' ? value : null;
  };

  if (!verifyStoreShotToken(id, pick('token'))) notFound();

  const supabase = createAdminClient();
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
  const tenant = asTenantOrNull(data);
  if (!tenant) notFound();

  const asset = findAsset(pick('asset') ?? '');
  if (asset) return <StoreAssetView tenant={tenant} asset={asset} />;

  const format = findFormat(pick('format') ?? '');
  const screen = pick('screen');
  if (!format || !isPreviewScreen(screen)) notFound();

  return (
    <StoreShotView
      tenant={tenant}
      data={buildPreviewData(tenant)}
      screen={screen}
      format={format}
    />
  );
}
