import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-bg-2">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-brand text-brand-fg flex items-center justify-center font-bold text-sm">
              L
            </div>
            <span className="font-semibold text-base">LinkHub</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Criar conta</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-3xl">
            <span className="inline-block text-xs font-semibold tracking-wider uppercase text-brand mb-4">
              Plataforma para Provedores de Internet
            </span>
            <h1 className="text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight mb-6">
              Central do cliente pronta em minutos, conectada ao seu ERP.
            </h1>
            <p className="text-lg text-fg-2 leading-relaxed mb-8">
              Lance um portal de autoatendimento com a sua marca e domínio.
              Integra direto com IXC Soft, SGP, Hubsoft e MK Solutions — seus
              clientes consultam faturas, pagam por Pix e abrem chamados sem
              precisar te ligar.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup">
                <Button size="lg">Criar meu portal grátis</Button>
              </Link>
              <Link href="https://demo.linkhub.api.br" target="_blank">
                <Button size="lg" variant="outline">Ver portal de demonstração</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-bg-2">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  t: 'Multi-tenant nativo',
                  d: 'Cada provedor ganha um subdomínio (provedor.linkhub.api.br) ou domínio próprio com cores, logo e layout escolhido.',
                },
                {
                  t: 'Integração com ERPs',
                  d: 'Adapters prontos para IXC Soft, SGP, Hubsoft e MK Solutions. Plug-and-play: cole a chave e está rodando.',
                },
                {
                  t: '3 layouts de portal',
                  d: 'Escolha entre Clean Minimal, Neo Premium ou Friendly Bold. Light e dark mode automáticos.',
                },
              ].map((f) => (
                <div key={f.t}>
                  <div className="w-10 h-10 rounded-md bg-brand/10 text-brand flex items-center justify-center mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-base mb-2">{f.t}</h3>
                  <p className="text-sm text-fg-2 leading-relaxed">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold mb-3">Como funciona</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
            {[
              ['1', 'Crie a conta', 'Escolha um slug (ex: linknet.linkhub.api.br) e cadastre seu provedor.'],
              ['2', 'Personalize', 'Suba sua logo, defina suas cores e escolha um dos 3 layouts.'],
              ['3', 'Conecte o ERP', 'Cole o token do IXC/SGP/Hubsoft. Sincronização automática a cada hora.'],
              ['4', 'Compartilhe', 'Mande o link para seus clientes — Pix, boleto e suporte funcionando.'],
            ].map(([n, t, d]) => (
              <div key={n} className="bg-bg-2 border border-border rounded-lg p-5">
                <div className="text-2xl font-bold text-brand mb-2">{n}</div>
                <h3 className="font-semibold mb-2">{t}</h3>
                <p className="text-sm text-fg-2 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-fg-3">
        © 2026 LinkHub. Feito para provedores brasileiros.
      </footer>
    </div>
  );
}
