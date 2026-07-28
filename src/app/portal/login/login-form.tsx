'use client';

// Entrada da central do cliente — CPF e senha, nos três layouts do protótipo
// (docs/prototipo/src/{v1,v2,v3}.jsx, seção "01 · Tela de Login").
//
// Só CPF, como nas centrais dos provedores: é o número que o cliente sabe de
// cor e o mesmo que identifica o contrato no ERP.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Tenant } from '@/lib/supabase/types';
import { documentKind, isValidDocument, maskDocument, onlyDigits } from '@/lib/documento';
import { Icon } from '@/components/portal/icons';
import { portalTokens, rgba, type PortalTokens } from '@/components/portal/tokens';
import { ThemeToggle, usePortalTokens } from '@/components/portal/theme';
import { BrandMark } from '@/components/portal/ui';

export default function LoginForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const t = usePortalTokens(tenant);
  // Padrão das centrais brasileiras: entra só com o CPF. O provedor liga a
  // senha em Configurações quando o ERP dele exige.
  const requirePassword = tenant.portal_require_password === true;
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const digits = onlyDigits(cpf);
    if (digits.length !== 11 && digits.length !== 14) {
      setError('Digite os 11 números do CPF (ou 14, se for CNPJ).');
      return;
    }
    if (!isValidDocument(cpf)) {
      setError(
        documentKind(cpf) === 'cnpj'
          ? 'CNPJ inválido. Confira os números e tente de novo.'
          : 'CPF inválido. Confira os números e tente de novo.',
      );
      return;
    }

    setLoading(true);
    const r = await fetch('/api/portal/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cpf: digits,
        password: requirePassword ? password : undefined,
        tenant_id: tenant.id,
      }),
    }).catch(() => null);
    setLoading(false);

    if (!r) {
      setError('Não conseguimos falar com o servidor. Verifique sua conexão.');
      return;
    }
    if (!r.ok) {
      setError(await r.text());
      return;
    }
    router.push('/');
    router.refresh();
  }

  const help = tenant.support_whatsapp
    ? `https://wa.me/${tenant.support_whatsapp}`
    : tenant.support_phone
      ? `tel:${tenant.support_phone.replace(/\D/g, '')}`
      : tenant.support_email
        ? `mailto:${tenant.support_email}`
        : null;

  const fields = (
    <>
      <div>
        <label htmlFor="cpf" style={labelStyle(t)}>CPF</label>
        <div style={{ position: 'relative' }}>
          <input
            id="cpf"
            inputMode="numeric"
            autoComplete="username"
            required
            placeholder="000.000.000-00"
            value={cpf}
            /* Pode digitar ou colar com ponto, sem ponto, com espaço — a
               máscara normaliza e o servidor recebe só os números. */
            onChange={(e) => setCpf(maskDocument(e.target.value))}
            style={{ ...inputStyle(t), paddingLeft: 42, fontFamily: t.mono, letterSpacing: '0.02em' }}
          />
          <span style={{ position: 'absolute', left: 14, top: 15, color: t.text3 }}>
            <Icon name="user" size={18} />
          </span>
        </div>
        <div style={{ fontSize: 11, color: t.text3, marginTop: 6 }}>
          Empresa? Informe o CNPJ.
        </div>
      </div>

      {requirePassword && (
        <div>
          <label htmlFor="senha" style={labelStyle(t)}>Senha</label>
          <div style={{ position: 'relative' }}>
            <input
              id="senha"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle(t), paddingLeft: 42, paddingRight: 44 }}
            />
            <span style={{ position: 'absolute', left: 14, top: 15, color: t.text3 }}>
              <Icon name="lock" size={18} />
            </span>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              style={{
                position: 'absolute',
                right: 12,
                top: 12,
                background: 'transparent',
                border: 'none',
                color: t.text3,
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
              }}
            >
              <Icon name="eye" size={18} />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            fontSize: 13,
            color: t.danger,
            background: rgba(t.danger, 0.1),
            border: `1px solid ${rgba(t.danger, 0.25)}`,
            borderRadius: 12,
            padding: '10px 12px',
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          height: t.layout === 'v3' ? 56 : 52,
          borderRadius: t.layout === 'v3' ? 18 : 14,
          background: t.accentGrad,
          color: t.accentFg,
          border: 'none',
          fontSize: 15,
          fontWeight: t.layout === 'v3' ? 800 : 600,
          marginTop: 4,
          cursor: loading ? 'progress' : 'pointer',
          opacity: loading ? 0.75 : 1,
          boxShadow: `0 10px 24px -8px ${rgba(t.accent, 0.55)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontFamily: 'inherit',
        }}
      >
        {loading ? 'Entrando…' : 'Entrar'}
        {!loading && t.layout !== 'v1' && <Icon name="arrow-right" size={17} />}
      </button>

      {/* O acesso do cliente é por CPF, sem e-mail próprio no Auth — quem
          redefine a senha é o provedor, pelo canal de atendimento. */}
      {requirePassword && help && (
        <a
          href={help}
          target="_blank"
          rel="noreferrer"
          style={{ textAlign: 'center', fontSize: 13, color: t.accent, fontWeight: 600, marginTop: 4 }}
        >
          Esqueci minha senha — falar com {tenant.name}
        </a>
      )}
    </>
  );

  // Na entrada o botão flutua no canto: os três layouts têm topos bem
  // diferentes e nenhum deles tem barra onde encaixá-lo.
  const themeToggle = (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10 }}>
      <ThemeToggle t={t} onAccent={t.layout === 'v3'} />
    </div>
  );

  // ── V3: cabeçalho ilustrado grande, formulário embaixo ────────────────
  if (t.layout === 'v3') {
    return (
      <div style={{ minHeight: '100vh', background: t.bg, color: t.text, display: 'flex', flexDirection: 'column' }}>
        {themeToggle}
        <div
          style={{
            background: t.accentGrad,
            color: t.accentFg,
            padding: '56px 28px 44px',
            borderBottomLeftRadius: 48,
            borderBottomRightRadius: 48,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 40,
              right: -40,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.16)',
            }}
          />
          <div style={{ position: 'relative', maxWidth: 460, margin: '0 auto' }}>
            <BrandMark tenant={tenant} t={t} size={44} showName={false} />
            <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 600, marginTop: 18 }}>{tenant.name}</div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 6 }}>Olá! 👋</div>
            <div style={{ fontSize: 14, opacity: 0.95, marginTop: 2 }}>Pronto pra navegar?</div>
          </div>
        </div>
        <form onSubmit={onSubmit} style={{ padding: '28px 24px 40px', maxWidth: 460, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 4px' }}>Entrar</h1>
            <p style={{ fontSize: 13, color: t.text2, margin: 0 }}>
              {requirePassword ? 'Acesse com seu CPF e senha cadastrados.' : 'É só informar o seu CPF.'}
            </p>
          </div>
          {fields}
          <Footer t={t} tenant={tenant} />
        </form>
      </div>
    );
  }

  // ── V2: cartão de vidro sobre fundo com brilho ────────────────────────
  if (t.layout === 'v2') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: t.bgGrad,
          color: t.text,
          padding: '54px 24px 36px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {themeToggle}
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${rgba(t.accent, 0.4)}, transparent 70%)`,
            filter: 'blur(40px)',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 420, margin: '0 auto' }}>
          <BrandMark tenant={tenant} t={t} size={60} showName={false} />
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', margin: '22px 0 6px' }}>{tenant.name}</h1>
          <p style={{ fontSize: 14, color: t.text2, margin: 0, lineHeight: 1.6 }}>Sua conexão, seu controle.</p>

          <form
            onSubmit={onSubmit}
            style={{
              marginTop: 36,
              padding: 22,
              borderRadius: 24,
              background: t.surface,
              backdropFilter: 'blur(20px) saturate(160%)',
              WebkitBackdropFilter: 'blur(20px) saturate(160%)',
              border: `1px solid ${t.border}`,
              boxShadow: '0 24px 48px -16px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {fields}
          </form>
          <Footer t={t} tenant={tenant} />
        </div>
      </div>
    );
  }

  // ── V1: limpo, sem caixa, foco na tipografia ──────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.text, padding: '60px 28px 40px' }}>
      {themeToggle}
      <div style={{ maxWidth: 400, margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 100px)' }}>
        <BrandMark tenant={tenant} t={t} size={56} showName={false} />
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '28px 0 6px' }}>Bem-vindo</h1>
        <p style={{ fontSize: 15, color: t.text2, margin: 0, lineHeight: 1.5 }}>
          {requirePassword
            ? 'Acesse sua central do cliente para ver faturas, pagar por Pix e falar com o suporte.'
            : 'Informe seu CPF para ver faturas, pagar por Pix e falar com o suporte.'}
        </p>
        <form onSubmit={onSubmit} style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {fields}
        </form>
        <Footer t={t} tenant={tenant} />
      </div>
    </div>
  );
}

function Footer({ t, tenant }: { t: PortalTokens; tenant: Tenant }) {
  return (
    <div style={{ marginTop: 'auto', paddingTop: 28, textAlign: 'center', fontSize: 12, color: t.text3 }}>
      {tenant.support_phone && <div>Precisa de ajuda? Ligue {tenant.support_phone}</div>}
      <div style={{ marginTop: 4 }}>Central feita com LinkHub</div>
    </div>
  );
}

function labelStyle(t: PortalTokens): React.CSSProperties {
  return {
    fontSize: t.layout === 'v3' ? 12 : 12,
    color: t.layout === 'v3' ? t.text : t.text2,
    fontWeight: t.layout === 'v3' ? 700 : 500,
    display: 'block',
    marginBottom: 6,
    letterSpacing: t.layout === 'v2' ? '0.06em' : undefined,
    textTransform: t.layout === 'v2' ? 'uppercase' : undefined,
  };
}

function inputStyle(t: PortalTokens): React.CSSProperties {
  return {
    width: '100%',
    height: t.layout === 'v3' ? 52 : 48,
    padding: '0 14px',
    borderRadius: t.layout === 'v3' ? 16 : 12,
    border: `${t.layout === 'v3' ? 2 : 1}px solid ${t.border}`,
    background: t.layout === 'v2' ? (t.dark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)') : t.surfaceSolid,
    color: t.text,
    fontSize: 15,
    outline: 'none',
    fontFamily: 'inherit',
  };
}
