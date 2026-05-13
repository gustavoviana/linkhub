'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input, Field, Label } from '@/components/ui/input';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import type { Tenant, TenantLayout } from '@/lib/supabase/types';
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

export default function BrandingForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: tenant.name,
    primary_color: tenant.primary_color,
    accent_color: tenant.accent_color,
    dark_mode_default: tenant.dark_mode_default,
    layout: tenant.layout as TenantLayout,
    logo_url: tenant.logo_url ?? '',
    support_phone: tenant.support_phone ?? '',
    support_whatsapp: tenant.support_whatsapp ?? '',
    support_email: tenant.support_email ?? '',
  });
  const [logoUploading, setLogoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadLogo(file: File) {
    setLogoUploading(true);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
    const path = `tenants/${tenant.id}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('tenant-assets')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) {
      setError(upErr.message);
      setLogoUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from('tenant-assets').getPublicUrl(path);
    setForm((f) => ({ ...f, logo_url: pub.publicUrl }));
    setLogoUploading(false);
  }

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
      support_phone: form.support_phone || null,
      support_whatsapp: form.support_whatsapp || null,
      support_email: form.support_email || null,
    };
    const { error } = await (supabase.from('tenants').update(update as never)).eq('id', tenant.id);
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
    <form onSubmit={onSubmit} className="p-8 space-y-6 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle>Identidade visual</CardTitle>
          <CardSubtitle>Logo, nome e cores que aparecem para os clientes</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <Field label="Nome do provedor">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>

          <div>
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-md bg-bg-3 border border-border flex items-center justify-center overflow-hidden">
                {form.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center font-bold text-white text-2xl"
                    style={{ background: form.primary_color }}
                  >
                    {form.name[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={logoUploading}
                  onClick={() => document.getElementById('logo-upload')?.click()}
                >
                  {logoUploading ? 'Enviando...' : 'Trocar logo'}
                </Button>
                <p className="text-xs text-fg-2 mt-2">PNG, JPG ou SVG, até 1MB</p>
              </div>
            </div>
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

      <div className="flex items-center gap-3 sticky bottom-0 bg-bg-2 border-t border-border -mx-8 px-8 py-3">
        <Button type="submit" loading={saving}>Salvar alterações</Button>
        {saved && <span className="text-sm text-success">✓ Salvo</span>}
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>
    </form>
  );
}
