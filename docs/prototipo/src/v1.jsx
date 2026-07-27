// V1 — Clean Minimal · indigo + slate, iOS-inspired, generous whitespace
const V1 = (() => {
  const Token = ({ dark }) => ({
    bg: dark ? '#0b0e16' : '#f5f6fa',
    surface: dark ? '#141826' : '#ffffff',
    surface2: dark ? '#1c2030' : '#f0f1f6',
    border: dark ? '#252a3d' : '#e7e8ee',
    text: dark ? '#eef1f8' : '#0d0f17',
    text2: dark ? '#9ca3b6' : '#525866',
    text3: dark ? '#6b7388' : '#8a90a0',
    accent: '#5b6cff',
    accentSoft: dark ? 'rgba(91,108,255,0.16)' : '#eef0ff',
    success: dark ? '#34d399' : '#0e9f6e',
    successSoft: dark ? 'rgba(52,211,153,0.14)' : '#e6faf3',
  });

  const Login = ({ dark }) => {
    const t = Token({ dark });
    return (
      <div style={{ flex: 1, padding: '60px 28px 40px', display: 'flex', flexDirection: 'column', background: t.bg, color: t.text }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${t.accent}, #3b4cdb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, boxShadow: '0 12px 24px -8px rgba(91,108,255,0.5)' }}>
          <Icon name="wifi" size={26} color="#fff"/>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Bem-vindo</h1>
        <p style={{ fontSize: 15, color: t.text2, margin: 0, lineHeight: 1.5 }}>Acesse sua central do cliente para gerenciar sua conexão.</p>

        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: t.text2, fontWeight: 500, display: 'block', marginBottom: 6 }}>CPF / CNPJ</label>
            <div style={{ position: 'relative' }}>
              <input style={{ width: '100%', height: 48, padding: '0 14px 0 42px', borderRadius: 12, border: `1px solid ${t.border}`, background: t.surface, color: t.text, fontSize: 15, outline: 'none', fontFamily: 'inherit' }} defaultValue="047.221.880-21"/>
              <Icon name="user" size={18} style={{ position: 'absolute', left: 14, top: 15, color: t.text3 }}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: t.text2, fontWeight: 500, display: 'block', marginBottom: 6 }}>Senha</label>
            <div style={{ position: 'relative' }}>
              <input type="password" style={{ width: '100%', height: 48, padding: '0 44px 0 42px', borderRadius: 12, border: `1px solid ${t.border}`, background: t.surface, color: t.text, fontSize: 15, outline: 'none', fontFamily: 'inherit' }} defaultValue="••••••••"/>
              <Icon name="lock" size={18} style={{ position: 'absolute', left: 14, top: 15, color: t.text3 }}/>
              <Icon name="eye" size={18} style={{ position: 'absolute', right: 14, top: 15, color: t.text3 }}/>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 13, color: t.accent, fontWeight: 500 }}>Esqueci minha senha</span>
          </div>
          <button style={{ height: 52, borderRadius: 14, background: t.accent, color: '#fff', border: 'none', fontSize: 15, fontWeight: 600, marginTop: 4, boxShadow: '0 8px 20px -6px rgba(91,108,255,0.5)' }}>Entrar</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0' }}>
            <div style={{ flex: 1, height: 1, background: t.border }}/>
            <span style={{ fontSize: 11, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>ou</span>
            <div style={{ flex: 1, height: 1, background: t.border }}/>
          </div>
          <button style={{ height: 48, borderRadius: 12, background: t.surface, color: t.text, border: `1px solid ${t.border}`, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="qr" size={16}/> Entrar com QR Code
          </button>
        </div>

        <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: 12, color: t.text3 }}>
          Não tem cadastro? <span style={{ color: t.accent, fontWeight: 600 }}>Criar conta</span>
        </div>
      </div>
    );
  };

  const Home = ({ dark }) => {
    const t = Token({ dark });
    return (
      <div style={{ flex: 1, overflowY: 'auto', background: t.bg, color: t.text, paddingBottom: 90 }}>
        <div style={{ padding: '12px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, color: t.text2 }}>Olá,</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>Maria Aparecida</div>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#fcd5b4,#f9a87a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#7c3a14' }}>MA</div>
            <div style={{ position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: t.success, border: `2px solid ${t.bg}` }}/>
          </div>
        </div>

        {/* Fatura card */}
        <div style={{ margin: '20px 20px 16px', padding: 22, borderRadius: 20, background: `linear-gradient(135deg, ${t.accent}, #3a48cf)`, color: '#fff', boxShadow: '0 16px 30px -12px rgba(91,108,255,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <span style={{ fontSize: 11, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Próxima fatura</span>
            <span style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(255,255,255,0.18)', borderRadius: 12, fontWeight: 600 }}>4 dias</span>
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'ui-monospace,monospace', marginTop: 6 }}>R$ 109,90</div>
          <div style={{ fontSize: 13, opacity: 0.88, marginTop: 2 }}>Vence 10/05/2026 · Fibra 500 Mega</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button style={{ flex: 1, height: 42, borderRadius: 12, border: 'none', background: '#fff', color: t.accent, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name="pix" size={15}/> Pagar com Pix</button>
            <button style={{ width: 42, height: 42, borderRadius: 12, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.12)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="barcode" size={16}/></button>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            ['barcode','2ª via', t.accent],
            ['speed','Velocidade', '#10b981'],
            ['help','Suporte', '#f59e0b'],
            ['settings','Plano', '#ec4899'],
          ].map(([i,l,c],k) => (
            <div key={k} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: '12px 4px 10px', textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, margin: '0 auto', borderRadius: 10, background: c+'1a', color: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={i} size={17}/></div>
              <div style={{ fontSize: 11, marginTop: 7, fontWeight: 500, color: t.text }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Connection */}
        <div style={{ margin: '0 20px 14px', padding: 18, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: t.successSoft, color: t.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="wifi" size={18}/></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Sua conexão</div>
              <div style={{ fontSize: 12, color: t.text2 }}>Estável · 500 / 250 Mbps</div>
            </div>
            <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 10, background: t.successSoft, color: t.success, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: 3, background: t.success }}/>Online</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: t.text2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Download</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'ui-monospace,monospace', letterSpacing: '-0.02em' }}>492<span style={{ fontSize: 12, color: t.text2, fontWeight: 500, marginLeft: 4 }}>Mbps</span></div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: t.text2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Upload</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'ui-monospace,monospace', letterSpacing: '-0.02em' }}>247<span style={{ fontSize: 12, color: t.text2, fontWeight: 500, marginLeft: 4 }}>Mbps</span></div>
            </div>
          </div>
        </div>

        {/* History */}
        <div style={{ margin: '8px 20px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.text2, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
            <span>Últimas faturas</span>
            <span style={{ color: t.accent }}>Ver todas</span>
          </div>
          {[['Abril 2026','R$ 109,90','paga'],['Março 2026','R$ 109,90','paga'],['Fevereiro 2026','R$ 109,90','paga']].map((r,i) => (
            <div key={i} style={{ padding: '14px 14px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: t.successSoft, color: t.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={16}/></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r[0]}</div>
                <div style={{ fontSize: 12, color: t.text2, fontFamily: 'ui-monospace,monospace' }}>{r[1]}</div>
              </div>
              <Icon name="download" size={16} color={t.text3}/>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div style={{ position: 'absolute', bottom: 22, left: 14, right: 14, padding: '8px 6px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 22, display: 'flex', justifyContent: 'space-around', boxShadow: dark ? '0 -4px 18px rgba(0,0,0,0.5)' : '0 -4px 16px rgba(15,16,27,0.06)', backdropFilter: 'blur(20px)' }}>
          {[['home','Início',true],['file','Faturas',false],['stats','Conexão',false],['user','Conta',false]].map(([i,l,a],k) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 14px', borderRadius: 14, background: a ? t.accentSoft : 'transparent', color: a ? t.accent : t.text3 }}>
              <Icon name={i} size={18}/>
              <span style={{ fontSize: 10, fontWeight: 600 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const Fatura = ({ dark }) => {
    const t = Token({ dark });
    return (
      <div style={{ flex: 1, overflowY: 'auto', background: t.bg, color: t.text, paddingBottom: 30 }}>
        {/* Top nav */}
        <div style={{ padding: '12px 20px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={{ width: 40, height: 40, borderRadius: 12, background: t.surface, border: `1px solid ${t.border}`, color: t.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevron" size={18} style={{ transform: 'rotate(180deg)' }}/>
          </button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700 }}>Pagamento</div>
          <button style={{ width: 40, height: 40, borderRadius: 12, background: t.surface, border: `1px solid ${t.border}`, color: t.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="download" size={17}/>
          </button>
        </div>

        {/* Amount */}
        <div style={{ textAlign: 'center', padding: '8px 24px 24px' }}>
          <div style={{ fontSize: 11, color: t.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total a pagar</div>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'ui-monospace,monospace', marginTop: 4 }}>R$ 109,90</div>
          <div style={{ fontSize: 13, color: t.text2, marginTop: 4 }}>Vencimento 10/05/2026 · NF 0008712</div>
        </div>

        {/* Method tabs */}
        <div style={{ margin: '0 20px 14px', padding: 4, background: t.surface2, borderRadius: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
          <button style={{ height: 36, borderRadius: 9, background: t.surface, color: t.text, border: 'none', fontSize: 13, fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>Pix</button>
          <button style={{ height: 36, borderRadius: 9, background: 'transparent', color: t.text2, border: 'none', fontSize: 13, fontWeight: 500 }}>Boleto</button>
          <button style={{ height: 36, borderRadius: 9, background: 'transparent', color: t.text2, border: 'none', fontSize: 13, fontWeight: 500 }}>Cartão</button>
        </div>

        {/* QR card */}
        <div style={{ margin: '0 20px 12px', padding: 20, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, textAlign: 'center' }}>
          <div style={{ width: 188, height: 188, margin: '0 auto 14px', background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 100 100" width="164" height="164">
              {Array.from({ length: 25 }).map((_, r) => Array.from({ length: 25 }).map((_, c) => {
                const filled = (r + c + r * c * 7) % 3 === 0 || ((r < 7 && c < 7) || (r < 7 && c > 17) || (r > 17 && c < 7));
                return filled ? <rect key={`${r}-${c}`} x={c * 4} y={r * 4} width="4" height="4" fill="#0a0a0a"/> : null;
              }))}
              <rect x="42" y="42" width="16" height="16" rx="3" fill="#fff"/>
              <rect x="44" y="44" width="12" height="12" rx="2" fill="#0a0a0a"/>
              <path d="M48 48l4 4 4-4-4-4z" fill="#fff"/>
            </svg>
          </div>
          <div style={{ fontSize: 13, color: t.text2, marginBottom: 14 }}>Escaneie no app do seu banco</div>
          <button style={{ width: '100%', height: 48, borderRadius: 12, background: t.accent, color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="copy" size={15}/> Copiar código Pix
          </button>
        </div>

        <div style={{ margin: '0 20px 12px', padding: 16, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16 }}>
          <div style={{ fontSize: 12, color: t.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Detalhes</div>
          {[['Plano Fibra 500 Mega','R$ 109,90'],['Adicionais','R$ 0,00'],['Subtotal','R$ 109,90'],['Tributos (ISS 2,5%)','R$ 2,75']].map((r,i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 3 ? `1px solid ${t.border}` : 'none', fontSize: 13 }}>
              <span style={{ color: i === 2 ? t.text : t.text2 }}>{r[0]}</span>
              <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: i === 2 ? 600 : 500 }}>{r[1]}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `2px solid ${t.border}`, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Total</span>
            <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 700, fontSize: 16 }}>R$ 109,90</span>
          </div>
        </div>

        <div style={{ margin: '0 20px', padding: '14px 16px', background: t.accentSoft, border: `1px solid ${t.accent}33`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="shield" size={20} color={t.accent}/>
          <div style={{ flex: 1, fontSize: 12, color: t.text }}>Pagamento Pix processado em até <strong>5 minutos</strong></div>
        </div>
      </div>
    );
  };

  return { Login, Home, Fatura };
})();

window.V1 = V1;
