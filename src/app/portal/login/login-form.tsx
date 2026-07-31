'use client';

// Entrada da central do cliente.
//
// Uma tela dividida, como no protótipo (docs/prototipo/src/desktop-login.jsx):
// a foto e a mensagem do provedor de um lado, o formulário do outro. No celular
// vira faixa em cima e formulário centralizado embaixo.
//
// A quebra é por CONTAINER, não por janela: esta mesma tela é renderizada
// dentro do mockup de celular do painel e nas capturas para as lojas, onde a
// janela é a do desktop mas o espaço real são 390px. Media query de viewport
// mostraria a versão de desktop dentro do celular.
//
// O acesso continua o mesmo: só CPF (senha quando o provedor exige). Sem QR
// Code e sem WhatsApp — a central não tem esses caminhos de entrada.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Tenant } from '@/lib/supabase/types';
import { documentKind, isValidDocument, maskDocument, onlyDigits } from '@/lib/documento';
import { Icon } from '@/components/portal/icons';
import { rgba, type PortalTokens } from '@/components/portal/tokens';
import { ThemeToggle, usePortalTokens } from '@/components/portal/theme';
import { BrandMark } from '@/components/portal/ui';
import { LOGIN_DESTAQUES, loginCopy } from '@/lib/portal/login-copy';

const LOGIN_CSS = `
.lh-login-root{container-type:inline-size;position:relative;min-height:100vh}
.lh-login{display:flex;flex-direction:column;min-height:100vh;position:relative;z-index:1}
.lh-login-art{position:relative;overflow:hidden;flex:0 0 auto;min-height:210px;display:flex}
.lh-login-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.lh-login-scrim{position:absolute;inset:0;pointer-events:none}
.lh-login-artinner{position:relative;z-index:1;display:flex;flex-direction:column;
  width:100%;padding:26px 24px 22px;align-items:center;justify-content:center;gap:14px;text-align:center}
.lh-login-form{flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;
  align-items:center;padding:26px 22px 30px}
.lh-login-box{width:100%;max-width:400px;display:flex;flex-direction:column}
.lh-login-copy{max-width:460px}
.lh-login-desk{display:none}

/* A partir de ~900px de ESPAÇO DISPONÍVEL (não de janela) a tela divide. */
@container (min-width: 900px){
  .lh-login{flex-direction:row;height:100vh;min-height:0}
  .lh-login-art{flex:1.05 1 0;min-height:0;height:100%}
  .lh-login-artinner{align-items:flex-start;justify-content:space-between;
    text-align:left;padding:44px 52px}
  .lh-login-form{flex:1 1 0;height:100%;overflow-y:auto;padding:40px 48px;justify-content:center}
  .lh-login-box{max-width:420px}
  .lh-login-desk{display:block}
  .lh-login-mob{display:none}
}
`;

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

  const { headline, subtitle } = loginCopy(tenant);
  const foto = tenant.login_image_url || null;
  const v = t.layout;

  // Sobre a foto (ou a cor da marca) o fundo é sempre escuro — vale a versão
  // clara da logo, que existe exatamente para isso. Sem ela, a logo comum vai
  // dentro de uma placa clara: marca escura sobre fundo escuro some, e quem
  // paga o preço é a primeira tela que o assinante vê.
  const logoNaArte = tenant.logo_dark_url || tenant.logo_url;
  const precisaDePlaca = !tenant.logo_dark_url && !!tenant.logo_url;

  // Sem foto, o painel vira a marca do provedor: gradiente da cor dele com as
  // formas do layout escolhido. Nada de retângulo cinza "faltando imagem".
  const fundoArte = foto ? '#0f1220' : t.accentGrad;
  const scrim = foto
    ? v === 'v2'
      ? `linear-gradient(105deg, rgba(8,6,20,0.92) 0%, rgba(8,6,20,0.72) 45%, ${rgba(t.accent, 0.42)} 100%)`
      : `linear-gradient(180deg, rgba(10,12,24,0.55) 0%, rgba(10,12,24,0.28) 38%, ${rgba(t.accent, 0.88)} 100%)`
    : 'transparent';

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
              onClick={() => setShowPassword((s) => !s)}
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
          height: v === 'v3' ? 56 : 52,
          borderRadius: v === 'v3' ? 18 : 14,
          background: t.accentGrad,
          color: t.accentFg,
          border: 'none',
          fontSize: 15,
          fontWeight: v === 'v3' ? 800 : 600,
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
        {!loading && v !== 'v1' && <Icon name="arrow-right" size={17} />}
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

  // Caixa do formulário: o V2 é um cartão de vidro; os outros ficam soltos
  // sobre a superfície do lado direito.
  const caixaFormulario: React.CSSProperties =
    v === 'v2'
      ? {
          padding: 24,
          borderRadius: 24,
          background: t.surface,
          backdropFilter: 'blur(24px) saturate(170%)',
          WebkitBackdropFilter: 'blur(24px) saturate(170%)',
          border: `1px solid ${t.border}`,
          boxShadow: '0 28px 60px -20px rgba(0,0,0,0.45)',
        }
      : {};

  return (
    <div
      className="lh-login-root"
      style={{ background: v === 'v2' ? t.bgGrad : t.bg, color: t.text }}
    >
      <style>{LOGIN_CSS}</style>

      <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 5 }}>
        <ThemeToggle t={t} />
      </div>

      <div className="lh-login">
        {/* ── Lado da marca ─────────────────────────────────────────────── */}
        <aside
          className="lh-login-art"
          style={{
            background: fundoArte,
            // V3 emoldura a foto num cartão arredondado, como no protótipo.
            margin: v === 'v3' ? 12 : 0,
            borderRadius: v === 'v3' ? 28 : 0,
          }}
        >
          {foto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="lh-login-photo" src={foto} alt="" />
          )}
          <div className="lh-login-scrim" style={{ background: scrim }} />
          {!foto && (
            <div
              style={{
                position: 'absolute',
                top: -70,
                right: -70,
                width: 260,
                height: 260,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
              }}
            />
          )}

          <div className="lh-login-artinner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {logoNaArte ? (
                <div
                  style={
                    precisaDePlaca
                      ? {
                          background: 'rgba(255,255,255,0.94)',
                          borderRadius: 16,
                          padding: '12px 16px',
                          boxShadow: '0 10px 26px -12px rgba(0,0,0,0.5)',
                          display: 'flex',
                        }
                      : { display: 'flex' }
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoNaArte}
                    alt={tenant.name}
                    style={{ height: 40, maxWidth: 200, objectFit: 'contain' }}
                  />
                </div>
              ) : (
                <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                  {tenant.name}
                </div>
              )}
            </div>

            {/* No desktop a mensagem mora aqui, sobre a imagem. No celular ela
                fica junto do formulário, onde sobra largura para lê-la. */}
            <div className="lh-login-desk lh-login-copy">
              <h1
                style={{
                  fontSize: v === 'v2' ? 44 : 38,
                  lineHeight: 1.1,
                  fontWeight: v === 'v1' ? 700 : 800,
                  letterSpacing: '-0.03em',
                  color: '#fff',
                  margin: '0 0 14px',
                }}
              >
                {headline}
              </h1>
              <p
                style={{
                  fontSize: 16,
                  lineHeight: 1.6,
                  color: 'rgba(255,255,255,0.85)',
                  margin: '0 0 28px',
                  maxWidth: 420,
                }}
              >
                {subtitle}
              </p>
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
                {LOGIN_DESTAQUES.map((d) => (
                  <div
                    key={d.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: 'rgba(255,255,255,0.92)',
                      fontSize: 13.5,
                      fontWeight: 600,
                    }}
                  >
                    <Icon name={d.icon} size={15} color="#fff" /> {d.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Lado do formulário ────────────────────────────────────────── */}
        <main
          className="lh-login-form"
          style={{ background: v === 'v2' ? 'transparent' : t.surfaceSolid }}
        >
          <div className="lh-login-box">
            <div style={{ ...caixaFormulario, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="lh-login-mob" style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
                  {headline}
                </h1>
                <p style={{ fontSize: 14, color: t.text2, margin: 0, lineHeight: 1.55 }}>{subtitle}</p>
              </div>

              <div className="lh-login-desk">
                <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 6px' }}>
                  Acessar minha conta
                </h2>
                <p style={{ fontSize: 14, color: t.text2, margin: 0 }}>
                  {requirePassword
                    ? 'Use o CPF do titular e a sua senha.'
                    : 'Use o CPF do titular do contrato.'}
                </p>
              </div>

              <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {fields}
              </form>
            </div>

            <Footer t={t} tenant={tenant} />
          </div>
        </main>
      </div>
    </div>
  );
}

function Footer({ t, tenant }: { t: PortalTokens; tenant: Tenant }) {
  return (
    <div style={{ paddingTop: 26, textAlign: 'center', fontSize: 12, color: t.text3 }}>
      {tenant.support_phone && <div>Precisa de ajuda? Ligue {tenant.support_phone}</div>}
      <div style={{ marginTop: 4 }}>Central feita com LinkHub</div>
    </div>
  );
}

function labelStyle(t: PortalTokens): React.CSSProperties {
  return {
    fontSize: 12,
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
