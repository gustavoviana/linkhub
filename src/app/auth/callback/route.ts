import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/admin';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // Link expirado ou já usado: manda para o pedido de novo link em vez de
    // despejar o usuário no painel sem sessão.
    if (error) {
      return NextResponse.redirect(`${origin}/esqueci-senha?expirado=1`);
    }
  }
  return NextResponse.redirect(`${origin}${next}`);
}
