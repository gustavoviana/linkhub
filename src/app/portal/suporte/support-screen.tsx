'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Tenant, SupportTicket } from '@/lib/supabase/types';
import { formatDate } from '@/lib/utils';
import { Icon, type IconName } from '@/components/portal/icons';
import { portalTokens, rgba, type PortalTokens } from '@/components/portal/tokens';
import { usePortalTokens } from '@/components/portal/theme';
import { ScreenHeader } from '@/components/portal/shell';

// Os assuntos comuns abrem a orientação aqui dentro antes de mandar o cliente
// para o atendimento. A maior parte dos chamados de lentidão e de queda se
// resolve com reiniciar o roteador e conferir cabo, então responder na tela
// tira volume da fila e devolve o cliente para a internet dele mais rápido.
// Quem não resolver continua tendo o canal de atendimento a um toque, agora no
// fim da resposta.

interface Topic {
  icon: IconName;
  title: string;
  desc: string;
  /** Mensagem que já vai escrita para o canal de atendimento. */
  message: string;
  /** Aviso em destaque, antes dos passos. */
  notice?: string;
  intro?: string;
  steps?: string[];
  outro?: string;
}

const TOPICS: Topic[] = [
  {
    icon: 'wifi',
    title: 'Minha internet está lenta',
    desc: 'Vamos verificar sua conexão',
    message: 'Olá! Minha internet está lenta.',
    intro:
      'Na maior parte das vezes a lentidão começa dentro de casa e se resolve em poucos minutos. Faça estes testes na ordem:',
    steps: [
      'Reinicie o roteador. Tire da tomada, espere 30 segundos e ligue de novo. As luzes levam até dois minutos para estabilizar.',
      'Teste a velocidade perto do roteador e depois no cômodo onde a internet está ruim. Se só piora longe, o problema é o alcance do Wi-Fi e não a sua conexão.',
      'Quando estiver perto do roteador, use a rede 5G. Ela entrega mais velocidade. A rede 2.4G vai mais longe, mas é mais lenta.',
      'Desligue do Wi-Fi o que não estiver em uso. Cada TV, celular e videogame conectado divide a mesma banda.',
      'Se der, ligue um computador no roteador por cabo de rede e teste. Se pelo cabo a velocidade estiver normal, o ajuste é no Wi-Fi.',
    ],
    outro:
      'Continua lento depois disso? Fale com a gente e diga em que horário acontece e quais aparelhos são afetados. Com essa informação o diagnóstico é bem mais rápido.',
  },
  {
    icon: 'x',
    title: 'Estou sem conexão',
    desc: 'Abertura de chamado técnico',
    message: 'Olá! Estou sem conexão.',
    intro: 'Antes de abrir o chamado, confira estes quatro pontos:',
    steps: [
      'Olhe as luzes do roteador. A luz de sinal, normalmente escrita PON, LOS ou Internet, precisa estar acesa e parada. Vermelha ou piscando indica falta de sinal na fibra.',
      'Confira se o cabo de energia e o cabo da fibra estão firmes. O da fibra é fininho e sai do lugar com facilidade em limpeza ou mudança de móvel.',
      'Tire o roteador da tomada, espere 30 segundos e ligue de novo.',
      'Veja na aba Faturas se existe alguma fatura em aberto. O acesso é bloqueado automaticamente quando o pagamento atrasa e volta pouco depois da baixa.',
    ],
    outro:
      'Se as luzes seguirem apagadas ou vermelhas, abra um chamado técnico. Verificamos o sinal na sua rua e, se for preciso, agendamos a visita de um técnico.',
  },
  {
    icon: 'lock',
    title: 'Trocar a senha do Wi-Fi',
    desc: 'Alteração no roteador',
    message: 'Olá! Gostaria de trocar a senha do meu Wi-Fi.',
    notice:
      'A troca de senha pela central ainda não está disponível na sua região por padrão. Por enquanto, a alteração é feita de uma destas duas formas:',
    steps: [
      'Pelo painel do roteador. Conectado no seu Wi-Fi, abra o navegador e digite o endereço que está na etiqueta do aparelho, normalmente 192.168.0.1 ou 192.168.1.1. Entre com o usuário e a senha da mesma etiqueta e procure a opção Wireless ou Wi-Fi.',
      'Pelo nosso atendimento. Falamos com você, confirmamos seus dados e fazemos a troca remotamente.',
    ],
    outro:
      'Escolha uma senha com pelo menos oito caracteres, misturando letras e números. Evite datas de nascimento e número de telefone. Depois da troca, todos os aparelhos vão pedir a senha nova, então anote antes de confirmar.',
  },
  {
    icon: 'card',
    title: 'Dúvida sobre a fatura',
    desc: 'Valores, vencimento e pagamento',
    message: 'Olá! Tenho uma dúvida sobre a minha fatura.',
    intro:
      'A fatura do mês fica na aba Faturas, com o valor, a data de vencimento e a situação do pagamento. As dúvidas mais comuns:',
    steps: [
      'Para pagar por Pix, abra a fatura, toque em copiar o código e cole no aplicativo do seu banco. O pagamento costuma ser reconhecido em poucos minutos.',
      'Prefere boleto? Na mesma tela dá para copiar a linha digitável ou baixar o PDF e pagar no banco de sempre.',
      'Paguei e a fatura ainda aparece em aberto. A baixa leva até dois dias úteis, principalmente em boleto pago no fim do dia ou no fim de semana. Passado esse prazo, envie o comprovante para a gente.',
      'O dia do vencimento não combina com a data em que você recebe? Fale com o atendimento que verificamos a possibilidade de mudança.',
      'A nota fiscal de cada mês fica dentro da própria fatura, junto do comprovante.',
    ],
    outro:
      'Se o valor cobrado não bateu com o seu plano, fale com a gente e informe o mês da fatura. Conferimos o contrato e explicamos a diferença.',
  },
];

export function SupportScreen({ tenant, tickets }: { tenant: Tenant; tickets: SupportTicket[] }) {
  const t = usePortalTokens(tenant);

  const wa = (text: string) =>
    tenant.support_whatsapp
      ? `https://wa.me/${tenant.support_whatsapp}?text=${encodeURIComponent(text)}`
      : tenant.support_email
        ? `mailto:${tenant.support_email}?subject=${encodeURIComponent('Atendimento')}&body=${encodeURIComponent(text)}`
        : tenant.support_phone
          ? `tel:${tenant.support_phone.replace(/\D/g, '')}`
          : null;

  const hasChannel = !!(tenant.support_whatsapp || tenant.support_phone || tenant.support_email);

  // O botão no fim de cada resposta chama o canal pelo nome: "falar no
  // WhatsApp" é clique certo, "falar com o suporte" é dúvida sobre o que abre.
  const channelLabel = tenant.support_whatsapp
    ? 'Falar no WhatsApp'
    : tenant.support_email
      ? 'Falar por e-mail'
      : tenant.support_phone
        ? 'Ligar para o suporte'
        : null;

  return (
    <div>
      <ScreenHeader t={t} title="Suporte" />
      <p style={{ padding: '0 20px', fontSize: 13, color: t.text2, marginTop: -4, marginBottom: 18 }}>
        Como podemos te ajudar hoje?
      </p>

      <section style={{ padding: '0 20px', marginBottom: 20 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: t.text2,
            marginBottom: 10,
          }}
        >
          Assuntos comuns
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TOPICS.map((topic) => (
            <TopicCard
              key={topic.title}
              t={t}
              topic={topic}
              href={wa(topic.message)}
              channelLabel={channelLabel}
            />
          ))}
        </div>
      </section>

      <TicketSection tenant={tenant} t={t} tickets={tickets} />

      <section style={{ padding: '0 20px' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: t.text2,
            marginBottom: 10,
          }}
        >
          Falar direto
        </div>

        {!hasChannel && (
          <div
            style={{
              padding: 16,
              borderRadius: t.radiusSm,
              background: rgba(t.warning, 0.1),
              border: `1px solid ${rgba(t.warning, 0.25)}`,
              fontSize: 13,
              color: t.text2,
            }}
          >
            O {tenant.name} ainda não cadastrou os canais de atendimento na central.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tenant.support_whatsapp && (
            <Channel
              t={t}
              icon="whatsapp"
              label="WhatsApp"
              value={tenant.support_whatsapp}
              href={`https://wa.me/${tenant.support_whatsapp}`}
              brandColor="#25D366"
            />
          )}
          {tenant.support_phone && (
            <Channel t={t} icon="phone" label="Telefone" value={tenant.support_phone} href={`tel:${tenant.support_phone.replace(/\D/g, '')}`} />
          )}
          {tenant.support_email && (
            <Channel t={t} icon="mail" label="E-mail" value={tenant.support_email} href={`mailto:${tenant.support_email}`} />
          )}
        </div>
      </section>
    </div>
  );
}

/** Assunto comum: a orientação abre aqui dentro, o atendimento fica no fim. */
function TopicCard({
  t,
  topic,
  href,
  channelLabel,
}: {
  t: PortalTokens;
  topic: Topic;
  href: string | null;
  channelLabel: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${open ? rgba(t.accent, 0.35) : t.border}`,
        borderRadius: t.radiusSm,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          width: '100%',
          background: 'none',
          border: 'none',
          color: t.text,
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: t.accentSoft,
            color: t.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name={topic.icon} size={17} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{topic.title}</div>
          <div style={{ fontSize: 12, color: t.text2, marginTop: 1 }}>{topic.desc}</div>
        </div>
        <Icon
          name="chevron"
          size={16}
          color={t.text3}
          style={{
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 150ms ease',
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {topic.notice && (
            <div
              style={{
                padding: 12,
                borderRadius: 10,
                background: rgba(t.warning, 0.1),
                border: `1px solid ${rgba(t.warning, 0.25)}`,
                fontSize: 13,
                lineHeight: 1.5,
                color: t.text,
              }}
            >
              {topic.notice}
            </div>
          )}

          {topic.intro && (
            <p style={{ fontSize: 13, lineHeight: 1.6, color: t.text2, margin: 0 }}>{topic.intro}</p>
          )}

          {topic.steps && (
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topic.steps.map((step, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      background: t.accentSoft,
                      color: t.accent,
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 13, lineHeight: 1.6, color: t.text2 }}>{step}</span>
                </li>
              ))}
            </ol>
          )}

          {topic.outro && (
            <p style={{ fontSize: 13, lineHeight: 1.6, color: t.text2, margin: 0 }}>{topic.outro}</p>
          )}

          {href && channelLabel && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                height: 42,
                borderRadius: 12,
                background: t.accentGrad,
                color: t.accentFg,
                fontSize: 13,
                fontWeight: 700,
                marginTop: 2,
              }}
            >
              {channelLabel}
              <Icon name="arrow-right" size={15} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/** Abertura e acompanhamento de chamados — grava em support_tickets. */
function TicketSection({
  tenant,
  t,
  tickets,
}: {
  tenant: Tenant;
  t: PortalTokens;
  tickets: SupportTicket[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const r = await fetch('/api/portal/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenant.id, subject, category: 'portal' }),
    }).catch(() => null);
    setSending(false);
    if (!r) return setError('Não conseguimos falar com o servidor.');
    if (!r.ok) return setError(await r.text());
    const data = await r.json();
    setProtocol(data.ticket?.protocol ?? null);
    setSubject('');
    setOpen(false);
    router.refresh();
  }

  return (
    <section style={{ padding: '0 20px', marginBottom: 20 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: t.text2,
          marginBottom: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Seus chamados</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{ background: 'none', border: 'none', color: t.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {open ? 'Cancelar' : '+ Abrir chamado'}
        </button>
      </div>

      {protocol && (
        <div
          style={{
            padding: 12,
            borderRadius: t.radiusSm,
            background: rgba(t.success, 0.1),
            border: `1px solid ${rgba(t.success, 0.25)}`,
            fontSize: 13,
            color: t.text,
            marginBottom: 8,
          }}
        >
          Chamado aberto. Protocolo <strong style={{ fontFamily: t.mono }}>{protocol}</strong>.
        </div>
      )}

      {open && (
        <form
          onSubmit={submit}
          style={{
            padding: 14,
            borderRadius: t.radiusSm,
            background: t.surface,
            border: `1px solid ${t.border}`,
            marginBottom: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <label style={{ fontSize: 12, fontWeight: 600, color: t.text2 }}>
            O que está acontecendo?
          </label>
          <textarea
            required
            minLength={5}
            maxLength={140}
            rows={3}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex: internet caindo toda noite por volta das 20h"
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 10,
              border: `1px solid ${t.border}`,
              background: t.surfaceSolid,
              color: t.text,
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
            }}
          />
          {error && <div style={{ fontSize: 12, color: t.danger }}>{error}</div>}
          <button
            type="submit"
            disabled={sending}
            style={{
              height: 44,
              borderRadius: 12,
              background: t.accentGrad,
              color: t.accentFg,
              border: 'none',
              fontSize: 14,
              fontWeight: 700,
              cursor: sending ? 'progress' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {sending ? 'Abrindo…' : 'Abrir chamado'}
          </button>
        </form>
      )}

      {tickets.length === 0 && !open && (
        <div style={{ fontSize: 13, color: t.text2 }}>Você ainda não abriu nenhum chamado.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tickets.map((ticket) => {
          const closed = ticket.status === 'closed' || ticket.status === 'resolved';
          return (
            <div
              key={ticket.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: t.radiusSm,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: closed ? t.success : t.warning,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{ticket.subject}</div>
                <div style={{ fontSize: 11, color: t.text3, fontFamily: t.mono, marginTop: 2 }}>
                  {ticket.protocol} · {formatDate(ticket.opened_at.slice(0, 10))}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: closed ? t.success : t.warning }}>
                {closed ? 'resolvido' : 'em aberto'}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Channel({
  t,
  icon,
  label,
  value,
  href,
  highlight,
  brandColor,
}: {
  t: PortalTokens;
  icon: IconName;
  label: string;
  value: string;
  href: string;
  highlight?: boolean;
  /** Cor da marca do canal — o verde do WhatsApp é o que o cliente procura. */
  brandColor?: string;
}) {
  const filled = brandColor ?? (highlight ? undefined : null);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: t.radiusSm,
        background: brandColor ?? (highlight ? t.accentGrad : t.surface),
        color: filled ? '#fff' : highlight ? t.accentFg : t.text,
        border: brandColor || highlight ? 'none' : `1px solid ${t.border}`,
        fontWeight: 600,
        boxShadow: brandColor ? `0 8px 20px -8px ${brandColor}` : undefined,
      }}
    >
      <Icon name={icon} size={18} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 500 }}>{value}</div>
      </div>
      <Icon name="arrow-right" size={16} />
    </a>
  );
}
