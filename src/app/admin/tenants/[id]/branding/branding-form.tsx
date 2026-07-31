'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input, Field, Label } from '@/components/ui/input';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import type { Tenant, TenantLayout } from '@/lib/supabase/types';
import type { PreviewTheme } from '@/lib/tenant/preview-protocol';
import { converterParaWebp, formatarBytes } from '@/lib/images/webp';
import { LOGIN_HEADLINE_PADRAO, LOGIN_SUBTITLE_PADRAO } from '@/lib/portal/login-copy';
import { PhonePreview } from './phone-preview';
import { StoreExport } from './store-export';
import { cn } from '@/lib/utils';

const COLOR_PRESETS = [
  { name: 'Roxo (padrão)', primary: '#6d4ae0', accent: '#0aa5c0' },
  { name: 'Azul corporativo', primary: '#2660d4', accent: '#0aa5c0' },
  { name: 'Verde provedor', primary: '#15915a', accent: '#b8730e' },
  { name: 'Laranja energia', primary: '#ea580c', accent: '#6d4ae0' },
  { name: 'Vermelho impacto', primary: '#d6334a', accent: '#0aa5c0' },
  { name: 'Cinza neutro', primary: '#404956', accent: '#0aa5c0' },
];

const LAYOUTS: { id: TenantLayout; name: string; desc: string }[] = [
  { id: 'v1', name: 'Clean Minimal', desc: 'Layout limpo, foco em legibilidade e respiro.' },
  { id: 'v2', name: 'Neo Premium', desc: 'Visual moderno, mais denso, com cards elevados.' },
  { id: 'v3', name: 'Friendly Bold', desc: 'Bordas arredondadas, cores fortes, tom amigável.' },
];

type AssetKey = 'logo_url' | 'logo_dark_url' | 'favicon_url' | 'login_image_url';

/** Colunas que dependem de migração ainda não aplicada em todo banco. */
const COLUNAS_NOVAS = ['logo_dark_url', 'login_image_url', 'login_headline', 'login_subtitle'];

export default function BrandingForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: tenant.name,
    primary_color: tenant.primary_color,
    accent_color: tenant.accent_color,
    dark_mode_default: tenant.dark_mode_default,
    layout: tenant.layout as TenantLayout,
    logo_url: tenant.logo_url ?? '',
    logo_dark_url: tenant.logo_dark_url ?? '',
    favicon_url: tenant.favicon_url ?? '',
    login_image_url: tenant.login_image_url ?? '',
    login_headline: tenant.login_headline ?? '',
    login_subtitle: tenant.login_subtitle ?? '',
    support_phone: tenant.support_phone ?? '',
    support_whatsapp: tenant.support_whatsapp ?? '',
    support_email: tenant.support_email ?? '',
  });
  const [uploading, setUploading] = useState<AssetKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const MAX_ASSET_BYTES = 1024 * 1024;
  // A foto da entrada é reencodada aqui no navegador antes de subir, então o
  // que importa é o tamanho depois — o provedor pode mandar a foto do celular.
  const MAX_FOTO_BYTES = 12 * 1024 * 1024;

  const PASTA: Record<AssetKey, string> = {
    logo_url: 'logo',
    logo_dark_url: 'logo-dark',
    favicon_url: 'favicon',
    login_image_url: 'login',
  };

  async function uploadAsset(file: File, field: AssetKey) {
    const ehFoto = field === 'login_image_url';
    if (file.size > (ehFoto ? MAX_FOTO_BYTES : MAX_ASSET_BYTES)) {
      setError(
        ehFoto
          ? 'Arquivo acima de 12MB. Escolha uma foto menor.'
          : 'Arquivo acima de 1MB. Escolha uma imagem menor.',
      );
      return;
    }
    setUploading(field);
    setError(null);
    setAviso(null);

    // Só a foto é convertida: logo e ícone costumam ser SVG ou PNG com
    // transparência, e rasterizar um vetor seria perder qualidade de graça.
    const arte = ehFoto
      ? await converterParaWebp(file)
      : {
          blob: file as Blob,
          ext: file.name.split('.').pop()?.toLowerCase() || 'png',
          tipo: file.type,
          bytesAntes: file.size,
          bytesDepois: file.size,
        };

    const supabase = createClient();
    const path = `tenants/${tenant.id}/${PASTA[field]}-${Date.now()}.${arte.ext}`;
    const { error: upErr } = await supabase.storage
      .from('tenant-assets')
      .upload(path, arte.blob, { cacheControl: '3600', upsert: false, contentType: arte.tipo });
    if (upErr) {
      setError(upErr.message);
      setUploading(null);
      return;
    }
    const { data: pub } = supabase.storage.from('tenant-assets').getPublicUrl(path);
    setForm((f) => ({ ...f, [field]: pub.publicUrl }));
    if (ehFoto && arte.bytesDepois < arte.bytesAntes) {
      setAviso(
        `Foto convertida para WebP: ${formatarBytes(arte.bytesAntes)} → ${formatarBytes(arte.bytesDepois)}. ` +
          'É o que o cliente baixa ao abrir a central.',
      );
    }
    setUploading(null);
  }

  // O que o mockup renderiza — o estado do formulário, não o que está salvo.
  const previewTheme: PreviewTheme = {
    name: form.name || tenant.name,
    logo_url: form.logo_url || null,
    logo_dark_url: form.logo_dark_url || null,
    login_image_url: form.login_image_url || null,
    login_headline: form.login_headline || null,
    login_subtitle: form.login_subtitle || null,
    primary_color: form.primary_color,
    accent_color: form.accent_color,
    dark_mode_default: form.dark_mode_default,
    layout: form.layout,
    support_phone: form.support_phone || null,
    support_whatsapp: form.support_whatsapp || null,
    support_email: form.support_email || null,
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();
    const update: Record<string, unknown> = {
      name: form.name,
      primary_color: form.primary_color,
      accent_color: form.accent_color,
      dark_mode_default: form.dark_mode_default,
      layout: form.layout,
      logo_url: form.logo_url || null,
      logo_dark_url: form.logo_dark_url || null,
      login_image_url: form.login_image_url || null,
      login_headline: form.login_headline.trim() || null,
      login_subtitle: form.login_subtitle.trim() || null,
      favicon_url: form.favicon_url || null,
      support_phone: form.support_phone || null,
      support_whatsapp: form.support_whatsapp || null,
      support_email: form.support_email || null,
    };
    let { error } = await (supabase.from('tenants').update(update as never)).eq('id', tenant.id);

    // Banco ainda sem as migrações 007/008: em vez de perder o que o provedor
    // acabou de ajustar, salva o resto e diz o que ficou de fora.
    const faltando = COLUNAS_NOVAS.filter((c) => error && error.message.includes(c));
    if (faltando.length) {
      const parcial = { ...update };
      for (const c of COLUNAS_NOVAS) delete parcial[c];
      ({ error } = await (supabase.from('tenants').update(parcial as never)).eq('id', tenant.id));
      if (!error) {
        setSaving(false);
        setSaved(true);
        setError(
          'Tudo salvo, menos a logo do modo escuro e a tela de entrada: falta rodar as migrações 007 e 008 no banco.',
        );
        router.refresh();
        return;
      }
    }

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <form onSubmit={onSubmit} className="p-8">
      <div className="flex flex-col-reverse xl:flex-row xl:items-start gap-8">
      <div className="flex-1 min-w-0 max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identidade visual</CardTitle>
          <CardSubtitle>Logo, nome e cores que aparecem para os clientes</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <Field label="Nome do provedor">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <AssetField
              id="logo-upload"
              label="Logo"
              hint="Aparece no topo da central e na tela de entrada. PNG, JPG ou SVG, até 1MB."
              value={form.logo_url}
              uploading={uploading === 'logo_url'}
              fallback={form.name[0]?.toUpperCase() ?? '?'}
              fallbackColor={form.primary_color}
              onPick={(file) => uploadAsset(file, 'logo_url')}
              onClear={() => setForm({ ...form, logo_url: '' })}
            />
            <AssetField
              id="logo-dark-upload"
              label="Logo para o modo escuro"
              hint="Opcional. Use a versão clara da sua marca — a escura some no fundo escuro. Sem ela, vale a logo normal nos dois temas."
              value={form.logo_dark_url}
              uploading={uploading === 'logo_dark_url'}
              fallback={form.name[0]?.toUpperCase() ?? '?'}
              fallbackColor="#111318"
              dark
              onPick={(file) => uploadAsset(file, 'logo_dark_url')}
              onClear={() => setForm({ ...form, logo_dark_url: '' })}
            />
            <AssetField
              id="favicon-upload"
              label="Ícone do navegador"
              hint="O quadradinho na aba do navegador. Quadrado, 64×64 ou maior."
              value={form.favicon_url}
              uploading={uploading === 'favicon_url'}
              fallback={form.name[0]?.toUpperCase() ?? '?'}
              fallbackColor={form.accent_color}
              onPick={(file) => uploadAsset(file, 'favicon_url')}
              onClear={() => setForm({ ...form, favicon_url: '' })}
            />
          </div>

          <div>
            <Label>Paleta</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {COLOR_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.name}
                  onClick={() => setForm({ ...form, primary_color: p.primary, accent_color: p.accent })}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-md border-2 text-left transition-colors',
                    form.primary_color === p.primary
                      ? 'border-fg bg-bg-3'
                      : 'border-border hover:border-fg-3',
                  )}
                >
                  <div className="flex gap-1">
                    <div className="w-6 h-6 rounded" style={{ background: p.primary }} />
                    <div className="w-6 h-6 rounded" style={{ background: p.accent }} />
                  </div>
                  <span className="text-xs font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Cor primária">
              <div className="flex items-stretch">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                  className="w-12 h-10 rounded-l-md border border-border cursor-pointer"
                />
                <Input
                  className="rounded-l-none font-mono"
                  value={form.primary_color}
                  onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                />
              </div>
            </Field>
            <Field label="Cor de destaque">
              <div className="flex items-stretch">
                <input
                  type="color"
                  value={form.accent_color}
                  onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                  className="w-12 h-10 rounded-l-md border border-border cursor-pointer"
                />
                <Input
                  className="rounded-l-none font-mono"
                  value={form.accent_color}
                  onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                />
              </div>
            </Field>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="dark-default"
              checked={form.dark_mode_default}
              onChange={(e) => setForm({ ...form, dark_mode_default: e.target.checked })}
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="dark-default" className="text-sm">Iniciar portal em modo escuro</label>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Layout do portal</CardTitle>
          <CardSubtitle>Escolha o estilo visual que mais combina com sua marca</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {LAYOUTS.map((l) => (
              <button
                type="button"
                key={l.id}
                onClick={() => setForm({ ...form, layout: l.id })}
                className={cn(
                  'p-4 rounded-md border-2 text-left transition-all',
                  form.layout === l.id ? 'border-brand bg-brand/5' : 'border-border hover:border-fg-3',
                )}
              >
                <div className="text-xs font-mono uppercase text-fg-3 mb-2">{l.id}</div>
                <div className="font-semibold mb-1">{l.name}</div>
                <p className="text-xs text-fg-2 leading-relaxed">{l.desc}</p>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tela de entrada</CardTitle>
          <CardSubtitle>
            A primeira tela que o cliente vê. O modelo acompanha o layout escolhido acima.
          </CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <div>
            <Label>Imagem</Label>
            <div className="flex items-start gap-4">
              <div className="w-44 h-28 shrink-0 rounded-md border border-border overflow-hidden bg-bg-3 relative">
                {form.login_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.login_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white text-xs font-medium text-center px-3"
                    style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.accent_color})` }}
                  >
                    Sem imagem — usa as cores da marca
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <input
                  type="file"
                  id="login-image-upload"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadAsset(file, 'login_image_url');
                    e.target.value = '';
                  }}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={uploading === 'login_image_url'}
                    onClick={() => document.getElementById('login-image-upload')?.click()}
                  >
                    {form.login_image_url ? 'Trocar' : 'Enviar foto'}
                  </Button>
                  {form.login_image_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm({ ...form, login_image_url: '' })}
                    >
                      Remover
                    </Button>
                  )}
                </div>
                <p className="text-xs text-fg-2 mt-2 leading-relaxed">
                  Convertida para WebP automaticamente, com no máximo 1920px — a foto de 5MB do
                  celular chega ao cliente com algumas centenas de KB. Horizontal funciona melhor;
                  aceita até 12MB de entrada.
                </p>
              </div>
            </div>
            {aviso && (
              <p className="text-xs text-success mt-3 bg-success/10 rounded-md px-3 py-2">{aviso}</p>
            )}
          </div>

          <Field
            label="Título"
            hint="Aparece grande, sobre a imagem. Vazio = usa o texto padrão."
          >
            <Input
              value={form.login_headline}
              onChange={(e) => setForm({ ...form, login_headline: e.target.value })}
              placeholder={LOGIN_HEADLINE_PADRAO}
              maxLength={90}
            />
          </Field>

          <Field label="Chamada" hint="A frase menor, logo abaixo do título.">
            <Input
              value={form.login_subtitle}
              onChange={(e) => setForm({ ...form, login_subtitle: e.target.value })}
              placeholder={LOGIN_SUBTITLE_PADRAO}
              maxLength={160}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato de suporte</CardTitle>
          <CardSubtitle>Visíveis no portal para o cliente abrir conversa</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Telefone">
              <Input
                value={form.support_phone}
                onChange={(e) => setForm({ ...form, support_phone: e.target.value })}
                placeholder="(54) 3220-0000"
              />
            </Field>
            <Field label="WhatsApp" hint="Apenas números, com DDI">
              <Input
                value={form.support_whatsapp}
                onChange={(e) => setForm({ ...form, support_whatsapp: e.target.value })}
                placeholder="5554998800000"
              />
            </Field>
            <Field label="E-mail">
              <Input
                type="email"
                value={form.support_email}
                onChange={(e) => setForm({ ...form, support_email: e.target.value })}
                placeholder="suporte@provedor.com.br"
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3 sticky bottom-4 bg-bg-2 border border-border rounded-lg shadow-sm px-5 py-3">
        <Button type="submit" loading={saving}>Salvar alterações</Button>
        {saved && <span className="text-sm text-success">✓ Salvo</span>}
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>

      {/* Depois de salvar: as imagens saem com o que está no banco, não com
          o que ainda está só no formulário. */}
      <StoreExport tenantId={tenant.id} tenantName={tenant.name} slug={tenant.slug} />
      </div>

      <aside className="shrink-0 self-center xl:self-start xl:sticky xl:top-6">
        <PhonePreview tenantId={tenant.id} theme={previewTheme} />
      </aside>
      </div>
    </form>
  );
}

function AssetField({
  id,
  label,
  hint,
  value,
  uploading,
  fallback,
  fallbackColor,
  dark = false,
  onPick,
  onClear,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  uploading: boolean;
  fallback: string;
  fallbackColor: string;
  /** Mostra a miniatura sobre fundo escuro — é onde essa arte vai aparecer. */
  dark?: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-16 h-16 shrink-0 rounded-md border border-border flex items-center justify-center overflow-hidden',
            dark ? 'bg-[#111318]' : 'bg-bg-3',
          )}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="w-full h-full object-contain" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center font-bold text-white text-xl"
              style={{ background: fallbackColor }}
            >
              {fallback}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <input
            type="file"
            id={id}
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPick(file);
              e.target.value = '';
            }}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={uploading}
              onClick={() => document.getElementById(id)?.click()}
            >
              {value ? 'Trocar' : 'Enviar'}
            </Button>
            {value && (
              <button
                type="button"
                onClick={onClear}
                className="text-xs text-fg-2 hover:text-danger"
              >
                Remover
              </button>
            )}
          </div>
          <p className="text-xs text-fg-2 mt-2 leading-relaxed">{hint}</p>
        </div>
      </div>
    </div>
  );
}
