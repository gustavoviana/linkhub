'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatBRL, formatDate, cn } from '@/lib/utils';
import type { ProviderDetail as Detail } from '@/lib/platform/data';
import type { BillingStatus, ChargeStatus, TenantStatus } from '@/lib/supabase/types';
import { PasswordGenerator } from '@/components/ui/password-generator';
import { Icon } from '@/components/portal/icons';
import { CredencialGerada } from '../../credencial';
import { TenantStatusBadge } from '../../status-badge';

const SITUACOES: { value: TenantStatus; label: string; hint: string }[] = [
  { value: 'trial', label: 'Em teste', hint: 'Central no ar, sem cobrança' },
  { value: 'active', label: 'Ativo', hint: 'Cliente pagante' },
  { value: 'suspended', label: 'Suspenso', hint: 'Corta o acesso à central' },
  { value: 'cancelled', label: 'Cancelado', hint: 'Encerrou o contrato' },
];

const ASSINATURAS: { value: BillingStatus; label: string }[] = [
  { value: 'trial', label: 'Em teste' },
  { value: 'active', label: 'Ativa' },
  { value: 'past_due', label: 'Em atraso' },
  { value: 'cancelled', label: 'Cancelada' },
];

const CHARGE_TONE: Record<ChargeStatus, 'success' | 'info' | 'danger' | 'neutral'> = {
  paid: 'success',
  open: 'info',
  overdue: 'danger',
  cancelled: 'neutral',
};

const CHARGE_LABEL: Record<ChargeStatus, string> = {
  paid: 'paga',
  open: 'em aberto',
  overdue: 'vencida',
  cancelled: 'cancelada',
};

function reais(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function centavos(v: string) {
  const limpo = v.replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  return Math.round((Number.parseFloat(limpo) || 0) * 100);
}

export default function ProviderDetail({ data }: { data: Detail }) {
  const router = useRouter();
  const { tenant, billing, admins, charges, customers } = data;

  const [status, setStatus] = useState<TenantStatus>(tenant.status);
  const [valor, setValor] = useState(reais(billing.monthly_amount_cents));
  const [dia, setDia] = useState(String(billing.billing_day));
  const [assinatura, setAssinatura] = useState<BillingStatus>(billing.status);
  const [notas, setNotas] = useState(billing.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [novaSenha, setNovaSenha] = useState<{ email: string; password: string | null } | null>(null);
  const [trabalhando, setTrabalhando] = useState<string | null>(null);
  const [novoEmail, setNovoEmail] = useState('');

  // Redefinição de senha: abre o gerador para o administrador escolhido.
  const [gerandoPara, setGerandoPara] = useState<{ userId: string; email: string } | null>(null);
  const [senhaEscolhida, setSenhaEscolhida] = useState('');

  const [excluindo, setExcluindo] = useState(false);
  const [confirmacao, setConfirmacao] = useState('');
  const [removendo, setRemovendo] = useState(false);

  async function salvar() {
    setSaving(true);
    setError(null);
    setOk(null);
    const r = await fetch(`/api/platform/providers/${tenant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        billing: {
          monthly_amount_cents: centavos(valor),
          billing_day: Number(dia) || 10,
          status: assinatura,
          notes: notas.trim() || null,
        },
      }),
    }).catch(() => null);
    setSaving(false);
    if (!r) return setError('Não conseguimos falar com o servidor.');
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return setError(body.error ?? 'Não foi possível salvar.');
    setOk('Salvo.');
    router.refresh();
  }

  async function redefinirSenha(userId: string) {
    setTrabalhando(userId);
    setError(null);
    const r = await fetch(`/api/platform/providers/${tenant.id}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, password: senhaEscolhida || undefined }),
    }).catch(() => null);
    setTrabalhando(null);
    if (!r) return setError('Não conseguimos falar com o servidor.');
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return setError(body.error ?? 'Não foi possível redefinir a senha.');
    setNovaSenha({ email: body.email, password: body.password });
    setGerandoPara(null);
    setSenhaEscolhida('');
  }

  async function excluirProvedor() {
    setRemovendo(true);
    setError(null);
    const r = await fetch(`/api/platform/providers/${tenant.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: confirmacao.trim() }),
    }).catch(() => null);
    setRemovendo(false);
    if (!r) return setError('Não conseguimos falar com o servidor.');
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return setError(body.error ?? 'Não foi possível excluir o provedor.');
    router.replace('/plataforma/provedores');
    router.refresh();
  }

  async function adicionarAdmin(e: React.FormEvent) {
    e.preventDefault();
    setTrabalhando('novo');
    setError(null);
    const r = await fetch(`/api/platform/providers/${tenant.id}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: novoEmail.trim(), role: 'admin' }),
    }).catch(() => null);
    setTrabalhando(null);
    if (!r) return setError('Não conseguimos falar com o servidor.');
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return setError(body.error ?? 'Não foi possível adicionar o acesso.');
    setNovaSenha({ email: body.email, password: body.password });
    setNovoEmail('');
    router.refresh();
  }

  async function mudarCobranca(id: string, novo: ChargeStatus) {
    setTrabalhando(id);
    setError(null);
    const r = await fetch(`/api/platform/charges/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novo }),
    }).catch(() => null);
    setTrabalhando(null);
    if (!r?.ok) return setError('Não foi possível atualizar a cobrança.');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {novaSenha && (
        <Card>
          <CardHeader>
            <CardTitle>Senha gerada</CardTitle>
            <CardSubtitle>Entregue ao responsável por um canal seguro</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <CredencialGerada email={novaSenha.email} password={novaSenha.password} />
            <Button type="button" variant="outline" size="sm" onClick={() => setNovaSenha(null)}>
              Fechar
            </Button>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Situação e mensalidade</CardTitle>
          <CardSubtitle>
            Suspender corta o acesso à central de {customers} assinante(s) deste provedor
          </CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <div>
            <div className="text-xs font-medium text-fg-2 mb-2">Situação do provedor</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SITUACOES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={cn(
                    'text-left p-3 rounded-md border transition-colors',
                    status === s.value ? 'border-brand bg-brand/5' : 'border-border hover:border-fg-3',
                  )}
                >
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-[11px] text-fg-2 leading-snug mt-0.5">{s.hint}</div>
                </button>
              ))}
            </div>
            {status === 'suspended' && tenant.status !== 'suspended' && (
              <p className="text-xs text-warning mt-2 leading-relaxed">
                Ao salvar, a central deste provedor sai do ar para os assinantes dele.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Mensalidade" hint="Em reais">
              <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="149,90" />
            </Field>
            <Field label="Dia do vencimento" hint="De 1 a 28">
              <Input type="number" min={1} max={28} value={dia} onChange={(e) => setDia(e.target.value)} />
            </Field>
            <Field label="Assinatura">
              <select
                value={assinatura}
                onChange={(e) => setAssinatura(e.target.value as BillingStatus)}
                className="w-full h-10 px-3 rounded-md border border-border bg-bg-2 text-sm"
              >
                {ASSINATURAS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Observações" hint="Combinados, desconto, condição especial">
            <Input value={notas} onChange={(e) => setNotas(e.target.value)} />
          </Field>

          <div className="flex items-center gap-3 flex-wrap">
            <Button type="button" onClick={salvar} loading={saving}>
              Salvar
            </Button>
            <Link href={`/admin/tenants/${tenant.id}`} className="text-sm text-brand hover:underline">
              Abrir o painel deste provedor
            </Link>
            {ok && <span className="text-sm text-success">{ok}</span>}
          </div>

          {error && <div className="text-sm text-danger bg-danger/10 rounded-md p-3">{error}</div>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acessos ao painel</CardTitle>
          <CardSubtitle>Quem administra este provedor, e a senha de cada um</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {admins.map((a) => (
            <div key={a.user_id} className="rounded-md border border-border">
              <div className="flex items-center gap-3 p-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.email ?? 'sem e-mail'}</div>
                  <div className="text-xs text-fg-2">
                    {a.role}
                    {a.last_sign_in_at
                      ? ` · último acesso ${new Date(a.last_sign_in_at).toLocaleDateString('pt-BR')}`
                      : ' · nunca entrou'}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setGerandoPara(
                      gerandoPara?.userId === a.user_id
                        ? null
                        : { userId: a.user_id, email: a.email ?? '' },
                    )
                  }
                >
                  {gerandoPara?.userId === a.user_id ? 'Cancelar' : 'Redefinir senha'}
                </Button>
              </div>

              {gerandoPara?.userId === a.user_id && (
                <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border">
                  <PasswordGenerator
                    value={senhaEscolhida}
                    onChange={setSenhaEscolhida}
                    label="Senha nova"
                  />
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      loading={trabalhando === a.user_id}
                      disabled={senhaEscolhida.length < 12}
                      onClick={() => redefinirSenha(a.user_id)}
                    >
                      Aplicar esta senha
                    </Button>
                    <span className="text-xs text-fg-2">
                      Ela substitui a senha atual de {a.email} na hora.
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
          {admins.length === 0 && (
            <p className="text-sm text-fg-2">Nenhum acesso cadastrado para este provedor.</p>
          )}

          <form onSubmit={adicionarAdmin} className="flex gap-2 items-end pt-2 border-t border-border flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <Field label="Adicionar acesso" hint="Cria a conta e devolve a senha">
                <Input
                  required
                  type="email"
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  placeholder="pessoa@provedor.com.br"
                />
              </Field>
            </div>
            <Button type="submit" variant="outline" loading={trabalhando === 'novo'}>
              Adicionar
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mensalidades</CardTitle>
          <CardSubtitle>Histórico de cobranças deste provedor</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {charges.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-md border border-border flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">
                  {new Date(`${c.reference_month}T12:00:00`).toLocaleDateString('pt-BR', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
                <div className="text-xs text-fg-2">
                  vence {formatDate(c.due_date)} · {formatBRL(c.amount_cents)}
                  {c.paid_at && ` · pago em ${new Date(c.paid_at).toLocaleDateString('pt-BR')}`}
                </div>
              </div>
              <Badge tone={CHARGE_TONE[c.status]}>{CHARGE_LABEL[c.status]}</Badge>
              {c.status !== 'paid' && c.status !== 'cancelled' && (
                <Button
                  type="button"
                  size="sm"
                  loading={trabalhando === c.id}
                  onClick={() => mudarCobranca(c.id, 'paid')}
                >
                  Dar baixa
                </Button>
              )}
              {c.status === 'paid' && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  loading={trabalhando === c.id}
                  onClick={() => mudarCobranca(c.id, 'open')}
                >
                  Desfazer
                </Button>
              )}
            </div>
          ))}
          {charges.length === 0 && (
            <p className="text-sm text-fg-2">
              Nenhuma cobrança emitida. As mensalidades saem em Faturamento, no botão de emitir o mês.
            </p>
          )}
        </CardBody>
      </Card>

      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle>Excluir provedor</CardTitle>
          <CardSubtitle>Some tudo, e não tem desfazer</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {!excluindo ? (
            <>
              <p className="text-sm text-fg-2 leading-relaxed">
                Antes de excluir, considere <strong className="text-fg">suspender</strong>: corta o
                acesso do mesmo jeito e guarda os dados, caso o cliente volte. Excluir apaga em
                cascata os {customers} assinante(s), os contratos, as faturas, os chamados, os
                planos e a chave que assina o aplicativo publicado nas lojas.
              </p>
              <Button type="button" variant="outline" onClick={() => setExcluindo(true)}>
                Quero excluir este provedor
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-md border border-danger/30 bg-danger/5 p-3.5 space-y-2">
                <div className="flex items-start gap-2">
                  <Icon name="x" size={15} />
                  <div className="text-sm text-fg leading-relaxed">
                    <strong className="font-semibold">Isto apaga {tenant.name} para sempre.</strong>{' '}
                    Os {customers} assinante(s) perdem a central, e o aplicativo publicado nas lojas
                    fica sem como ser atualizado, porque a chave de assinatura vai junto.
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-fg-2 mb-1.5">
                  Para confirmar, digite <code className="font-mono text-fg">{tenant.slug}</code>
                </label>
                <Input
                  className="font-mono"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  placeholder={tenant.slug}
                  autoComplete="off"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="danger"
                  loading={removendo}
                  disabled={confirmacao.trim().toLowerCase() !== tenant.slug.toLowerCase()}
                  onClick={excluirProvedor}
                >
                  Excluir definitivamente
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setExcluindo(false);
                    setConfirmacao('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <div className="text-xs text-fg-3">
        Provedor criado em {new Date(tenant.created_at).toLocaleDateString('pt-BR')} ·{' '}
        <TenantStatusBadge status={tenant.status} />
      </div>
    </div>
  );
}
