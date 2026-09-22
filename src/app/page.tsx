import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon, type IconName } from '@/components/portal/icons';
import { CountUp, Faq, LogoMark, Reveal, SiteNav } from '@/components/site/chrome';

// Landing do LinkHub.
//
// Server component: o único JavaScript que vai para o navegador é o de
// components/site/chrome.tsx (barra, FAQ e os dois utilitários de motion).
//
// Todo número aqui é fato verificável do produto — quantos ERPs têm adapter,
// de quanto em quanto tempo o cron sincroniza, quantos layouts existem. Nada
// de métrica de negócio inventada: quem lê é dono de provedor e confere.

// O endereço divulgado da demonstração. Em desenvolvimento não há subdomínio,
// então o botão cai no caminho equivalente no domínio raiz — as duas portas
// abrem a mesma central.
const DEMO_URL =
  process.env.NODE_ENV === 'production'
    ? `https://demo.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'linkhub.api.br'}`
    : '/demo';

export const metadata: Metadata = {
  title: 'LinkHub — Central do assinante white-label para provedores de internet',
  description:
    'Central do cliente com a sua marca e seu domínio, conectada ao IXC Soft, SGP, Hubsoft e MK Solutions. 2ª via com Pix e boleto, consumo de rede e chamados — sem escrever uma linha de código.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      <SiteNav demoUrl={DEMO_URL} />

      <main>
        <Hero />
        <Integracoes />
        <Numeros />
        <Produto />
        <ComoFunciona />
        <Perguntas />
        <ChamadaFinal />
      </main>

      <Rodape />
    </div>
  );
}

/* --------------------------------------------------------------------- hero */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="lh-grid" />
      <div
        className="lh-glow"
        style={{ top: -180, left: '52%', width: 640, height: 640, background: 'rgb(var(--brand))' }}
      />
      <div
        className="lh-glow"
        style={{ top: 120, left: -220, width: 460, height: 460, background: 'rgb(var(--accent))', opacity: 0.1 }}
      />

      <div className="relative mx-auto max-w-container px-[var(--gutter)] pt-16 pb-[var(--section-y)] md:pt-24">
        <div className="max-w-[860px]">
          <span className="lh-eyebrow lh-eyebrow--pill">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Plataforma para provedores de internet
          </span>

          <h1 className="lh-display text-[clamp(2.35rem,5.4vw,3.7rem)] mt-6">
            A central do seu provedor,{' '}
            <span className="text-brand">pronta em minutos</span> e conectada ao seu ERP.
          </h1>

          <p className="lh-lead text-[17px] mt-6">
            Seu cliente consulta fatura, paga por Pix, baixa o boleto, vê o consumo e abre chamado
            sozinho — com a sua marca, no seu domínio. Você conecta o IXC, o SGP, o Hubsoft ou o MK
            e não escreve uma linha de código.
          </p>

          <div className="flex flex-wrap gap-3 mt-9">
            <Link href="/signup" className="lh-btn lh-btn--primary">
              Criar meu portal grátis
              <Icon name="arrow-right" size={16} className="lh-arrow" />
            </Link>
            <a href={DEMO_URL} target="_blank" rel="noreferrer" className="lh-btn lh-btn--ghost">
              Ver a central por dentro
            </a>
          </div>

          <p className="text-[12.5px] text-fg-3 mt-5">
            Sem cartão de crédito. A demonstração abre com dados fictícios, sem cadastro.
          </p>
        </div>

        <Reveal delay={120} className="mt-16">
          <ProvaDoProduto />
        </Reveal>
      </div>
    </section>
  );
}

/**
 * A prova visual do hero: a central do assinante dentro de uma moldura de
 * navegador. É marcação, não imagem — assim acompanha o tema, fica nítida em
 * qualquer tela e não custa download nenhum.
 *
 * Os dados são os mesmos da demonstração pública, para quem clicar em "ver por
 * dentro" reconhecer a tela que acabou de ver aqui.
 */
function ProvaDoProduto() {
  return (
    <div className="lh-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 h-11 border-b border-border bg-bg/60">
        <span className="flex gap-1.5" aria-hidden>
          <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
          <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
          <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
        </span>
        <span className="mx-auto font-mono text-[11px] text-fg-3">
          suaempresa.com.br/central
        </span>
      </div>

      <div className="grid md:grid-cols-[1.15fr_1fr] gap-px bg-border">
        <div className="bg-bg-2 p-6 md:p-8">
          <div className="flex items-center gap-2.5 mb-7">
            <span className="w-8 h-8 rounded-[10px] bg-brand/15 text-brand flex items-center justify-center">
              <Icon name="wifi" size={16} />
            </span>
            <div>
              <div className="text-[13px] font-bold leading-none">Sua Logo</div>
              <div className="text-[10.5px] text-fg-3 mt-1">Central do assinante</div>
            </div>
            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Conectado
            </span>
          </div>

          <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-fg-3">
            Fatura em aberto
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-[34px] font-extrabold tracking-[-0.03em] font-mono">R$ 129,90</span>
            <span className="text-[12px] text-fg-2">vence 10/10</span>
          </div>

          <div className="flex gap-2 mt-5">
            <span className="lh-btn lh-btn--primary !h-10 !px-4 !text-[13px] flex-1">
              <Icon name="pix" size={15} /> Pagar com Pix
            </span>
            <span className="lh-btn lh-btn--ghost !h-10 !px-4 !text-[13px]">
              <Icon name="barcode" size={15} /> Boleto
            </span>
          </div>

          <div className="mt-7 pt-6 border-t border-border grid grid-cols-3 gap-4">
            {[
              ['Plano', 'Fibra 500'],
              ['Download', '199 GB'],
              ['Chamados', 'Nenhum aberto'],
            ].map(([rotulo, valor]) => (
              <div key={rotulo}>
                <div className="text-[10.5px] text-fg-3 font-semibold">{rotulo}</div>
                <div className="text-[13px] font-bold mt-0.5">{valor}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-bg-2 p-6 md:p-8">
          <div className="flex items-baseline justify-between">
            <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-fg-3">
              Consumo de rede
            </div>
            <div className="text-[11px] text-fg-3 font-mono">7 dias</div>
          </div>

          <svg viewBox="0 0 280 110" className="w-full mt-4" role="img" aria-label="Consumo dos últimos 7 dias, com pico no sábado">
            <defs>
              <linearGradient id="lh-hero-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--brand))" stopOpacity="0.4" />
                <stop offset="100%" stopColor="rgb(var(--brand))" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map((i) => (
              <line
                key={i}
                x1="0"
                x2="280"
                y1={10 + i * 28}
                y2={10 + i * 28}
                stroke="rgb(var(--border))"
                strokeWidth="1"
              />
            ))}
            <path
              d="M 4,72 L 50,58 L 96,80 L 142,38 L 188,18 L 234,66 L 276,62 L 276,100 L 4,100 Z"
              fill="url(#lh-hero-area)"
            />
            <path
              d="M 4,72 L 50,58 L 96,80 L 142,38 L 188,18 L 234,66 L 276,62"
              fill="none"
              stroke="rgb(var(--brand))"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 4,95 L 50,92 L 96,96 L 142,88 L 188,84 L 234,93 L 276,92"
              fill="none"
              stroke="rgb(var(--fg-3))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="188" cy="18" r="4.5" fill="rgb(var(--brand))" stroke="rgb(var(--bg-2))" strokeWidth="2.5" />
          </svg>

          <div className="flex gap-5 mt-3">
            {[
              ['Download', '199 GB', 'rgb(var(--brand))'],
              ['Upload', '24,7 GB', 'rgb(var(--fg-3))'],
            ].map(([rotulo, valor, cor]) => (
              <div key={rotulo}>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-[3px] rounded-full" style={{ background: cor }} />
                  <span className="text-[11px] text-fg-2 font-semibold">{rotulo}</span>
                </div>
                <div className="text-[14px] font-bold font-mono mt-0.5">{valor}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-border space-y-2.5">
            {[
              ['Setembro de 2026', 'Paga'],
              ['Agosto de 2026', 'Paga'],
            ].map(([mes, situacao]) => (
              <div key={mes} className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-success/12 text-success flex items-center justify-center">
                  <Icon name="check" size={12} />
                </span>
                <span className="text-[12.5px] flex-1">{mes}</span>
                <span className="text-[11px] font-semibold text-success">{situacao}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- integrações */

const ERPS = [
  { nome: 'IXC Soft', detalhe: 'Faturas, contratos, consumo e chamados' },
  { nome: 'SGP', detalhe: 'Faturas, contratos e dados do assinante' },
  { nome: 'Hubsoft', detalhe: 'Faturas, contratos e chamados' },
  { nome: 'MK Solutions', detalhe: 'Faturas e contratos' },
];

const ETIQUETAS = [
  'Pix copia e cola',
  'QR Code',
  'Boleto em PDF',
  '2ª via',
  'Consumo de rede',
  'Chamados',
  'Domínio próprio',
  'App Android',
  'Modo escuro',
  'Política de privacidade',
  'Multi-provedor',
  'Sincronização automática',
];

function Integracoes() {
  return (
    <section id="integracoes" className="relative border-t border-border">
      <div className="mx-auto max-w-container px-[var(--gutter)] py-[var(--section-y)]">
        <Reveal>
          <span className="lh-eyebrow">Integração estável</span>
          <h2 className="lh-display text-[clamp(1.9rem,4vw,2.9rem)] mt-4">
            O ERP que você já usa, <span className="text-brand">sem trocar de sistema</span>.
          </h2>
          <p className="lh-lead mt-4">
            Cole a chave da API e pronto. A sincronização roda sozinha a cada 6 horas, e o assinante
            pode forçar uma atualização quando abre a central.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {ERPS.map((erp, i) => (
            <Reveal key={erp.nome} delay={i * 70}>
              <div className="lh-card lh-card--hover h-full p-6">
                <div className="w-10 h-10 rounded-[11px] bg-brand/10 text-brand flex items-center justify-center">
                  <Icon name="router" size={19} />
                </div>
                <div className="text-[15px] font-bold tracking-[-0.015em] mt-5">{erp.nome}</div>
                <p className="text-[13px] text-fg-2 leading-relaxed mt-1.5">{erp.detalhe}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="lh-marquee mt-10">
          <div className="lh-marquee-track">
            {[0, 1].map((copia) => (
              <div key={copia} className="flex gap-3" aria-hidden={copia === 1}>
                {ETIQUETAS.map((etiqueta) => (
                  <span
                    key={etiqueta}
                    className="px-3.5 h-8 inline-flex items-center rounded-full border border-border bg-bg-2 text-[12.5px] font-medium text-fg-2 whitespace-nowrap"
                  >
                    {etiqueta}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ números */

function Numeros() {
  return (
    <section className="border-t border-border bg-bg-2/40">
      <div className="mx-auto max-w-container px-[var(--gutter)] py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 lg:divide-x lg:divide-border">
          {[
            { valor: <CountUp end={4} />, rotulo: 'ERPs com adapter pronto' },
            { valor: <CountUp end={3} />, rotulo: 'layouts de central' },
            { valor: <CountUp end={6} suffix=" h" />, rotulo: 'entre sincronizações' },
            { valor: <CountUp end={0} suffix="" />, rotulo: 'linhas de código para subir' },
          ].map((item, i) => (
            <Reveal key={i} delay={i * 80} className="lg:px-8 first:lg:pl-0">
              <div className="text-[clamp(2.4rem,5vw,3.4rem)] font-extrabold tracking-[-0.04em] text-fg leading-none">
                {item.valor}
              </div>
              <div className="text-[13px] text-fg-3 mt-2.5 font-medium">{item.rotulo}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ produto */

const RECURSOS: { icone: IconName; titulo: string; texto: string; itens: string[] }[] = [
  {
    icone: 'pix',
    titulo: 'Pagamento sem ligar para você',
    texto: 'A 2ª via nasce pronta na tela, em qualquer horário.',
    itens: ['Pix copia e cola e QR Code', 'Boleto em PDF com linha digitável', 'Histórico de faturas pagas'],
  },
  {
    icone: 'flash',
    titulo: 'A marca é sua, não a nossa',
    texto: 'O assinante nunca vê o nome LinkHub em lugar nenhum.',
    itens: ['Logo, cores e favicon', 'Três layouts, claro e escuro', 'Domínio próprio com HTTPS'],
  },
  {
    icone: 'stats',
    titulo: 'Consumo que o cliente entende',
    texto: 'Download, upload e o dia de maior uso, com leitura por intervalo.',
    itens: ['Hoje, 7 dias e 30 dias', 'Status da conexão e IP', 'Velocidade contratada'],
  },
  {
    icone: 'ticket',
    titulo: 'Chamado direto no ERP',
    texto: 'O atendimento abre na central e cai no seu sistema, com protocolo.',
    itens: ['Abertura e acompanhamento', 'Histórico por contrato', 'Atalho para WhatsApp'],
  },
  {
    icone: 'phone',
    titulo: 'App na Play Store com o seu nome',
    texto: 'A central vira aplicativo Android assinado, pronto para publicar.',
    itens: ['Ícone e splash da sua marca', 'Pacote .aab gerado no painel', 'Textos e imagens da ficha'],
  },
  {
    icone: 'shield',
    titulo: 'Documentos que a loja exige',
    texto: 'Política de privacidade e termos publicados no seu domínio.',
    itens: ['Gerados do seu cadastro', 'Endereço fixo, nunca muda', 'Provedor como controlador'],
  },
];

function Produto() {
  return (
    <section id="produto" className="relative border-t border-border overflow-hidden">
      <div
        className="lh-glow"
        style={{ top: 40, right: -200, width: 520, height: 520, background: 'rgb(var(--brand))', opacity: 0.1 }}
      />
      <div className="relative mx-auto max-w-container px-[var(--gutter)] py-[var(--section-y)]">
        <Reveal>
          <span className="lh-eyebrow">O que o assinante recebe</span>
          <h2 className="lh-display text-[clamp(1.9rem,4vw,2.9rem)] mt-4">
            Tudo que hoje chega <span className="text-brand">no seu WhatsApp</span>.
          </h2>
          <p className="lh-lead mt-4">
            Segunda via, comprovante, velocidade contratada, chamado aberto. A central responde no
            lugar do seu atendente — e no horário em que o cliente precisa.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
          {RECURSOS.map((r, i) => (
            <Reveal key={r.titulo} delay={(i % 3) * 70}>
              <div className="lh-card lh-card--hover h-full p-7">
                <div className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                  <Icon name={r.icone} size={20} />
                </div>
                <h3 className="text-[16px] font-bold tracking-[-0.015em] mt-5">{r.titulo}</h3>
                <p className="text-[13.5px] text-fg-2 leading-relaxed mt-2">{r.texto}</p>
                <ul className="mt-5 space-y-2">
                  {r.itens.map((item) => (
                    <li key={item} className="flex gap-2.5 items-start text-[13px] text-fg-2">
                      <span className="text-brand mt-0.5 shrink-0">
                        <Icon name="check" size={13} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ como funciona */

const PASSOS = [
  {
    n: '01',
    t: 'Crie a conta',
    d: 'Escolha o endereço da sua central — linknet.linkhub.api.br — e cadastre o provedor.',
  },
  {
    n: '02',
    t: 'Aplique a marca',
    d: 'Suba a logo, defina as cores e escolha entre os três layouts. A prévia atualiza na hora.',
  },
  {
    n: '03',
    t: 'Conecte o ERP',
    d: 'Cole a chave do IXC, SGP, Hubsoft ou MK. A primeira sincronização roda na sequência.',
  },
  {
    n: '04',
    t: 'Mande o link',
    d: 'Pronto: Pix, boleto, consumo e chamados funcionando para todos os seus assinantes.',
  },
];

function ComoFunciona() {
  return (
    <section id="como-funciona" className="border-t border-border bg-bg-2/40">
      <div className="mx-auto max-w-container px-[var(--gutter)] py-[var(--section-y)]">
        <Reveal>
          <span className="lh-eyebrow">Quatro passos</span>
          <h2 className="lh-display text-[clamp(1.9rem,4vw,2.9rem)] mt-4">
            De cadastro a central no ar <span className="text-brand">na mesma tarde</span>.
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border mt-12 rounded-[14px] overflow-hidden border border-border">
          {PASSOS.map((p, i) => (
            <Reveal key={p.n} delay={i * 70} className="bg-bg h-full">
              <div className="p-7 h-full">
                <div className="font-mono text-[12px] font-bold text-brand tracking-[0.1em]">{p.n}</div>
                <h3 className="text-[16px] font-bold tracking-[-0.015em] mt-4">{p.t}</h3>
                <p className="text-[13.5px] text-fg-2 leading-relaxed mt-2">{p.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- perguntas */

const PERGUNTAS = [
  {
    q: 'Meu cliente vai ver que o portal é de outra empresa?',
    a: 'Não. A central roda no seu domínio, com a sua logo, as suas cores e o seu nome no título da aba. O LinkHub não aparece para o assinante em nenhuma tela, nem no rodapé, nem no aplicativo publicado na loja.',
  },
  {
    q: 'Preciso de programador para colocar no ar?',
    a: 'Não. O cadastro pede o nome do provedor e o endereço da central. A marca é um formulário com logo e cor, e a integração com o ERP é colar a chave da API. Tudo pelo painel, sem linha de código e sem servidor para manter.',
  },
  {
    q: 'E se o meu ERP não estiver na lista?',
    a: 'Hoje existem adapters prontos para IXC Soft, SGP, Hubsoft e MK Solutions. Para outro sistema, fale com a gente: o adapter é uma camada isolada, e integrar um ERP novo não mexe em nada do que já está rodando.',
  },
  {
    q: 'De quanto em quanto tempo os dados atualizam?',
    a: 'A sincronização automática roda a cada 6 horas. Fora isso, quando o assinante abre a central, os dados do contrato dele são atualizados na hora — então a fatura que você acabou de gerar aparece sem esperar o próximo ciclo.',
  },
  {
    q: 'Dá para usar meu próprio domínio?',
    a: 'Dá. Você aponta o domínio ou subdomínio que quiser — central.seuprovedor.com.br, por exemplo — e o certificado HTTPS é emitido automaticamente. Enquanto isso não fica pronto, a central já funciona no endereço provedor.linkhub.api.br.',
  },
  {
    q: 'O aplicativo é publicado em nome de quem?',
    a: 'Da sua empresa. O painel gera o pacote .aab assinado, o ícone, as imagens da ficha e os textos da loja, além da política de privacidade e dos termos de uso hospedados no seu domínio — que é o que o revisor da Play exige. A conta de desenvolvedor é sua.',
  },
];

function Perguntas() {
  return (
    <section id="perguntas" className="border-t border-border">
      <div className="mx-auto max-w-container px-[var(--gutter)] py-[var(--section-y)]">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-12">
          <Reveal>
            <span className="lh-eyebrow">Perguntas</span>
            <h2 className="lh-display text-[clamp(1.9rem,4vw,2.6rem)] mt-4">
              O que todo provedor pergunta antes.
            </h2>
            <p className="lh-lead mt-4 text-[14.5px]">
              Ficou algo de fora? Chame no WhatsApp — quem responde conhece o produto por dentro.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <Faq itens={PERGUNTAS} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- chamada final */

function ChamadaFinal() {
  return (
    <section className="relative border-t border-border overflow-hidden">
      <div
        className="lh-glow"
        style={{ bottom: -260, left: '50%', width: 720, height: 560, background: 'rgb(var(--brand))', transform: 'translateX(-50%)' }}
      />
      <div className="relative mx-auto max-w-container px-[var(--gutter)] py-[var(--section-y)] text-center">
        <Reveal>
          <h2 className="lh-display text-[clamp(2rem,4.6vw,3.2rem)] max-w-[20ch] mx-auto">
            Seu assinante já sabe se virar sozinho.
          </h2>
          <p className="lh-lead mx-auto mt-5 text-center">
            Falta dar a ele o lugar certo. Crie a central do seu provedor agora — leva menos tempo
            que atender uma ligação de 2ª via.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-9">
            <Link href="/signup" className="lh-btn lh-btn--primary">
              Criar meu portal grátis
              <Icon name="arrow-right" size={16} className="lh-arrow" />
            </Link>
            <a href={DEMO_URL} target="_blank" rel="noreferrer" className="lh-btn lh-btn--ghost">
              Ver a demonstração
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- rodapé */

const RODAPE: { titulo: string; links: { label: string; href: string; externo?: boolean }[] }[] = [
  {
    titulo: 'Produto',
    links: [
      { label: 'O que o assinante recebe', href: '#produto' },
      { label: 'Integrações com ERP', href: '#integracoes' },
      { label: 'Como funciona', href: '#como-funciona' },
      { label: 'Demonstração', href: DEMO_URL, externo: true },
    ],
  },
  {
    titulo: 'Conta',
    links: [
      { label: 'Criar provedor', href: '/signup' },
      { label: 'Entrar no painel', href: '/login' },
      { label: 'Recuperar senha', href: '/esqueci-senha' },
    ],
  },
  {
    titulo: 'Suporte',
    links: [
      { label: 'Perguntas frequentes', href: '#perguntas' },
      { label: 'Falar no WhatsApp', href: 'https://wa.me/5554999999999', externo: true },
      { label: 'contato@linkhub.api.br', href: 'mailto:contato@linkhub.api.br', externo: true },
    ],
  },
];

function Rodape() {
  return (
    <footer className="border-t border-border bg-bg-2/40">
      <div className="mx-auto max-w-container px-[var(--gutter)] py-14">
        <div className="grid md:grid-cols-[1.4fr_repeat(3,1fr)] gap-10">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark size={28} />
              <span className="text-[15px] font-extrabold tracking-[-0.02em]">LinkHub</span>
            </div>
            <p className="text-[13px] text-fg-2 leading-relaxed mt-4 max-w-[34ch]">
              Central do assinante white-label para provedores de internet brasileiros. Conectada ao
              seu ERP, com a sua marca.
            </p>
          </div>

          {RODAPE.map((coluna) => (
            <div key={coluna.titulo}>
              <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-fg-3">
                {coluna.titulo}
              </div>
              <ul className="mt-4 space-y-2.5">
                {coluna.links.map((l) => (
                  <li key={l.label}>
                    {l.externo ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[13px] text-fg-2 hover:text-fg transition-colors"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="text-[13px] text-fg-2 hover:text-fg transition-colors">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row gap-4 sm:items-center">
          <p className="text-[11.5px] text-fg-3 leading-relaxed flex-1">
            © {new Date().getFullYear()} LinkHub. O LinkHub é operador dos dados tratados na central;
            o provedor contratante é o controlador. Pagamentos por Pix e boleto são liquidados pelo
            arranjo do próprio provedor — a plataforma não processa nem retém valores.
          </p>
          <a
            href="#topo"
            className="inline-flex items-center gap-2 text-[12px] font-semibold text-fg-2 hover:text-fg transition-colors shrink-0"
          >
            Voltar ao topo
            <Icon name="chevron" size={13} style={{ transform: 'rotate(-90deg)' }} />
          </a>
        </div>
      </div>
    </footer>
  );
}
