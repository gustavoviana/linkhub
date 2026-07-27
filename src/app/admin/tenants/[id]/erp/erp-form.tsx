'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Field, Label } from '@/components/ui/input';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Tenant, ErpType } from '@/lib/supabase/types';
import type { MaskedErpConfig } from '@/lib/erp/crypto';
import { cn } from '@/lib/utils';

const ERPS: { id: ErpType; name: string; desc: string }[] = [
  { id: 'ixc', name: 'IXC Soft', desc: 'Auth via Base64(usuário:apiKey)' },
  { id: 'sgp', name: 'SGP', desc: 'App + token da API Central do Assinante' },
  { id: 'hubsoft', name: 'Hubsoft', desc: 'OAuth2 password grant' },
  { id: 'mk_solutions', name: 'MK Solutions', desc: 'Em breve' },
  { id: 'mock', name: 'Dados de teste', desc: 'Use enquanto integra. Mostra dados fictícios.' },
];

export default function ErpForm({ tenant, masked }: { tenant: Tenant; masked: MaskedErpConfig }) {
  const router = useRouter();
  const [type, setType] = useState<ErpType>(tenant.erp_type);
  const [cfg, setCfg] = useState<any>(masked.config ?? {});
  // Segredo já salvo aparece como campo vazio com aviso; só é reenviado se o
  // admin digitar algo novo.
  const savedSecret = (field: string) => !!masked.saved?.[type]?.[field] && !cfg?.[type]?.[field];
  const secretHint = (field: string) =>
    savedSecret(field) ? 'Salvo. Deixe em branco para manter, ou digite um novo.' : undefined;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string } | null>(null);

  function updateCfg(key: string, value: string) {
    setCfg((c: any) => ({ ...c, [type]: { ...(c[type] ?? {}), [key]: value } }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    // Credencial de ERP não é gravada pelo browser — vai pelo servidor, que
    // valida papel e formato antes de escrever.
    const r = await fetch(`/api/tenants/${tenant.id}/erp`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ erp_type: type, erp_config: cfg }),
    });
    setSaving(false);
    if (!r.ok) { setError(await r.text()); return; }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    const r = await fetch(`/api/tenants/${tenant.id}/erp/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ erp_type: type, erp_config: cfg }),
    });
    setTesting(false);
    if (!r.ok) {
      setTestResult({ ok: false, message: await r.text() });
      return;
    }
    setTestResult(await r.json());
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Escolha o ERP</CardTitle>
          <CardSubtitle>Selecione o sistema de gestão que seu provedor usa</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {ERPS.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setType(e.id)}
                className={cn(
                  'p-4 rounded-md border-2 text-left transition-all',
                  type === e.id ? 'border-brand bg-brand/5' : 'border-border hover:border-fg-3',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{e.name}</span>
                  {tenant.erp_type === e.id && <Badge tone="success">ativo</Badge>}
                </div>
                <p className="text-xs text-fg-2">{e.desc}</p>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {type !== 'mock' && (
        <Card>
          <CardHeader>
            <CardTitle>Credenciais</CardTitle>
            <CardSubtitle>
              Configure a integração. As credenciais são gravadas pelo servidor e não ficam
              acessíveis pela chave pública do portal.
            </CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {type === 'ixc' && (
              <>
                <Field label="Base URL" hint="Ex: https://central.seuprovedor.com.br (sem barra final)">
                  <Input
                    value={cfg.ixc?.baseUrl ?? ''}
                    onChange={(e) => updateCfg('baseUrl', e.target.value)}
                    placeholder="https://central.seuprovedor.com.br"
                  />
                </Field>
                <Field
                  label="Token (Base64 de usuário:apiKey)"
                  hint={secretHint('token') ?? 'Gere no IXC em Configurações → Integrações → Webservice'}
                >
                  <Input
                    type="password"
                    placeholder={savedSecret('token') ? '••••••••••••' : undefined}
                    value={cfg.ixc?.token ?? ''}
                    onChange={(e) => updateCfg('token', e.target.value)}
                  />
                </Field>
              </>
            )}

            {type === 'sgp' && (
              <>
                <Field label="Base URL" hint="Ex: https://seu-provedor.sgp.net.br">
                  <Input
                    value={cfg.sgp?.baseUrl ?? ''}
                    onChange={(e) => updateCfg('baseUrl', e.target.value)}
                  />
                </Field>
                <Field label="App">
                  <Input
                    value={cfg.sgp?.app ?? ''}
                    onChange={(e) => updateCfg('app', e.target.value)}
                  />
                </Field>
                <Field label="Token" hint={secretHint('token')}>
                  <Input
                    type="password"
                    placeholder={savedSecret('token') ? '••••••••••••' : undefined}
                    value={cfg.sgp?.token ?? ''}
                    onChange={(e) => updateCfg('token', e.target.value)}
                  />
                </Field>
              </>
            )}

            {type === 'hubsoft' && (
              <>
                <Field label="Base URL">
                  <Input
                    value={cfg.hubsoft?.baseUrl ?? ''}
                    onChange={(e) => updateCfg('baseUrl', e.target.value)}
                    placeholder="https://api.seuprovedor.hubsoft.com.br"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Client ID">
                    <Input
                      value={cfg.hubsoft?.clientId ?? ''}
                      onChange={(e) => updateCfg('clientId', e.target.value)}
                    />
                  </Field>
                  <Field label="Client Secret" hint={secretHint('clientSecret')}>
                    <Input
                      type="password"
                      placeholder={savedSecret('clientSecret') ? '••••••••' : undefined}
                      value={cfg.hubsoft?.clientSecret ?? ''}
                      onChange={(e) => updateCfg('clientSecret', e.target.value)}
                    />
                  </Field>
                  <Field label="Usuário">
                    <Input
                      value={cfg.hubsoft?.username ?? ''}
                      onChange={(e) => updateCfg('username', e.target.value)}
                    />
                  </Field>
                  <Field label="Senha" hint={secretHint('password')}>
                    <Input
                      type="password"
                      placeholder={savedSecret('password') ? '••••••••' : undefined}
                      value={cfg.hubsoft?.password ?? ''}
                      onChange={(e) => updateCfg('password', e.target.value)}
                    />
                  </Field>
                </div>
              </>
            )}

            <div className="flex gap-2 items-center pt-2">
              <Button type="button" variant="outline" size="sm" onClick={testConnection} loading={testing}>
                Testar conexão
              </Button>
              {testResult && (
                <span className={cn('text-sm', testResult.ok ? 'text-success' : 'text-danger')}>
                  {testResult.ok ? '✓ Conexão OK' : `✗ ${testResult.message}`}
                </span>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="flex gap-3 items-center sticky bottom-0 bg-bg-2 border-t border-border -mx-8 px-8 py-3">
        <Button onClick={save} loading={saving}>Salvar integração</Button>
        {saved && <span className="text-sm text-success">✓ Salvo</span>}
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>
    </div>
  );
}
