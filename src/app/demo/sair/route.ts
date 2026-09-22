import { NextResponse, type NextRequest } from 'next/server';
import { demoMontagem } from '@/lib/demo/tenant';

// "Sair" da demonstração é voltar à tela de entrada: não há sessão para
// encerrar. Existe em POST porque é o que os formulários da casca do portal
// disparam, e em GET porque o link pode acabar salvo ou compartilhado — um
// 405 seria uma saída péssima para quem só quis voltar.

function voltar(req: NextRequest) {
  // A entrada é `/` no subdomínio da demonstração e `/demo` no domínio raiz.
  const { entrada } = demoMontagem(
    req.headers.get('x-forwarded-host') ?? req.headers.get('host'),
  );

  // Location relativo, de propósito. Montar a URL absoluta a partir de
  // `req.url` devolvia o host interno do servidor — e num subdomínio isso
  // jogaria o visitante para fora da demonstração no clique de sair.
  return new NextResponse(null, { status: 303, headers: { Location: entrada } });
}

export async function POST(req: NextRequest) {
  return voltar(req);
}

export async function GET(req: NextRequest) {
  return voltar(req);
}
