import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Sair da conta.
//
// O caminho normal é POST, disparado pelos formulários do painel e do portal.
// GET existe só como rede de segurança: página em cache, app já instalado no
// celular do assinante ou link salvo continuam apontando para cá, e um 405
// ("Esta página não está funcionando") é uma saída péssima para quem só quis
// sair da conta.
//
// Mas GET aberto deslogaria o assinante à distância — bastaria um
// <img src=".../auth/logout"> num site qualquer. Por isso o GET só encerra a
// sessão quando o navegador diz que é navegação de verdade vinda daqui.

async function sair(req: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', req.url), { status: 303 });
}

export async function POST(req: NextRequest) {
  return sair(req);
}

export async function GET(req: NextRequest) {
  const site = req.headers.get('sec-fetch-site');
  const mode = req.headers.get('sec-fetch-mode');
  // 'none' é o assinante digitando o endereço ou abrindo o favorito;
  // 'same-origin', um link nosso. Imagem embutida em site de terceiro chega
  // como no-cors/cross-site e não desloga ninguém.
  const navegacaoNossa = mode === 'navigate' && (site === 'same-origin' || site === 'none');

  if (!navegacaoNossa) return NextResponse.redirect(new URL('/', req.url), { status: 303 });
  return sair(req);
}
