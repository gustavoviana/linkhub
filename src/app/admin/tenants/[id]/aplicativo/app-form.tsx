'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input, Field, Label } from '@/components/ui/input';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Tenant } from '@/lib/supabase/types';
import type { AppBuild, TenantApp } from '@/lib/tenant/app-config';
import { cn } from '@/lib/utils';

// Aba Aplicativo: a ficha do app do provedor e o botão que gera o pacote
// para a Play Store.
//
// O ícone já vem da marca cadastrada — a imagem aqui é só para quem quer um
// ícone desenhado à parte, que é o normal quando a logo é deitada.

const MAX_ICON_BYTES = 2 * 1024 * 1024;
const PENDING = new Set(['queued', 'running']);

export default function AppForm({
  tenant,
  app,
  saved,
  builds,
  origin,
}: {
  tenant: Tenant;
  app: TenantApp;
  saved: boolean;
  builds: AppBuild[];
  origin: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    app_name: app.app_name,
    package_id: app.package_id,
    icon_url: app.icon_url ?? '',
    theme_color: app.theme_color ?? tenant.primary_color,
    play_signing_sha256: app.play_signing_sha256 ?? '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [building, setBuilding] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const running = builds.find((b) => PENDING.has(b.status));

  // Enquanto há build na fila, a página se atualiza sozinha — o runner leva
  // alguns minutos e ninguém deveria ficar apertando F5.
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => router.refresh(), 15_000);
    return () => window.clearInterval(timer);
  }, [running, router]);

  async function uploadIcon(file: File) {
    if (file.size > MAX_ICON_BYTES) {
      setError('Imagem acima de 2MB. Escolha uma menor.');
      return;
    }
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
    const path = `tenants/${tenant.id}/app-icon-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('tenant-assets')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    setUploading(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    const { data } = supabase.storage.from('tenant-assets').getPublicUrl(path);
    setForm((f) => ({ ...f, icon_url: data.publicUrl }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    const res = await fetch(`/api/tenants/${tenant.id}/app`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_name: form.app_name,
        package_id: form.package_id,
        icon_url: form.icon_url || null,
        theme_color: form.theme_color || null,
        play_signing_sha256: form.play_signing_sha256 || null,
      }),
    });
    setSaving(false);
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(body.error ?? 'Não foi possível salvar.');
      return;
    }
    setOk('Ficha salva.');
    router.refresh();
  }

  async function build() {
    setBuilding(true);
    setError(null);
    setOk(null);
    const res = await fetch(`/api/tenants/${tenant.id}/app/build`, { method: 'POST' });
    setBuilding(false);
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(body.error ?? 'Não foi possível iniciar o build.');
      return;
    }
    setOk('Build na fila. Leva de 5 a 10 minutos.');
    router.refresh();
  }

  const iconPreview = form.icon_url || tenant.favicon_url || tenant.logo_url;

  return (
    <form onSubmit={save} className="p-8 space-y-6 max-w-3xl">
      <Link
        href={`/admin/tenants/${tenant.id}/aplicativo/guia`}
        className="flex items-center gap-3 p-4 rounded-lg border border-brand/30 bg-brand/5 hover:bg-brand/10 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Guia de publicação nas lojas</div>
          <div className="text-xs text-fg-2 mt-0.5 leading-relaxed">
            O passo a passo de Play e App Store com as regras de 2026: o que marcar em cada
            formulário e os textos da ficha já escritos para esta central.
          </div>
        </div>
        <span className="text-brand text-sm font-medium shrink-0">Abrir →</span>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Aplicativo Android</CardTitle>
          <CardSubtitle>
            A central de {tenant.name} empacotada para a Play Store, abrindo {origin}
          </CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Nome na loja" hint="Até 30 caracteres — é o limite da Play.">
              <Input
                value={form.app_name}
                maxLength={30}
                onChange={(e) => setForm({ ...form, app_name: e.target.value })}
                required
              />
            </Field>
            <Field
              label="Identificador do pacote"
              hint={app.keystore_data ? 'Travado: o app já foi assinado.' : 'Não muda depois de publicar.'}
            >
              <Input
                className="font-mono text-sm"
                value={form.package_id}
                disabled={Boolean(app.keystore_data)}
                onChange={(e) => setForm({ ...form, package_id: e.target.value.toLowerCase() })}
                required
              />
            </Field>
          </div>

          <div>
            <Label>Ícone do aplicativo</Label>
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden border border-border flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${tenant.primary_color}, ${tenant.accent_color})` }}
              >
                {iconPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={iconPreview} alt="" className="w-[78%] h-[78%] object-contain" />
                ) : (
                  <span className="text-white text-2xl font-bold">
                    {tenant.name[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <input
                  type="file"
                  id="app-icon"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadIcon(file);
                    e.target.value = '';
                  }}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={uploading}
                    onClick={() => document.getElementById('app-icon')?.click()}
                  >
                    {form.icon_url ? 'Trocar imagem' : 'Enviar imagem'}
                  </Button>
                  {form.icon_url && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, icon_url: '' })}
                      className="text-xs text-fg-2 hover:text-danger"
                    >
                      Voltar para a logo
                    </button>
                  )}
                </div>
                <p className="text-xs text-fg-2 mt-2 leading-relaxed">
                  Sem imagem aqui, o ícone sai da marca já cadastrada — ícone do navegador, ou a
                  logo. Quadrada e a partir de 512×512 fica melhor: logo deitada encolhe muito
                  dentro do quadrado do Android.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Cor da barra do sistema">
              <div className="flex items-stretch">
                <input
                  type="color"
                  value={form.theme_color}
                  onChange={(e) => setForm({ ...form, theme_color: e.target.value })}
                  className="w-12 h-10 rounded-l-md border border-border cursor-pointer"
                />
                <Input
                  className="rounded-l-none font-mono"
                  value={form.theme_color}
                  onChange={(e) => setForm({ ...form, theme_color: e.target.value })}
                />
              </div>
            </Field>
            <Field label="Versão atual">
              <Input value={`${app.version_name} (${app.version_code})`} readOnly className="font-mono" />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verificação do domínio</CardTitle>
          <CardSubtitle>
            Sem isso o app abre com a barra de endereço do navegador em cima
          </CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field
            label="SHA-256 do Play App Signing"
            hint="Play Console › Configuração › Integridade do app › copie a impressão digital SHA-256."
          >
            <Input
              className="font-mono text-xs"
              placeholder="A1:B2:C3:…"
              value={form.play_signing_sha256}
              onChange={(e) => setForm({ ...form, play_signing_sha256: e.target.value.toUpperCase() })}
            />
          </Field>
          <p className="text-xs text-fg-2 leading-relaxed">
            O Google reassina o pacote ao publicar, então a impressão digital só aparece depois do
            primeiro envio. Cole aqui, salve, e o arquivo{' '}
            <a href={`${origin}/.well-known/assetlinks.json`} target="_blank" rel="noreferrer" className="text-brand hover:underline font-mono">
              /.well-known/assetlinks.json
            </a>{' '}
            passa a autorizar o app — sem republicar nada.
          </p>
          {app.keystore_sha256 && (
            <p className="text-xs text-fg-3 font-mono break-all">
              Chave de upload: {app.keystore_sha256}
            </p>
          )}
        </CardBody>
      </Card>

      <div className="flex items-center gap-3 flex-wrap sticky bottom-4 bg-bg-2 border border-border rounded-lg shadow-sm px-5 py-3">
        <Button type="submit" loading={saving}>Salvar ficha</Button>
        <Button type="button" variant="outline" onClick={build} loading={building} disabled={Boolean(running)}>
          {running ? 'Build em andamento…' : 'Gerar pacote Android (.aab)'}
        </Button>
        <a
          href={`/api/tenants/${tenant.id}/app/ios`}
          className="text-sm font-medium text-brand hover:underline"
        >
          Baixar projeto iOS (Xcode)
        </a>
        {ok && <span className="text-sm text-success">{ok}</span>}
        {error && <span className="text-sm text-danger">{error}</span>}
        {!saved && <span className="text-sm text-fg-2">Salve a ficha antes do primeiro build.</span>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aplicativo iOS</CardTitle>
          <CardSubtitle>Projeto pronto para abrir no Xcode — o .ipa sai do seu Mac</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-fg-2 leading-relaxed">
            O download traz um projeto Capacitor com o identificador, o nome, as cores e o ícone
            deste provedor, apontando para {origin}. No Mac:{' '}
            <code className="font-mono text-xs bg-bg-3 px-1.5 py-0.5 rounded">npm install</code> →{' '}
            <code className="font-mono text-xs bg-bg-3 px-1.5 py-0.5 rounded">npx cap add ios</code>{' '}
            → Archive no Xcode. O passo a passo completo vai no LEIA-ME do zip.
          </p>
          <p className="text-sm text-fg-2 leading-relaxed">
            <strong>Antes de submeter:</strong> a Apple reprova app que é só um site embrulhado
            (diretriz 4.2). Notificação de fatura vencendo e entrada por Face ID são o que fazem
            passar — ainda não estão prontos. E quem envia deve ser a conta de desenvolvedor do
            próprio provedor, não a da agência (diretriz 4.2.6).
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Builds</CardTitle>
          <CardSubtitle>O pacote fica guardado — baixe quando for enviar para a loja</CardSubtitle>
        </CardHeader>
        <CardBody>
          {builds.length === 0 ? (
            <p className="text-sm text-fg-2">Nenhum build ainda.</p>
          ) : (
            <div className="space-y-2">
              {builds.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-md border border-border">
                  <StatusBadge status={b.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {b.version_name} <span className="text-fg-3 font-mono">({b.version_code})</span>
                    </div>
                    <div className="text-xs text-fg-2">
                      {new Date(b.created_at).toLocaleString('pt-BR')}
                      {b.artifact_bytes ? ` · ${(b.artifact_bytes / 1024 / 1024).toFixed(1)} MB` : ''}
                    </div>
                    {b.error && <div className="text-xs text-danger mt-1 break-words">{b.error}</div>}
                  </div>
                  {b.run_url && (
                    <a href={b.run_url} target="_blank" rel="noreferrer" className="text-xs text-fg-2 hover:text-brand">
                      log ↗
                    </a>
                  )}
                  {b.status === 'done' && b.artifact_path && (
                    <a
                      href={`/api/tenants/${tenant.id}/app/download/${b.id}`}
                      className="text-sm font-medium text-brand hover:underline whitespace-nowrap"
                    >
                      Baixar .aab
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </form>
  );
}

function StatusBadge({ status }: { status: AppBuild['status'] }) {
  const map: Record<string, { tone: 'success' | 'info' | 'danger'; label: string }> = {
    done: { tone: 'success', label: 'pronto' },
    queued: { tone: 'info', label: 'na fila' },
    running: { tone: 'info', label: 'gerando' },
    error: { tone: 'danger', label: 'erro' },
  };
  const meta = map[status] ?? map.error!;
  return (
    <Badge tone={meta.tone}>
      <span className={cn(PENDING.has(status) && 'animate-pulse')}>{meta.label}</span>
    </Badge>
  );
}
