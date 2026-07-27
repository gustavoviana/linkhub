'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Tenant } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { Icon } from '@/components/portal/icons';

export default function SettingsForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [requirePassword, setRequirePassword] = useState(tenant.portal_require_password === true);
  const [legalName, setLegalName] = useState(tenant.legal_name ?? '');
  const [cnpj, setCnpj] = useState(tenant.cnpj ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const r = await fetch(`/api/tenants/${tenant.id}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portal_require_password: requirePassword,
        legal_name: legalName.trim() || null,
        cnpj: cnpj.trim() || null,
      }),
    }).catch(() => null);
    setSaving(false);
    if (!r) return setError('Não conseguimos falar com o servidor.');
    if (!r.ok) return setError(await r.text());
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Como o cliente entra na central</CardTitle>
          <CardSubtitle>Vale para todos os assinantes deste provedor</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="space-y-2">
            <Option
              selected={!requirePassword}
              onSelect={() => setRequirePassword(false)}
              title="Somente CPF"
              badge="padrão"
              desc="O assinante digita o CPF e entra. É o comportamento da maioria das centrais do mercado — menos atrito, menos ligação para o suporte."
            />
            <Option
              selected={requirePassword}
              onSelect={() => setRequirePassword(true)}
              title="CPF e senha"
              desc="Exige senha além do CPF. A senha é definida pelo assinante no primeiro acesso e pode ser redefinida por você na tela de Clientes."
            />
          </div>

          {!requirePassword && (
            <div className="flex gap-3 p-4 rounded-md bg-warning/10 border border-warning/25">
              <span className="text-warning shrink-0 mt-0.5">
                <Icon name="shield" size={16} />
              </span>
              <p className="text-xs text-fg-2 leading-relaxed m-0">
                Com acesso só por CPF, qualquer pessoa que souber o CPF do seu assinante vê as
                faturas, o endereço e o contrato dele. CPF não é um dado secreto no Brasil — a
                responsabilidade pelo tratamento desses dados é sua perante a LGPD. Continuamos
                bloqueando varredura automatizada, mas isso não substitui uma senha.
              </p>
            </div>
          )}

          {error && <div className="text-sm text-danger bg-danger/10 rounded-md p-3">{error}</div>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados cadastrais</CardTitle>
          <CardSubtitle>Aparecem em documentos e no rodapé da central</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Razão social">
              <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="LM Net Comunicações LTDA" />
            </Field>
            <Field label="CNPJ">
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </Field>
          </div>
          <Field label="Subdomínio" hint="Trocar o subdomínio quebraria o link já divulgado aos assinantes. Fale com o suporte se precisar.">
            <Input value={tenant.slug} disabled />
          </Field>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3 sticky bottom-4 bg-bg-2 border border-border rounded-lg shadow-sm px-5 py-3">
        <Button type="button" onClick={save} loading={saving}>Salvar configurações</Button>
        {saved && <span className="text-sm text-success">✓ Salvo</span>}
      </div>
    </div>
  );
}

function Option({
  selected,
  onSelect,
  title,
  desc,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  desc: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-md border-2 transition-colors ${
        selected ? 'border-brand bg-brand/5' : 'border-border hover:border-fg-3'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
            selected ? 'border-brand' : 'border-fg-3'
          }`}
        >
          {selected && <span className="w-2 h-2 rounded-full bg-brand" />}
        </span>
        <span className="font-semibold text-sm">{title}</span>
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-3 text-fg-2 font-semibold uppercase tracking-wide">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-fg-2 leading-relaxed m-0 pl-6">{desc}</p>
    </button>
  );
}
