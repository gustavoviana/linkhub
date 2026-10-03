'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Field, Textarea, Select } from '@/components/ui/input';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/portal/icons';
import { cn } from '@/lib/utils';
import {
  CAMPOS,
  DADOS_DE_EXEMPLO,
  DESTINOS,
  HORA_MAX,
  HORA_MIN,
  REGRAS_MAX,
  TEXTO_MAX,
  TITULO_MAX,
  descreverQuando,
  preencher,
} from '@/lib/push/text';

export interface Regra {
  id?: string;
  days_offset: number;
  send_hour: number;
  title: string;
  body: string;
  enabled: boolean;
}

export interface Envio {
  id: string;
  kind: 'manual' | 'rule';
  title: string;
  body: string;
  url: string;
  status: 'scheduled' | 'sending' | 'sent' | 'cancelled';
  scheduled_at: string;
  sent_at: string | null;
  run_date: string | null;
  rule_id: string | null;
  enviados: number;
  falhas: number;
  toques: number;
}

type Aba = 'regras' | 'enviar' | 'historico';

const HORAS = Array.from({ length: HORA_MAX - HORA_MIN + 1 }, (_, i) => HORA_MIN + i);

export function NotificationsScreen({
  tenantId,
  configurado,
  podeEditar,
  aparelhos,
  regras,
  envios,
}: {
  tenantId: string;
  configurado: boolean;
  podeEditar: boolean;
  aparelhos: number;
  regras: Regra[];
  envios: Envio[];
}) {
  const [aba, setAba] = useState<Aba>(podeEditar ? 'regras' : 'historico');
  const abas: { id: Aba; rotulo: string }[] = podeEditar
    ? [
        { id: 'regras', rotulo: 'Avisos de fatura' },
        { id: 'enviar', rotulo: 'Enviar mensagem' },
        { id: 'historico', rotulo: 'Histórico' },
      ]
    : [{ id: 'historico', rotulo: 'Histórico' }];

  return (
    <div className="space-y-5">
      {!configurado && (
        <div className="rounded-[11px] border border-warning/35 bg-warning/10 px-4 py-3 text-sm text-fg-2 leading-relaxed">
          <strong className="text-warning">Envio ainda não configurado.</strong> Faltam as chaves de
          notificação (VAPID) no servidor. Dá para montar as regras agora; elas começam a valer quando o envio
          for ligado.
        </div>
      )}

      <div className="flex items-center gap-3 rounded-[11px] border border-border bg-bg-2 px-4 py-3">
        <span className="w-9 h-9 rounded-[9px] bg-brand/10 text-brand flex items-center justify-center shrink-0">
          <Icon name="bell" size={17} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">
            {aparelhos} {aparelhos === 1 ? 'aparelho' : 'aparelhos'} com avisos ativos
          </div>
          <div className="text-xs text-fg-2">
            O assinante ativa pelo convite na tela inicial da central ou em Conta. Só quem ativou recebe.
          </div>
        </div>
      </div>

      <nav className="flex gap-1 border-b border-border" role="tablist">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={aba === a.id}
            onClick={() => setAba(a.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              aba === a.id ? 'border-brand text-fg' : 'border-transparent text-fg-2 hover:text-fg',
            )}
          >
            {a.rotulo}
          </button>
        ))}
      </nav>

      {/* key: depois de salvar, o servidor devolve as regras com id, e a aba
          recomeça a partir delas em vez de comparar com a versão antiga. */}
      {aba === 'regras' && (
        <AbaRegras key={JSON.stringify(regras)} tenantId={tenantId} iniciais={regras} configurado={configurado} />
      )}
      {aba === 'enviar' && (
        <AbaEnviar
          tenantId={tenantId}
          aparelhos={aparelhos}
          configurado={configurado}
          agendadas={envios.filter((e) => e.kind === 'manual' && e.status === 'scheduled')}
        />
      )}
      {aba === 'historico' && <AbaHistorico envios={envios} regras={regras} />}
    </div>
  );
}

// ─── Prévia ─────────────────────────────────────────────────────────────

function Previa({ titulo, texto, campos = true }: { titulo: string; texto: string; campos?: boolean }) {
  const dados = campos ? DADOS_DE_EXEMPLO : { nome: DADOS_DE_EXEMPLO.nome };
  return (
    <div className="rounded-[14px] bg-bg-3 border border-border p-3">
      <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-fg-3 mb-2">Prévia no celular</div>
      <div className="rounded-[12px] bg-bg-2 border border-border px-3 py-2.5 flex gap-2.5 shadow-sm">
        <span className="w-8 h-8 rounded-[8px] bg-brand/15 text-brand flex items-center justify-center shrink-0">
          <Icon name="bell" size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold leading-snug break-words">
            {preencher(titulo, dados) || 'Título'}
          </div>
          <div className="text-[12px] text-fg-2 leading-snug mt-0.5 break-words">
            {preencher(texto, dados) || 'Texto da notificação'}
          </div>
        </div>
        <span className="text-[10px] text-fg-3 shrink-0">agora</span>
      </div>
      {campos && (
        <div className="text-[11px] text-fg-3 mt-2">
          Exemplo com Maria, R$ 99,90 e vencimento 10/10.
        </div>
      )}
    </div>
  );
}

/** Contador de caracteres que avisa antes do limite. */
function Contador({ atual, max }: { atual: number; max: number }) {
  return (
    <span className={cn('text-[11px] tabular-nums', atual > max ? 'text-danger' : atual > max * 0.9 ? 'text-warning' : 'text-fg-3')}>
      {atual}/{max}
    </span>
  );
}

/** Botões que inserem {nome}, {valor}, {vencimento} onde o cursor está. */
function InserirCampo({
  campos,
  alvo,
  valor,
  onChange,
}: {
  campos: readonly { chave: string; rotulo: string }[];
  alvo: React.RefObject<HTMLTextAreaElement | null>;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
      <span className="text-[11px] text-fg-3">Inserir:</span>
      {campos.map((c) => (
        <button
          key={c.chave}
          type="button"
          onClick={() => {
            const el = alvo.current;
            const ini = el?.selectionStart ?? valor.length;
            const fim = el?.selectionEnd ?? valor.length;
            onChange(valor.slice(0, ini) + c.chave + valor.slice(fim));
            requestAnimationFrame(() => {
              el?.focus();
              el?.setSelectionRange(ini + c.chave.length, ini + c.chave.length);
            });
          }}
          className="text-[11px] font-mono px-1.5 py-0.5 rounded border border-border text-fg-2 hover:border-brand hover:text-brand"
        >
          {c.chave}
        </button>
      ))}
    </div>
  );
}

// ─── Regras ─────────────────────────────────────────────────────────────

type Momento = 'antes' | 'dia' | 'depois';

function momentoDe(dias: number): Momento {
  return dias < 0 ? 'antes' : dias > 0 ? 'depois' : 'dia';
}

function AbaRegras({ tenantId, iniciais, configurado }: { tenantId: string; iniciais: Regra[]; configurado: boolean }) {
  const router = useRouter();
  const [regras, setRegras] = useState<Regra[]>(iniciais);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const alterado = useMemo(() => JSON.stringify(regras) !== JSON.stringify(iniciais), [regras, iniciais]);

  function mudar(i: number, parcial: Partial<Regra>) {
    setRegras((rs) => rs.map((r, j) => (j === i ? { ...r, ...parcial } : r)));
    setMsg(null);
  }

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    const r = await fetch(`/api/tenants/${tenantId}/push/rules`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: regras }),
    }).catch(() => null);
    setSalvando(false);
    const body = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    if (!r?.ok) return setMsg({ ok: false, texto: body?.error ?? 'Não foi possível salvar.' });
    setMsg({ ok: true, texto: 'Regras salvas.' });
    router.refresh();
  }

  const invalida = regras.some(
    (r) => !r.title.trim() || !r.body.trim() || r.title.length > TITULO_MAX || r.body.length > TEXTO_MAX,
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-2 leading-relaxed max-w-3xl">
        Cada regra avisa os assinantes com fatura em aberto, no dia e hora marcados (horário de Brasília). Uma
        fatura recebe no máximo um aviso de cada regra, e fatura paga não é cobrada: antes de avisar uma fatura
        vencida, o sistema confere no ERP se ela continua em aberto. Tocar no aviso abre a fatura, com o Pix e o
        boleto.
      </p>

      {regras.map((r, i) => (
        <CartaoRegra
          key={r.id ?? `nova-${i}`}
          tenantId={tenantId}
          regra={r}
          configurado={configurado}
          onChange={(p) => mudar(i, p)}
          onRemover={() => setRegras((rs) => rs.filter((_, j) => j !== i))}
        />
      ))}

      <div className="flex items-center gap-3 flex-wrap sticky bottom-0 bg-bg/90 backdrop-blur py-3 -mx-1 px-1">
        <Button type="button" onClick={salvar} loading={salvando} disabled={!alterado || invalida}>
          Salvar regras
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={regras.length >= REGRAS_MAX}
          onClick={() =>
            setRegras((rs) => [
              ...rs,
              { days_offset: -1, send_hour: 9, title: 'Sua fatura vence amanhã', body: 'Olá, {nome}! Sua fatura de {valor} vence amanhã. Toque para pagar.', enabled: false },
            ])
          }
        >
          <Icon name="plus" size={14} /> Nova regra
        </Button>
        {alterado && !msg && <span className="text-xs text-warning">Alterações não salvas</span>}
        {msg && <span className={cn('text-sm', msg.ok ? 'text-success' : 'text-danger')}>{msg.texto}</span>}
      </div>
    </div>
  );
}

function CartaoRegra({
  tenantId,
  regra,
  configurado,
  onChange,
  onRemover,
}: {
  tenantId: string;
  regra: Regra;
  configurado: boolean;
  onChange: (p: Partial<Regra>) => void;
  onRemover: () => void;
}) {
  const texto = useRef<HTMLTextAreaElement>(null);
  const momento = momentoDe(regra.days_offset);
  const dias = Math.abs(regra.days_offset) || 1;

  function mudarMomento(m: Momento, n = dias) {
    onChange({ days_offset: m === 'dia' ? 0 : m === 'antes' ? -n : n });
  }

  return (
    <Card className={cn(!regra.enabled && 'opacity-90')}>
      <CardHeader className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <CardTitle>{descreverQuando(regra.days_offset)}, às {regra.send_hour}h</CardTitle>
          <CardSubtitle>{regra.enabled ? 'Ligada — envia todos os dias neste horário' : 'Desligada — nada é enviado'}</CardSubtitle>
        </div>
        <Interruptor ligado={regra.enabled} onChange={(v) => onChange({ enabled: v })} rotulo="Regra ligada" />
      </CardHeader>
      <CardBody className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Quando">
              <Select value={momento} onChange={(e) => mudarMomento(e.target.value as Momento)}>
                <option value="antes">Antes do vencimento</option>
                <option value="dia">No dia do vencimento</option>
                <option value="depois">Depois do vencimento</option>
              </Select>
            </Field>
            <Field label="Dias">
              <Input
                type="number"
                min={1}
                max={momento === 'antes' ? 30 : 60}
                value={momento === 'dia' ? '' : dias}
                disabled={momento === 'dia'}
                placeholder="—"
                onChange={(e) => mudarMomento(momento, Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
              />
            </Field>
            <Field label="Horário">
              <Select value={regra.send_hour} onChange={(e) => onChange({ send_hour: Number(e.target.value) })}>
                {HORAS.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label className="text-xs font-medium text-fg-2">Título</label>
              <Contador atual={regra.title.length} max={TITULO_MAX} />
            </div>
            <Input value={regra.title} maxLength={TITULO_MAX} onChange={(e) => onChange({ title: e.target.value })} />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label className="text-xs font-medium text-fg-2">Texto</label>
              <Contador atual={regra.body.length} max={TEXTO_MAX} />
            </div>
            <Textarea
              ref={texto}
              rows={3}
              value={regra.body}
              maxLength={TEXTO_MAX + 20}
              onChange={(e) => onChange({ body: e.target.value })}
            />
            <InserirCampo campos={CAMPOS} alvo={texto} valor={regra.body} onChange={(v) => onChange({ body: v })} />
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-1">
            <EnviarTeste tenantId={tenantId} titulo={regra.title} texto={regra.body} configurado={configurado} />
            <Button type="button" variant="ghost" size="sm" onClick={onRemover} className="ml-auto text-danger">
              Remover regra
            </Button>
          </div>
        </div>
        <Previa titulo={regra.title} texto={regra.body} />
      </CardBody>
    </Card>
  );
}

function Interruptor({ ligado, onChange, rotulo }: { ligado: boolean; onChange: (v: boolean) => void; rotulo: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={() => onChange(!ligado)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors shrink-0',
        ligado ? 'bg-brand' : 'bg-bg-3 border border-border-strong',
      )}
    >
      <span
        className={cn(
          'absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-white shadow transition-all',
          ligado ? 'left-[22px]' : 'left-[3px]',
        )}
      />
    </button>
  );
}

/** CPF de um assinante com avisos ativos — pode ser o do próprio provedor. */
function EnviarTeste({
  tenantId,
  titulo,
  texto,
  url,
  configurado,
}: {
  tenantId: string;
  titulo: string;
  texto: string;
  url?: string;
  configurado: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [cpf, setCpf] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function enviar() {
    setEnviando(true);
    setMsg(null);
    const r = await fetch(`/api/tenants/${tenantId}/push/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf, title: titulo, body: texto, url }),
    }).catch(() => null);
    setEnviando(false);
    const body = (await r?.json().catch(() => ({}))) as { error?: string; enviados?: number } | undefined;
    if (!r?.ok) return setMsg({ ok: false, texto: body?.error ?? 'Não foi possível enviar.' });
    setMsg({ ok: true, texto: `Enviado para ${body?.enviados} ${body?.enviados === 1 ? 'aparelho' : 'aparelhos'}.` });
  }

  if (!aberto) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setAberto(true)} disabled={!configurado}>
        <Icon name="send" size={13} /> Enviar teste
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Input
        value={cpf}
        onChange={(e) => setCpf(e.target.value)}
        placeholder="CPF de quem vai receber"
        className="h-8 w-52 text-xs"
        inputMode="numeric"
      />
      <Button type="button" size="sm" onClick={enviar} loading={enviando} disabled={cpf.replace(/\D/g, '').length < 11}>
        Enviar
      </Button>
      {msg && <span className={cn('text-xs', msg.ok ? 'text-success' : 'text-danger')}>{msg.texto}</span>}
    </div>
  );
}

// ─── Envio manual ───────────────────────────────────────────────────────

function AbaEnviar({
  tenantId,
  aparelhos,
  configurado,
  agendadas,
}: {
  tenantId: string;
  aparelhos: number;
  configurado: boolean;
  agendadas: Envio[];
}) {
  const router = useRouter();
  const texto = useRef<HTMLTextAreaElement>(null);
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [url, setUrl] = useState<string>('/');
  const [quando, setQuando] = useState<'agora' | 'agendar'>('agora');
  const [data, setData] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const valido =
    titulo.trim() && corpo.trim() && titulo.length <= TITULO_MAX && corpo.length <= TEXTO_MAX && (quando === 'agora' || data);

  async function enviar() {
    setEnviando(true);
    setMsg(null);
    const r = await fetch(`/api/tenants/${tenantId}/push/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: titulo,
        body: corpo,
        url,
        // datetime-local é a hora do relógio de quem está no painel.
        scheduled_at: quando === 'agendar' ? new Date(data).toISOString() : undefined,
      }),
    }).catch(() => null);
    setEnviando(false);
    setConfirmando(false);
    const body = (await r?.json().catch(() => ({}))) as
      | { error?: string; agendada?: boolean; enviados?: number; falhas?: number }
      | undefined;
    if (!r?.ok) return setMsg({ ok: false, texto: body?.error ?? 'Não foi possível enviar.' });
    setMsg({
      ok: true,
      texto: body?.agendada
        ? 'Mensagem agendada.'
        : `Enviada para ${body?.enviados ?? 0} ${body?.enviados === 1 ? 'aparelho' : 'aparelhos'}${body?.falhas ? ` (${body.falhas} falharam)` : ''}.`,
    });
    setTitulo('');
    setCorpo('');
    setData('');
    router.refresh();
  }

  async function cancelar(id: string) {
    const r = await fetch(`/api/tenants/${tenantId}/push/campaigns/${id}`, { method: 'DELETE' }).catch(() => null);
    if (!r?.ok) {
      const body = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
      setMsg({ ok: false, texto: body?.error ?? 'Não foi possível cancelar.' });
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Nova mensagem</CardTitle>
          <CardSubtitle>Para todos os assinantes com avisos ativos — manutenção, promoção, recado importante</CardSubtitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          <div className="space-y-4">
            <div>
              <div className="flex items-baseline justify-between">
                <label className="text-xs font-medium text-fg-2">Título</label>
                <Contador atual={titulo.length} max={TITULO_MAX} />
              </div>
              <Input value={titulo} maxLength={TITULO_MAX} onChange={(e) => setTitulo(e.target.value)} placeholder="Manutenção programada" />
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label className="text-xs font-medium text-fg-2">Texto</label>
                <Contador atual={corpo.length} max={TEXTO_MAX} />
              </div>
              <Textarea
                ref={texto}
                rows={3}
                value={corpo}
                maxLength={TEXTO_MAX + 20}
                onChange={(e) => setCorpo(e.target.value)}
                placeholder="Olá, {nome}! Na quinta, das 2h às 4h, faremos uma melhoria na rede. A conexão pode oscilar."
              />
              <InserirCampo campos={CAMPOS.slice(0, 1)} alvo={texto} valor={corpo} onChange={setCorpo} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="O toque abre">
                <Select value={url} onChange={(e) => setUrl(e.target.value)}>
                  {DESTINOS.map((d) => (
                    <option key={d.url} value={d.url}>
                      {d.rotulo}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Quando">
                <Select value={quando} onChange={(e) => setQuando(e.target.value as 'agora' | 'agendar')}>
                  <option value="agora">Enviar agora</option>
                  <option value="agendar">Agendar</option>
                </Select>
              </Field>
            </div>
            {quando === 'agendar' && (
              <Field label="Data e hora" hint="Sai em até 15 minutos depois do horário marcado">
                <Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
              </Field>
            )}

            <div className="flex items-center gap-2 flex-wrap pt-1">
              {confirmando ? (
                <>
                  <Button type="button" onClick={enviar} loading={enviando}>
                    {quando === 'agora'
                      ? `Confirmar: enviar para ${aparelhos} ${aparelhos === 1 ? 'aparelho' : 'aparelhos'}`
                      : 'Confirmar agendamento'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setConfirmando(false)}>
                    Voltar
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={() => setConfirmando(true)} disabled={!valido || !configurado}>
                  <Icon name="send" size={14} /> {quando === 'agora' ? 'Enviar' : 'Agendar'}
                </Button>
              )}
              {!confirmando && (
                <EnviarTeste tenantId={tenantId} titulo={titulo} texto={corpo} url={url} configurado={configurado && !!valido} />
              )}
              {msg && <span className={cn('text-sm', msg.ok ? 'text-success' : 'text-danger')}>{msg.texto}</span>}
            </div>
          </div>
          <Previa titulo={titulo} texto={corpo} campos={false} />
        </CardBody>
      </Card>

      {agendadas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Agendadas</CardTitle>
            <CardSubtitle>Dá para cancelar até a hora do envio</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {agendadas.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-md border border-border p-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.title}</div>
                  <div className="text-xs text-fg-2">{dataHora(a.scheduled_at)}</div>
                </div>
                <Button type="button" variant="danger" size="sm" onClick={() => cancelar(a.id)}>
                  Cancelar
                </Button>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ─── Histórico ──────────────────────────────────────────────────────────

function dataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

const STATUS: Record<Envio['status'], { rotulo: string; tom: 'success' | 'info' | 'neutral' | 'warning' }> = {
  sent: { rotulo: 'enviado', tom: 'success' },
  scheduled: { rotulo: 'agendado', tom: 'info' },
  sending: { rotulo: 'enviando', tom: 'warning' },
  cancelled: { rotulo: 'cancelado', tom: 'neutral' },
};

function AbaHistorico({ envios, regras }: { envios: Envio[]; regras: Regra[] }) {
  const regraPorId = new Map(regras.filter((r) => r.id).map((r) => [r.id!, r]));

  if (!envios.length) {
    return (
      <Card>
        <CardBody className="py-10 text-center text-sm text-fg-2">
          Nenhum envio ainda. Os avisos de fatura aparecem aqui, um por regra por dia, quando houver fatura para
          avisar.
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs font-medium text-fg-2 bg-bg-3 border-b border-border">
            <tr>
              <th className="text-left px-4 py-2.5">Mensagem</th>
              <th className="text-left px-4 py-2.5">Quando</th>
              <th className="text-right px-4 py-2.5">Receberam</th>
              <th className="text-right px-4 py-2.5">Tocaram</th>
              <th className="text-right px-4 py-2.5">Falhas</th>
              <th className="text-left px-4 py-2.5">Situação</th>
            </tr>
          </thead>
          <tbody>
            {envios.map((e) => {
              const regra = e.rule_id ? regraPorId.get(e.rule_id) : undefined;
              const taxa = e.enviados ? Math.round((e.toques / e.enviados) * 100) : 0;
              return (
                <tr key={e.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-3 max-w-[360px]">
                    <div className="font-medium truncate">{e.title}</div>
                    <div className="text-xs text-fg-2 mt-0.5">
                      {e.kind === 'rule'
                        ? `Aviso de fatura · ${regra ? descreverQuando(regra.days_offset).toLowerCase() : 'regra removida'}`
                        : `Mensagem · abre ${DESTINOS.find((d) => d.url === e.url)?.rotulo ?? 'Início'}`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-fg-2 whitespace-nowrap">{dataHora(e.sent_at ?? e.scheduled_at)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{e.enviados}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {e.toques}
                    {e.enviados > 0 && <span className="text-fg-3 text-xs"> ({taxa}%)</span>}
                  </td>
                  <td className={cn('px-4 py-3 text-right tabular-nums', e.falhas ? 'text-danger' : 'text-fg-3')}>
                    {e.falhas}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS[e.status].tom}>{STATUS[e.status].rotulo}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
