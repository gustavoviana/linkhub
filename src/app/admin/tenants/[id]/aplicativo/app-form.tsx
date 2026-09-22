'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input, Field, Label } from '@/components/ui/input';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/page-header';
import { Icon } from '@/components/portal/icons';
import { CopyLink } from '../copy-link';
import type { Tenant } from '@/lib/supabase/types';
import type { AppBuild, TenantApp } from '@/lib/tenant/app-config';
import { cn } from '@/lib/utils';

// Aba Aplicativo: a ficha do app do provedor e o botão que gera o pacote
// para a Play Store.
//
// A tela é de duas colunas: o formulário à esquerda e, à direita, a prévia do
// que o provedor está editando — o ícone na tela do celular e a ficha como ela
// aparece na loja. O ícone é a única decisão desta tela que não dá para
// conferir lendo: ou você vê, ou descobre depois de publicar.
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
  // Quadrada = ícone pronto, e é assim que a rota /icons o entrega: inteiro,
  // sem o gradiente da marca atrás. O preview segue a mesma regra para não
  // prometer uma coisa e o celular mostrar outra.
  const [iconeQuadrado, setIconeQuadrado] = useState(false);
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
  const cadastroIncompleto = !tenant.cnpj || !tenant.support_email;

  return (
    <form onSubmit={save}>
      <PageHeader
        eyebrow="Aplicativo"
        title="App do seu provedor"
        description={
          <>
            A central de {tenant.name} empacotada para a Play Store, abrindo{' '}
            <span className="font-mono text-fg">{origin}</span>.
          </>
        }
        actions={
          <>
            <Button type="button" variant="outline" onClick={build} loading={building} disabled={Boolean(running)}>
              {running ? 'Build em andamento…' : 'Gerar pacote .aab'}
            </Button>
            <Button type="submit" loading={saving}>
              Salvar ficha
            </Button>
          </>
        }
      />

      {(ok || error || !saved) && (
        <div className="px-6 lg:px-8 pt-5">
          {error && <Aviso tom="danger" icone="shield">{error}</Aviso>}
          {ok && <Aviso tom="success" icone="check">{ok}</Aviso>}
          {!saved && !error && !ok && (
            <Aviso tom="warning" icone="file">
              Salve a ficha antes de gerar o primeiro pacote.
            </Aviso>
          )}
        </div>
      )}

      <div className="px-6 lg:px-8 py-6 grid xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        {/* ------------------------------------------------------ formulário */}
        <div className="space-y-5 min-w-0">
          <Link
            href={`/admin/tenants/${tenant.id}/aplicativo/guia`}
            className="group flex items-center gap-4 p-4 rounded-[14px] border border-brand/25 bg-brand/[0.06] hover:bg-brand/10 hover:border-brand/40 transition-colors"
          >
            <span className="w-10 h-10 rounded-[11px] bg-brand/12 text-brand flex items-center justify-center shrink-0">
              <Icon name="help" size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold tracking-[-0.01em]">
                Guia de publicação nas lojas
              </span>
              <span className="block text-[12.5px] text-fg-2 mt-1 leading-relaxed">
                O passo a passo de Play e App Store com as regras de 2026: o que marcar em cada
                formulário e os textos da ficha já escritos para esta central.
              </span>
            </span>
            <span className="text-brand shrink-0 group-hover:translate-x-0.5 transition-transform">
              <Icon name="arrow-right" size={16} />
            </span>
          </Link>

          <Card>
            <CardHeader>
              <CardTitle>Identidade na loja</CardTitle>
              <CardSubtitle>Nome, ícone e cor que o assinante vê no celular</CardSubtitle>
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
                    className="font-mono text-[13px]"
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
                  <IconePreview
                    tenant={tenant}
                    src={iconPreview}
                    quadrado={iconeQuadrado}
                    onQuadrado={setIconeQuadrado}
                    size={80}
                    radius={22}
                  />
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
                          className="text-xs font-medium text-fg-2 hover:text-danger transition-colors"
                        >
                          Voltar para a logo
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-fg-2 mt-2.5 leading-relaxed">
                      Sem imagem aqui, o ícone sai da marca já cadastrada — ícone do navegador, ou a
                      logo.{' '}
                      <strong className="font-semibold text-fg">
                        Imagem quadrada entra inteira, do jeito que você enviou
                      </strong>
                      , a partir de 512×512. Logo deitada não preenche o quadrado do Android, então
                      ela é centralizada sobre as cores da marca.
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
                      aria-label="Escolher a cor da barra do sistema"
                      className="w-12 h-11 rounded-l-[10px] border border-border-strong border-r-0 cursor-pointer bg-bg"
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
              <CardSubtitle>Sem isso o app abre com a barra de endereço do navegador em cima</CardSubtitle>
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
                O Google reassina o pacote ao publicar, então a impressão digital só aparece depois
                do primeiro envio. Cole aqui, salve, e o arquivo{' '}
                <a
                  href={`${origin}/.well-known/assetlinks.json`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand hover:underline font-mono"
                >
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

          <Card>
            <CardHeader>
              <CardTitle>Documentos para as lojas</CardTitle>
              <CardSubtitle>
                Publicados no domínio de {tenant.name}, sempre atualizados com o cadastro
              </CardSubtitle>
            </CardHeader>
            <CardBody className="space-y-5">
              <div>
                <Label>Política de privacidade</Label>
                <CopyLink url={`${origin}/privacidade`} />
                <p className="text-xs text-fg-2 mt-2 leading-relaxed">
                  Obrigatória nas duas lojas, e o item que mais atrasa envio. Cole este endereço no
                  campo de política de privacidade da Play e da App Store — não precisa publicar
                  nada em outro lugar.
                </p>
              </div>

              <div>
                <Label>Termos de uso</Label>
                <CopyLink url={`${origin}/termos`} />
                <p className="text-xs text-fg-2 mt-2 leading-relaxed">
                  Opcional nas lojas, mas a Play tem campo para ele — e app que mostra cobrança sem
                  regras escritas chama atenção na revisão.
                </p>
              </div>

              {cadastroIncompleto && (
                <div className="text-xs leading-relaxed rounded-[10px] bg-warning/10 border border-warning/25 p-3.5">
                  <span className="font-semibold text-warning">
                    Complete o cadastro antes de enviar às lojas.
                  </span>{' '}
                  {[!tenant.cnpj && 'o CNPJ', !tenant.support_email && 'o e-mail de suporte']
                    .filter(Boolean)
                    .join(' e ')}{' '}
                  {!tenant.cnpj && !tenant.support_email ? 'estão' : 'está'} em branco em{' '}
                  <Link
                    href={`/admin/tenants/${tenant.id}/configuracoes`}
                    className="text-brand hover:underline font-semibold"
                  >
                    Configurações
                  </Link>
                  . As páginas continuam no ar sem esses dados — a frase se reorganiza sem eles —,
                  mas a Play cobra o CNPJ da empresa responsável e a LGPD exige um canal de contato
                  do titular dos dados.
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aplicativo iOS</CardTitle>
              <CardSubtitle>Projeto pronto para abrir no Xcode — o .ipa sai do seu Mac</CardSubtitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-[13px] text-fg-2 leading-relaxed">
                O download traz um projeto Capacitor com o identificador, o nome, as cores e o ícone
                deste provedor, apontando para {origin}. No Mac:{' '}
                <code className="font-mono text-[11.5px] bg-bg-3 border border-border px-1.5 py-0.5 rounded">
                  npm install
                </code>{' '}
                →{' '}
                <code className="font-mono text-[11.5px] bg-bg-3 border border-border px-1.5 py-0.5 rounded">
                  npx cap add ios
                </code>{' '}
                → Archive no Xcode. O passo a passo completo vai no LEIA-ME do zip.
              </p>
              <p className="text-[13px] text-fg-2 leading-relaxed">
                <strong className="font-semibold text-fg">Antes de submeter:</strong> a Apple reprova
                app que é só um site embrulhado (diretriz 4.2). Notificação de fatura vencendo e
                entrada por Face ID são o que fazem passar — ainda não estão prontos. E quem envia
                deve ser a conta de desenvolvedor do próprio provedor, não a da agência (diretriz
                4.2.6).
              </p>
              <a
                href={`/api/tenants/${tenant.id}/app/ios`}
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-brand hover:underline mt-1"
              >
                <Icon name="download" size={15} />
                Baixar projeto iOS (Xcode)
              </a>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Builds</CardTitle>
              <CardSubtitle>O pacote fica guardado — baixe quando for enviar para a loja</CardSubtitle>
            </CardHeader>
            <CardBody>
              {builds.length === 0 ? (
                <div className="flex items-center gap-3.5 py-2">
                  <span className="w-10 h-10 rounded-[11px] bg-bg-3 text-fg-3 flex items-center justify-center shrink-0">
                    <Icon name="file" size={18} />
                  </span>
                  <div>
                    <div className="text-[13px] font-semibold">Nenhum pacote gerado ainda</div>
                    <div className="text-xs text-fg-2 mt-0.5">
                      Salve a ficha e clique em “Gerar pacote .aab” lá em cima. Leva de 5 a 10
                      minutos.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {builds.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-3 p-3 rounded-[10px] border border-border bg-bg/40"
                    >
                      <StatusBadge status={b.status} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold">
                          {b.version_name}{' '}
                          <span className="text-fg-3 font-mono font-normal">({b.version_code})</span>
                        </div>
                        <div className="text-[11.5px] text-fg-3 mt-0.5">
                          {new Date(b.created_at).toLocaleString('pt-BR')}
                          {b.artifact_bytes ? ` · ${(b.artifact_bytes / 1024 / 1024).toFixed(1)} MB` : ''}
                        </div>
                        {b.error && <div className="text-[11.5px] text-danger mt-1 break-words">{b.error}</div>}
                      </div>
                      {b.run_url && (
                        <a
                          href={b.run_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11.5px] text-fg-3 hover:text-fg transition-colors"
                        >
                          log ↗
                        </a>
                      )}
                      {b.status === 'done' && b.artifact_path && (
                        <a
                          href={`/api/tenants/${tenant.id}/app/download/${b.id}`}
                          className="text-[13px] font-semibold text-brand hover:underline whitespace-nowrap"
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
        </div>

        {/* --------------------------------------------------------- prévia */}
        <aside className="xl:sticky xl:top-[124px] space-y-4">
          <div className="lh-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Icon name="phone" size={14} className="text-fg-3" />
              <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-fg-3">
                Na tela do celular
              </span>
            </div>

            {/* A cor de fundo é a que o provedor escolheu para a barra do
                sistema: é assim que o ícone vai aparecer de verdade. */}
            <div
              className="p-7 flex flex-col items-center"
              style={{ background: `linear-gradient(160deg, ${form.theme_color}22, transparent 70%)` }}
            >
              <IconePreview
                tenant={tenant}
                src={iconPreview}
                quadrado={iconeQuadrado}
                onQuadrado={setIconeQuadrado}
                size={72}
                radius={18}
              />
              <div className="mt-2.5 text-[12px] font-semibold text-center max-w-[92px] truncate">
                {form.app_name || tenant.name}
              </div>
            </div>

            <div className="p-4 border-t border-border">
              <div className="flex items-start gap-3">
                <IconePreview
                  tenant={tenant}
                  src={iconPreview}
                  quadrado={iconeQuadrado}
                  onQuadrado={setIconeQuadrado}
                  size={48}
                  radius={12}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold truncate">{form.app_name || tenant.name}</div>
                  <div className="text-[11px] text-fg-2 truncate mt-0.5">
                    {tenant.legal_name || tenant.name}
                  </div>
                  <div className="text-[10.5px] text-fg-3 font-mono truncate mt-1">
                    {form.package_id}
                  </div>
                </div>
              </div>
              <div className="mt-3 h-8 rounded-lg bg-brand text-brand-fg text-[12px] font-bold flex items-center justify-center">
                Instalar
              </div>
              <p className="text-[10.5px] text-fg-3 mt-2.5 leading-relaxed">
                Simulação da ficha na Play Store. O nome vem do campo acima e o desenvolvedor, da
                razão social em Configurações.
              </p>
            </div>
          </div>

          <div className="lh-card p-4">
            <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-fg-3">
              Pronto para enviar?
            </div>
            <ul className="mt-3 space-y-2.5">
              {(
                [
                  [saved, 'Ficha salva'],
                  [Boolean(tenant.cnpj), 'CNPJ no cadastro'],
                  [Boolean(tenant.support_email), 'E-mail de suporte'],
                  [Boolean(form.play_signing_sha256), 'SHA-256 do Play App Signing'],
                  [builds.some((b) => b.status === 'done'), 'Pacote .aab gerado'],
                ] as [boolean, string][]
              ).map(([feito, rotulo]) => (
                <li key={rotulo} className="flex items-center gap-2.5 text-[12.5px]">
                  <span
                    className={cn(
                      'w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0',
                      feito ? 'bg-success/15 text-success' : 'bg-bg-3 text-fg-3',
                    )}
                  >
                    <Icon name={feito ? 'check' : 'clock'} size={11} />
                  </span>
                  <span className={feito ? 'text-fg-2' : 'text-fg-3'}>{rotulo}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ peças */

/**
 * O ícone como o Android vai desenhá-lo.
 *
 * Quadrado entra inteiro; deitado é centralizado sobre as cores da marca — a
 * mesma regra da rota /icons, para a prévia não prometer o que o celular não
 * vai mostrar.
 */
function IconePreview({
  tenant,
  src,
  quadrado,
  onQuadrado,
  size,
  radius,
}: {
  tenant: Tenant;
  src: string | null | undefined;
  quadrado: boolean;
  onQuadrado: (v: boolean) => void;
  size: number;
  radius: number;
}) {
  return (
    <div
      className="shrink-0 overflow-hidden border border-border flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        ...(src && quadrado
          ? undefined
          : { background: `linear-gradient(135deg, ${tenant.primary_color}, ${tenant.accent_color})` }),
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          onLoad={(e) => {
            const el = e.currentTarget;
            onQuadrado(el.naturalHeight > 0 && Math.abs(el.naturalWidth / el.naturalHeight - 1) <= 0.1);
          }}
          className={quadrado ? 'w-full h-full object-contain' : 'w-[78%] h-[78%] object-contain'}
        />
      ) : (
        <span className="text-white font-extrabold" style={{ fontSize: size * 0.34 }}>
          {tenant.name[0]?.toUpperCase()}
        </span>
      )}
    </div>
  );
}

function Aviso({
  tom,
  icone,
  children,
}: {
  tom: 'success' | 'danger' | 'warning';
  icone: 'check' | 'shield' | 'file';
  children: React.ReactNode;
}) {
  const tons = {
    success: 'text-success bg-success/10 border-success/25',
    danger: 'text-danger bg-danger/10 border-danger/25',
    warning: 'text-warning bg-warning/10 border-warning/25',
  } as const;
  return (
    <div
      role={tom === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-2.5 items-start text-[13px] border rounded-[10px] px-3.5 py-3', tons[tom])}
    >
      <span className="shrink-0 mt-px">
        <Icon name={icone} size={15} />
      </span>
      <span className="leading-relaxed">{children}</span>
    </div>
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
