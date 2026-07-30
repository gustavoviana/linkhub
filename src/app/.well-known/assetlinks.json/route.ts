import { NextResponse } from 'next/server';
import { resolveTenantByHost } from '@/lib/tenant/resolve';
import { getTenantApp } from '@/lib/tenant/app-store-db';

// Digital Asset Links: é isto que faz o app Android abrir em tela cheia.
//
// O Chrome, ao abrir o TWA, checa se este arquivo no domínio do provedor
// autoriza aquele pacote e aquela chave de assinatura. Não bateu, o app
// mostra a barra de endereço em cima — parece um navegador disfarçado, e é
// a reclamação número um de quem publica TWA.
//
// São duas impressões digitais: a da nossa keystore de upload e a da chave
// que o Google gera no Play App Signing (o console mostra depois do primeiro
// envio). Enquanto a segunda não for colada no painel, o app assinado pelo
// Google não verifica.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const tenant = await resolveTenantByHost();
  if (!tenant) return NextResponse.json([], { status: 404 });

  const { app } = await getTenantApp(tenant);
  const fingerprints = [app?.play_signing_sha256, app?.keystore_sha256]
    .filter((f): f is string => Boolean(f))
    .map((f) => f.trim().toUpperCase());

  if (!app || fingerprints.length === 0) return NextResponse.json([]);

  return NextResponse.json(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: app.package_id,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
      },
    },
  );
}
