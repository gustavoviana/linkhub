// V2 — Neo Premium · dark-first, glassmorphism, violet/cyan gradients, fintech vibe
const V2 = (() => {
  const Token = ({ dark }) => ({
    bg: dark ? '#07060f' : '#f4f3fa',
    bgGrad: dark
      ? 'radial-gradient(ellipse 80% 60% at 30% 0%, rgba(139,92,246,0.18), transparent 50%), radial-gradient(ellipse 80% 60% at 80% 30%, rgba(34,211,238,0.10), transparent 50%), #07060f'
      : 'radial-gradient(ellipse 80% 60% at 30% 0%, rgba(139,92,246,0.10), transparent 50%), radial-gradient(ellipse 80% 60% at 80% 30%, rgba(34,211,238,0.08), transparent 50%), #f4f3fa',
    surface: dark ? 'rgba(20,18,38,0.6)' : 'rgba(255,255,255,0.7)',
    surfaceSolid: dark ? '#171428' : '#ffffff',
    border: dark ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.18)',
    borderSoft: dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,16,27,0.06)',
    text: dark ? '#f1eefb' : '#13102a',
    text2: dark ? '#a7a3c2' : '#5a5475',
    text3: dark ? '#6c6789' : '#8a85a3',
    accent: '#a78bfa',
    accent2: '#22d3ee',
    success: '#34d399',
    danger: '#fb7185',
  });

  const glass = (t) => ({
    background: t.surface,
    backdropFilter: 'blur(20px) saturate(160%)',
    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    border: `1px solid ${t.border}`,
  });

  const Login = ({ dark }) => {
    const t = Token({ dark });
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.bgGrad, color: t.text, padding: '54px 24px 36px', position: 'relative', overflow: 'hidden' }}>
        {/* glow blob */}
        <div style={{ position: 'absolute', top: -120, left: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.4), transparent 70%)', filter: 'blur(40px)' }}/>
        <div style={{ position: 'absolute', top: 100, right: -100, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.25), transparent 70%)', filter: 'blur(50px)' }}/>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #a78bfa, #6d4ae0 60%, #22d3ee)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 0 0 1px rgba(255,255,255,0.12), 0 16px 40px -10px rgba(167,139,250,0.6)' }}>
            <Icon name="logo" size={30} color="#fff"/>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px', background: 'linear-gradient(135deg, #fff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}>NetVale</h1>
          <p style={{ fontSize: 14, color: t.text2, margin: 0, lineHeight: 1.6 }}>Sua conexão, seu controle.</p>
        </div>

        <div style={{ position: 'relative', zIndex: 1, marginTop: 40, padding: 22, borderRadius: 24, ...glass(t), boxShadow: '0 24px 48px -16px rgba(0,0,0,0.4)' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: t.text3, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>CPF</label>
            <input style={{ width: '100%', height: 48, padding: '0 16px', borderRadius: 12, border: `1px solid ${t.borderSoft}`, background: dark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)', color: t.text, fontSize: 16, outline: 'none', fontFamily: 'ui-monospace,monospace', letterSpacing: '0.02em' }} defaultValue="047.221.880-21"/>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: t.text3, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Senha</label>
            <div style={{ position: 'relative' }}>
              <input type="password" style={{ width: '100%', height: 48, padding: '0 44px 0 16px', borderRadius: 12, border: `1px solid ${t.borderSoft}`, background: dark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)', color: t.text, fontSize: 16, outline: 'none', fontFamily: 'inherit' }} defaultValue="••••••••"/>
              <Icon name="eye" size={18} style={{ position: 'absolute', right: 16, top: 15, color: t.text3 }}/>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: t.text2 }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={11} color="#fff"/></span>
              Lembrar
            </label>
            <span style={{ fontSize: 12, color: t.accent2, fontWeight: 600 }}>Esqueci a senha</span>
          </div>
          <button style={{ width: '100%', height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, marginTop: 18, boxShadow: '0 12px 28px -8px rgba(167,139,250,0.6), inset 0 1px 0 rgba(255,255,255,0.2)' }}>Entrar →</button>
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 8, marginTop: 16 }}>
          <button style={{ flex: 1, height: 48, borderRadius: 14, ...glass(t), color: t.text, border: `1px solid ${t.borderSoft}`, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name="qr" size={15}/> QR Code</button>
          <button style={{ flex: 1, height: 48, borderRadius: 14, ...glass(t), color: t.text, border: `1px solid ${t.borderSoft}`, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name="phone" size={15}/> WhatsApp</button>
        </div>

        <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: 12, color: t.text3, position: 'relative', zIndex: 1 }}>
          Novo por aqui? <span style={{ color: t.accent2, fontWeight: 700 }}>Criar conta</span>
        </div>
      </div>
    );
  };

  const Home = ({ dark }) => {
    const t = Token({ dark });
    return (
      <div style={{ flex: 1, overflowY: 'auto', background: t.bgGrad, color: t.text, paddingBottom: 100, position: 'relative' }}>
        {/* Header */}
        <div style={{ padding: '12px 22px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: t.text2 }}>Boa tarde,</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>Maria Aparecida</div>
          </div>
          <button style={{ width: 42, height: 42, borderRadius: 14, ...glass(t), color: t.text, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Icon name="bell" size={18}/>
            <span style={{ position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: 4, background: t.danger, border: '2px solid '+t.bg }}/>
          </button>
        </div>

        {/* Hero balance card */}
        <div style={{ margin: '16px 18px 14px', padding: 22, borderRadius: 24, background: 'linear-gradient(135deg, rgba(167,139,250,0.95), rgba(124,58,237,0.95) 60%, rgba(34,211,238,0.85))', color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 50px -16px rgba(124,58,237,0.55)' }}>
          {/* decorative arcs */}
          <svg style={{ position: 'absolute', top: -40, right: -40, opacity: 0.18 }} width="220" height="220" viewBox="0 0 220 220">
            <circle cx="110" cy="110" r="100" stroke="#fff" strokeWidth="0.5" fill="none"/>
            <circle cx="110" cy="110" r="70" stroke="#fff" strokeWidth="0.5" fill="none"/>
            <circle cx="110" cy="110" r="40" stroke="#fff" strokeWidth="0.5" fill="none"/>
          </svg>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>· Próxima fatura</span>
              <span style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(255,255,255,0.18)', borderRadius: 20, backdropFilter: 'blur(10px)', fontWeight: 600 }}>vence em 4d</span>
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', fontFamily: 'ui-monospace,monospace', marginTop: 10, lineHeight: 1 }}>R$ 109<span style={{ fontSize: 22, opacity: 0.8 }}>,90</span></div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>Fibra 500 Mega · 10/05/2026</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button style={{ flex: 1, height: 46, borderRadius: 14, border: 'none', background: 'rgba(255,255,255,0.95)', color: '#7c3aed', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}><Icon name="pix" size={16}/> Pix</button>
              <button style={{ flex: 1, height: 46, borderRadius: 14, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, backdropFilter: 'blur(8px)' }}><Icon name="barcode" size={16}/> Boleto</button>
            </div>
          </div>
        </div>

        {/* Quick actions horizontal scroll */}
        <div style={{ display: 'flex', gap: 10, padding: '0 18px 16px', overflowX: 'auto' }}>
          {[
            ['barcode','2ª via','#a78bfa'],
            ['speed','Speed test','#22d3ee'],
            ['help','Suporte','#fb7185'],
            ['settings','Plano','#34d399'],
            ['shield','Wi-Fi','#f59e0b'],
          ].map(([i,l,c],k) => (
            <div key={k} style={{ minWidth: 96, padding: '14px 10px', borderRadius: 18, ...glass(t), textAlign: 'center', border: `1px solid ${t.borderSoft}` }}>
              <div style={{ width: 38, height: 38, margin: '0 auto', borderRadius: 12, background: c+'22', color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px '+c+'33' }}><Icon name={i} size={18}/></div>
              <div style={{ fontSize: 11, marginTop: 8, fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Connection live */}
        <div style={{ margin: '0 18px 14px', padding: 18, borderRadius: 20, ...glass(t) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: t.success }}/>
              <div style={{ position: 'absolute', inset: -4, borderRadius: 8, border: `2px solid ${t.success}66`, animation: 'pulse 2s infinite' }}/>
            </div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Conexão estável</div>
            <span style={{ fontSize: 11, color: t.text2, fontFamily: 'ui-monospace,monospace' }}>ping 4ms</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[['↓ Down','492','Mbps',t.accent],['↑ Up','247','Mbps',t.accent2],['◉ Sinal','-18.4','dBm',t.success]].map((r,i) => (
              <div key={i}>
                <div style={{ fontSize: 10, color: t.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r[0]}</div>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'ui-monospace,monospace', letterSpacing: '-0.02em', color: r[3], marginTop: 2 }}>{r[1]}</div>
                <div style={{ fontSize: 10, color: t.text3 }}>{r[2]}</div>
              </div>
            ))}
          </div>
          {/* Mini sparkline */}
          <svg style={{ width: '100%', height: 36, marginTop: 12 }} viewBox="0 0 100 36" preserveAspectRatio="none">
            <defs>
              <linearGradient id="v2spark" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity="0.5"/><stop offset="100%" stopColor="#a78bfa" stopOpacity="0"/></linearGradient>
            </defs>
            <path d="M0 22 L10 18 L20 24 L30 14 L40 16 L50 8 L60 12 L70 6 L80 10 L90 4 L100 8 L100 36 L0 36 Z" fill="url(#v2spark)"/>
            <path d="M0 22 L10 18 L20 24 L30 14 L40 16 L50 8 L60 12 L70 6 L80 10 L90 4 L100 8" stroke="#a78bfa" strokeWidth="1.4" fill="none"/>
          </svg>
        </div>

        {/* Recent payments */}
        <div style={{ margin: '0 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.text2 }}>Histórico</span>
            <span style={{ fontSize: 12, color: t.accent2, fontWeight: 600 }}>Ver tudo →</span>
          </div>
          {[['Abril','R$ 109,90','Pix','#34d399'],['Março','R$ 109,90','Boleto','#a78bfa'],['Fevereiro','R$ 109,90','Pix','#34d399']].map((r,i) => (
            <div key={i} style={{ padding: '12px 14px', borderRadius: 16, ...glass(t), marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: r[3]+'22', color: r[3], display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={r[2]==='Pix'?'pix':'barcode'} size={16}/></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r[0]} 2026</div>
                <div style={{ fontSize: 11, color: t.text2 }}>Pago via {r[2]}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'ui-monospace,monospace' }}>{r[1]}</div>
            </div>
          ))}
        </div>

        {/* Floating tab bar */}
        <div style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', padding: '8px 6px', ...glass(t), borderRadius: 28, display: 'flex', gap: 4, boxShadow: '0 16px 40px -8px rgba(0,0,0,0.4)' }}>
          {[['home',true],['file',false],['stats',false],['user',false]].map(([i,a],k) => (
            <button key={k} style={{ width: 56, height: 44, borderRadius: 22, background: a ? 'linear-gradient(135deg,#a78bfa,#7c3aed)' : 'transparent', color: a ? '#fff' : t.text2, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: a ? '0 8px 16px -4px rgba(124,58,237,0.5)' : 'none' }}>
              <Icon name={i} size={20}/>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const Fatura = ({ dark }) => {
    const t = Token({ dark });
    return (
      <div style={{ flex: 1, overflowY: 'auto', background: t.bgGrad, color: t.text, paddingBottom: 30, position: 'relative' }}>
        <div style={{ padding: '12px 20px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={{ width: 42, height: 42, borderRadius: 14, ...glass(t), color: t.text, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${t.borderSoft}` }}>
            <Icon name="chevron" size={18} style={{ transform: 'rotate(180deg)' }}/>
          </button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700 }}>Pagar fatura</div>
          <button style={{ width: 42, height: 42, borderRadius: 14, ...glass(t), color: t.text, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${t.borderSoft}` }}>
            <Icon name="help" size={17}/>
          </button>
        </div>

        {/* Hero amount */}
        <div style={{ margin: '14px 18px 16px', padding: '24px 22px', borderRadius: 24, background: 'linear-gradient(135deg, rgba(167,139,250,0.18), rgba(34,211,238,0.10))', border: `1px solid ${t.border}`, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: 11, color: t.text2, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total a pagar</div>
          <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', fontFamily: 'ui-monospace,monospace', marginTop: 6, background: 'linear-gradient(135deg,#a78bfa,#22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}>R$ 109,90</div>
          <div style={{ fontSize: 12, color: t.text2, marginTop: 4 }}>Vencimento 10/05 · Fibra 500</div>
        </div>

        {/* QR Pix */}
        <div style={{ margin: '0 18px 12px', padding: 22, borderRadius: 22, ...glass(t), textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(167,139,250,0.18)', color: t.accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
            <Icon name="pix" size={12}/> Pix · QR estático
          </div>
          <div style={{ width: 196, height: 196, margin: '0 auto 14px', background: '#fff', borderRadius: 18, padding: 14, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -4, borderRadius: 22, background: 'linear-gradient(135deg,#a78bfa,#22d3ee)', zIndex: -1, filter: 'blur(8px)', opacity: 0.5 }}/>
            <svg viewBox="0 0 100 100" width="168" height="168">
              {Array.from({ length: 25 }).map((_, r) => Array.from({ length: 25 }).map((_, c) => {
                const filled = (r + c + r * c * 11) % 3 === 0 || ((r < 7 && c < 7) || (r < 7 && c > 17) || (r > 17 && c < 7));
                return filled ? <rect key={`${r}-${c}`} x={c * 4} y={r * 4} width="4" height="4" fill="#0a0a0a"/> : null;
              }))}
              <rect x="38" y="38" width="24" height="24" rx="4" fill="#fff"/>
              <rect x="42" y="42" width="16" height="16" rx="3" fill="#7c3aed"/>
            </svg>
          </div>
          <div style={{ fontSize: 12, color: t.text2, marginBottom: 14 }}>QR válido até 10/05 · gerado agora</div>
          <button style={{ width: '100%', height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#a78bfa,#7c3aed)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 12px 28px -8px rgba(124,58,237,0.5)' }}>
            <Icon name="copy" size={15}/> Copiar Pix Copia e Cola
          </button>
        </div>

        {/* Other methods */}
        <div style={{ margin: '0 18px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button style={{ padding: 14, borderRadius: 16, ...glass(t), color: t.text, border: `1px solid ${t.borderSoft}`, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(167,139,250,0.2)', color: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="barcode" size={16}/></div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Boleto</div>
            <div style={{ fontSize: 11, color: t.text2, textAlign: 'left' }}>compensa em 1-2 dias</div>
          </button>
          <button style={{ padding: 14, borderRadius: 16, ...glass(t), color: t.text, border: `1px solid ${t.borderSoft}`, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(34,211,238,0.2)', color: t.accent2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="card" size={16}/></div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Cartão</div>
            <div style={{ fontSize: 11, color: t.text2, textAlign: 'left' }}>até 12x · taxa 2,99%</div>
          </button>
        </div>

        <div style={{ margin: '8px 18px 0', padding: 14, borderRadius: 14, background: 'rgba(34,211,238,0.10)', border: '1px solid rgba(34,211,238,0.2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="shield" size={18} color={t.accent2} style={{ marginTop: 2 }}/>
          <div style={{ fontSize: 12, color: t.text, lineHeight: 1.5 }}>Pagamento via Pix processado em até <strong>5 minutos</strong>. Notificação automática quando aprovado.</div>
        </div>
      </div>
    );
  };

  return { Login, Home, Fatura };
})();

window.V2 = V2;
