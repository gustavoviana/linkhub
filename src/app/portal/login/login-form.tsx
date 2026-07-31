'use client';

// Entrada da central do cliente.
//
// Duas telas, uma árvore só (docs/prototipo/src/desktop-login.jsx e
// mobile-login-img.jsx):
//
//   desktop — foto e mensagem do provedor à esquerda, formulário à direita;
//   celular — foto ocupando o fundo inteiro, escurecendo de cima para baixo,
//             com a logo e o formulário ancorados embaixo.
//
// A quebra é por CONTAINER, não por janela: esta mesma tela é renderizada
// dentro do mockup de celular do painel e nas capturas para as lojas, onde a
// janela é a do desktop mas o espaço real são 390px.
//
// E é por isso que a aparência mora no CSS, com as cores do provedor em
// variáveis: estilo inline não responde a container query, e no celular os
// campos ficam sobre a foto (vidro, texto branco) enquanto no desktop ficam
// sobre a superfície do formulário.
//
// O acesso continua o mesmo: só CPF (senha quando o provedor exige). Sem QR
// Code e sem WhatsApp — a central não tem esses caminhos de entrada.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Tenant } from '@/lib/supabase/types';
import { documentKind, isValidDocument, maskDocument, onlyDigits } from '@/lib/documento';
import { Icon } from '@/components/portal/icons';
import { rgba } from '@/components/portal/tokens';
import { ThemeToggle, usePortalTokens } from '@/components/portal/theme';
import { LOGIN_DESTAQUES, loginCopy } from '@/lib/portal/login-copy';

const LOGIN_CSS = `
.lh-root{container-type:inline-size;position:relative;min-height:100vh;overflow:hidden}
.lh-split{display:flex;flex-direction:column;min-height:100vh;position:relative}

/* ── Arte ─────────────────────────────────────────────────────────────── */
/* No celular a foto é o fundo da tela inteira. */
.lh-art{position:absolute;inset:0;z-index:0;overflow:hidden}
.lh-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.lh-scrim{position:absolute;inset:0}
.lh-blob{position:absolute;top:-90px;right:-90px;width:280px;height:280px;
  border-radius:50%;background:rgba(255,255,255,.12)}
/* Some no celular pela própria regra, e não pela classe .lh-desk: aquela
   define display:block e venceria o flex daqui, achatando o painel — foi o que
   deixou a marca grudada no título na primeira tentativa. */
.lh-artinner{display:none}

/* ── Coluna do formulário ─────────────────────────────────────────────── */
.lh-side{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;
  justify-content:flex-end;padding:26px 22px 30px}
.lh-box{width:100%;max-width:420px;margin:0 auto;display:flex;flex-direction:column}
.lh-brand{display:flex;justify-content:center;margin-bottom:16px}
.lh-copy{text-align:center;margin-bottom:18px}
.lh-h1{font-size:27px;line-height:1.14;font-weight:800;letter-spacing:-.03em;
  color:#fff;margin:0 0 8px}
.lh-sub{font-size:14px;line-height:1.55;color:rgba(255,255,255,.78);margin:0}
.lh-card{display:flex;flex-direction:column;gap:14px}
.lh-foot{padding-top:22px;text-align:center;font-size:12px;color:rgba(255,255,255,.6)}

/* ── Marca ────────────────────────────────────────────────────────────── */
/* Sem moldura: ou é a logo clara do provedor, ou a logo comum branqueada. */
.lh-logo{height:44px;max-width:220px;object-fit:contain}
.lh-logo-branca{filter:brightness(0) invert(1)}
.lh-nome{font-size:22px;font-weight:800;letter-spacing:-.02em;color:#fff}

/* ── Campos: no celular, vidro sobre a foto ───────────────────────────── */
.lh-label{font-size:12px;font-weight:600;color:rgba(255,255,255,.85);
  display:block;margin-bottom:6px}
.lh-field{width:100%;height:50px;padding:0 14px 0 42px;border-radius:13px;
  border:1px solid rgba(255,255,255,.24);background:rgba(255,255,255,.12);
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
  color:#fff;font-size:15px;outline:none;font-family:inherit}
.lh-field::placeholder{color:rgba(255,255,255,.55)}
.lh-field:focus{border-color:rgba(255,255,255,.5)}
.lh-fieldicon{position:absolute;left:14px;top:16px;color:rgba(255,255,255,.7);display:flex}
.lh-eye{position:absolute;right:12px;top:13px;background:transparent;border:none;
  color:rgba(255,255,255,.7);cursor:pointer;padding:4px;display:flex}
.lh-hint{font-size:11px;color:rgba(255,255,255,.6);margin-top:6px}
.lh-erro{font-size:13px;border-radius:12px;padding:10px 12px;
  color:#fff;background:rgba(220,38,38,.35);border:1px solid rgba(255,255,255,.28)}
.lh-entrar{height:52px;border-radius:14px;border:none;font-size:15px;font-weight:700;
  display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;
  font-family:inherit;background:var(--lh-grad);color:var(--lh-accent-fg);
  box-shadow:0 12px 26px -10px var(--lh-accent-shadow)}
.lh-entrar:disabled{opacity:.75;cursor:progress}
.lh-ajuda{text-align:center;font-size:13px;font-weight:600;margin-top:4px;color:#fff}

/* V3 no celular: folha opaca subindo do rodapé, como no protótipo. */
[data-model="v3"] .lh-card{background:var(--lh-surface);margin:6px -22px -30px;
  padding:24px 22px 34px;border-radius:28px 28px 0 0;
  box-shadow:0 -14px 40px -12px rgba(0,0,0,.35)}
[data-model="v3"] .lh-label{color:var(--lh-text)}
[data-model="v3"] .lh-field{border:2px solid var(--lh-border);background:var(--lh-surface);
  color:var(--lh-text);backdrop-filter:none;-webkit-backdrop-filter:none;
  border-radius:16px;height:52px}
[data-model="v3"] .lh-field::placeholder{color:var(--lh-text3)}
[data-model="v3"] .lh-fieldicon,[data-model="v3"] .lh-eye{color:var(--lh-text3)}
[data-model="v3"] .lh-hint{color:var(--lh-text3)}
[data-model="v3"] .lh-erro{color:var(--lh-danger);background:var(--lh-danger-soft);
  border-color:var(--lh-danger-soft)}
[data-model="v3"] .lh-entrar{height:56px;border-radius:18px;font-weight:800}
[data-model="v3"] .lh-ajuda{color:var(--lh-accent)}
[data-model="v3"] .lh-foot{color:rgba(255,255,255,.75)}

/* V2 no celular: cartão de vidro em volta do formulário. */
[data-model="v2"] .lh-card{padding:18px;border-radius:22px;
  background:rgba(12,10,26,.45);border:1px solid rgba(255,255,255,.14);
  -webkit-backdrop-filter:blur(22px) saturate(160%);backdrop-filter:blur(22px) saturate(160%)}

.lh-desk{display:none}

/* ── Desktop ──────────────────────────────────────────────────────────── */
@container (min-width: 900px){
  .lh-root{overflow:visible}
  .lh-split{flex-direction:row;height:100vh;min-height:0}
  .lh-art{position:relative;inset:auto;flex:1.05 1 0;height:100%;display:flex}
  .lh-side{flex:1 1 0;height:100%;justify-content:center;overflow-y:auto;
    padding:40px 48px;background:var(--lh-surface)}
  .lh-desk{display:block}
  .lh-mob{display:none}
  /* flex:1 + width:100% para o bloco ocupar o painel inteiro: sem isso o
     space-between não tem altura para distribuir. */
  .lh-artinner{display:flex;flex-direction:column;justify-content:space-between;
    flex:1 1 auto;width:100%;min-height:0;padding:44px 52px;
    position:relative;z-index:1}

  /* Sobre a superfície do formulário os campos voltam a ser campos comuns. */
  .lh-label{color:var(--lh-text2)}
  .lh-field{height:48px;border-radius:12px;border:1px solid var(--lh-border);
    background:var(--lh-surface);color:var(--lh-text);
    backdrop-filter:none;-webkit-backdrop-filter:none}
  .lh-field::placeholder{color:var(--lh-text3)}
  .lh-field:focus{border-color:var(--lh-accent)}
  .lh-fieldicon,.lh-eye{color:var(--lh-text3)}
  .lh-fieldicon{top:15px}
  .lh-eye{top:12px}
  .lh-hint{color:var(--lh-text3)}
  .lh-erro{color:var(--lh-danger);background:var(--lh-danger-soft);border-color:var(--lh-danger-soft)}
  .lh-ajuda{color:var(--lh-accent)}
  .lh-foot{color:var(--lh-text3)}
  .lh-card{gap:14px}
  [data-model="v3"] .lh-card{background:transparent;margin:0;padding:0;
    border-radius:0;box-shadow:none}
  [data-model="v2"] .lh-card{padding:24px;border-radius:24px;
    background:var(--lh-glass);border:1px solid var(--lh-border);
    box-shadow:0 28px 60px -20px rgba(0,0,0,.45)}

  /* V3 emoldura a foto num cartão arredondado — no celular ela precisa ser o
     fundo inteiro, então a moldura só existe aqui. */
  [data-model="v3"] .lh-art{margin:12px;border-radius:28px}
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
  const v = tenant.layout;

  // A marca fica sempre sobre fundo escuro (foto ou cor do provedor). Se o
  // provedor enviou a versão clara, é ela. Se não, a logo comum vai branqueada
  // — silhueta branca lê em qualquer foto, e é melhor que uma marca escura
  // sumindo ou emoldurada numa placa que não é dela.
  const logo = tenant.logo_dark_url || tenant.logo_url;
  const branquear = !tenant.logo_dark_url && !!tenant.logo_url;

  const marca = logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt={tenant.name}
      className={branquear ? 'lh-logo lh-logo-branca' : 'lh-logo'}
    />
  ) : (
    <span className="lh-nome">{tenant.name}</span>
  );

  // Celular: claro em cima, escurecendo até o rodapé, onde mora o formulário.
  // Desktop: o escuro puxa para a cor da marca no pé do painel.
  const scrimCelular =
    'linear-gradient(180deg, rgba(8,10,20,0.30) 0%, rgba(8,10,20,0.16) 26%,' +
    ' rgba(8,10,20,0.70) 62%, rgba(8,10,20,0.94) 100%)';
  const scrimDesktop = foto
    ? v === 'v2'
      ? `linear-gradient(105deg, rgba(8,6,20,0.92) 0%, rgba(8,6,20,0.70) 45%, ${rgba(t.accent, 0.42)} 100%)`
      : `linear-gradient(180deg, rgba(10,12,24,0.52) 0%, rgba(10,12,24,0.26) 38%, ${rgba(t.accent, 0.88)} 100%)`
    : 'transparent';

  const campos = (
    <>
      <div>
        <label htmlFor="cpf" className="lh-label">CPF</label>
        <div style={{ position: 'relative' }}>
          <input
            id="cpf"
            className="lh-field"
            inputMode="numeric"
            autoComplete="username"
            required
            placeholder="000.000.000-00"
            value={cpf}
            /* Pode digitar ou colar com ponto, sem ponto, com espaço — a
               máscara normaliza e o servidor recebe só os números. */
            onChange={(e) => setCpf(maskDocument(e.target.value))}
            style={{ fontFamily: t.mono, letterSpacing: '0.02em' }}
          />
          <span className="lh-fieldicon">
            <Icon name="user" size={18} />
          </span>
        </div>
        <div className="lh-hint">Empresa? Informe o CNPJ.</div>
      </div>

      {requirePassword && (
        <div>
          <label htmlFor="senha" className="lh-label">Senha</label>
          <div style={{ position: 'relative' }}>
            <input
              id="senha"
              className="lh-field"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingRight: 44 }}
            />
            <span className="lh-fieldicon">
              <Icon name="lock" size={18} />
            </span>
            <button
              type="button"
              className="lh-eye"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              <Icon name="eye" size={18} />
            </button>
          </div>
        </div>
      )}

      {error && <div role="alert" className="lh-erro">{error}</div>}

      <button type="submit" className="lh-entrar" disabled={loading}>
        {loading ? 'Entrando…' : 'Entrar'}
        {!loading && v !== 'v1' && <Icon name="arrow-right" size={17} />}
      </button>

      {/* O acesso do cliente é por CPF, sem e-mail próprio no Auth — quem
          redefine a senha é o provedor, pelo canal de atendimento. */}
      {requirePassword && help && (
        <a href={help} target="_blank" rel="noreferrer" className="lh-ajuda">
          Esqueci minha senha — falar com {tenant.name}
        </a>
      )}
    </>
  );

  const variaveis = {
    '--lh-accent': t.accent,
    '--lh-grad': t.accentGrad,
    '--lh-accent-fg': t.accentFg,
    '--lh-accent-shadow': rgba(t.accent, 0.55),
    '--lh-text': t.text,
    '--lh-text2': t.text2,
    '--lh-text3': t.text3,
    '--lh-surface': t.surfaceSolid,
    '--lh-glass': t.surface,
    '--lh-border': t.border,
    '--lh-danger': t.danger,
    '--lh-danger-soft': rgba(t.danger, 0.14),
  } as React.CSSProperties;

  return (
    <div
      className="lh-root"
      data-model={v}
      style={{ ...variaveis, background: v === 'v2' ? t.bgGrad : t.bg, color: t.text }}
    >
      <style>{LOGIN_CSS}</style>

      <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 5 }}>
        <ThemeToggle t={t} />
      </div>

      <div className="lh-split">
        {/* ── Foto ───────────────────────────────────────────────────────── */}
        <aside
          className="lh-art"
          style={{ background: foto ? '#0d1020' : t.accentGrad }}
        >
          {foto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="lh-photo" src={foto} alt="" />
          )}
          <div
            className="lh-scrim lh-mob"
            style={{ background: foto ? scrimCelular : 'transparent' }}
          />
          <div
            className="lh-scrim lh-desk"
            style={{ background: scrimDesktop }}
          />
          {!foto && <div className="lh-blob" />}

          {/* No desktop a mensagem mora aqui, sobre a imagem. */}
          <div className="lh-artinner">
            <div style={{ display: 'flex' }}>{marca}</div>
            <div style={{ maxWidth: 460 }}>
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

        {/* ── Formulário ─────────────────────────────────────────────────── */}
        <main className="lh-side">
          <div className="lh-box">
            {/* Celular: a marca fica logo acima do formulário, sobre a foto. */}
            <div className="lh-brand lh-mob">{marca}</div>
            <div className="lh-copy lh-mob">
              <h1 className="lh-h1">{headline}</h1>
              <p className="lh-sub">{subtitle}</p>
            </div>

            <div className="lh-card">
              <div className="lh-desk">
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
                {campos}
              </form>
            </div>

            <div className="lh-foot">
              {tenant.support_phone && <div>Precisa de ajuda? Ligue {tenant.support_phone}</div>}
              <div style={{ marginTop: 4 }}>Central feita com LinkHub</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
