'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Tenant, SupportTicket } from '@/lib/supabase/types';
import { formatDate } from '@/lib/utils';
import { Icon, type IconName } from '@/components/portal/icons';
import { portalTokens, rgba, type PortalTokens } from '@/components/portal/tokens';
import { ScreenHeader } from '@/components/portal/shell';

// Canais reais primeiro. As "resoluções rápidas" do protótipo viravam botões
// mortos aqui — enquanto não houver ação de verdade por trás (reiniciar
// conexão, trocar senha do Wi-Fi), elas apontam para o canal de atendimento
// em vez de fingir que fazem algo.

const TOPICS: { icon: IconName; title: string; desc: string; message: string }[] = [
  {
    icon: 'wifi',
    title: 'Minha internet está lenta',
    desc: 'Vamos verificar sua conexão',
    message: 'Olá! Minha internet está lenta.',
  },
  {
    icon: 'x',
    title: 'Estou sem conexão',
    desc: 'Abertura de chamado técnico',
    message: 'Olá! Estou sem conexão.',
  },
  {
    icon: 'lock',
    title: 'Trocar a senha do Wi-Fi',
    desc: 'Alteração no roteador',
    message: 'Olá! Gostaria de trocar a senha do meu Wi-Fi.',
  },
  {
    icon: 'card',
    title: 'Dúvida sobre a fatura',
    desc: 'Valores, vencimento e pagamento',
    message: 'Olá! Tenho uma dúvida sobre a minha fatura.',
  },
];

export function SupportScreen({ tenant, tickets }: { tenant: Tenant; tickets: SupportTicket[] }) {
  const t = portalTokens(tenant, tenant.dark_mode_default);

  const wa = (text: string) =>
    tenant.support_whatsapp
      ? `https://wa.me/${tenant.support_whatsapp}?text=${encodeURIComponent(text)}`
      : tenant.support_email
        ? `mailto:${tenant.support_email}?subject=${encodeURIComponent('Atendimento')}&body=${encodeURIComponent(text)}`
        : tenant.support_phone
          ? `tel:${tenant.support_phone.replace(/\D/g, '')}`
          : null;

  const hasChannel = !!(tenant.support_whatsapp || tenant.support_phone || tenant.support_email);

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
          {TOPICS.map((topic) => {
            const href = wa(topic.message);
            const content = (
              <>
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
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{topic.title}</div>
                  <div style={{ fontSize: 12, color: t.text2, marginTop: 1 }}>{topic.desc}</div>
                </div>
                <Icon name="chevron" size={16} color={t.text3} />
              </>
            );
            const style: React.CSSProperties = {
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: t.radiusSm,
              padding: 14,
              color: t.text,
              textAlign: 'left',
              width: '100%',
            };
            return href ? (
              <a key={topic.title} href={href} target="_blank" rel="noreferrer" style={style}>
                {content}
              </a>
            ) : (
              <div key={topic.title} style={{ ...style, opacity: 0.6 }}>
                {content}
              </div>
            );
          })}
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
            <Channel t={t} icon="chat" label="WhatsApp" value={tenant.support_whatsapp} href={`https://wa.me/${tenant.support_whatsapp}`} highlight />
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
}: {
  t: PortalTokens;
  icon: IconName;
  label: string;
  value: string;
  href: string;
  highlight?: boolean;
}) {
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
        background: highlight ? t.accentGrad : t.surface,
        color: highlight ? t.accentFg : t.text,
        border: highlight ? 'none' : `1px solid ${t.border}`,
        fontWeight: 600,
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
