// V3 — Friendly Bold · warm coral + amber, big rounded shapes, illustrative personality
const V3 = (() => {
  const Token = ({ dark }) => ({
    bg: dark ? '#1a1410' : '#fff7ef',
    surface: dark ? '#241b14' : '#ffffff',
    surface2: dark ? '#2e2218' : '#fdedd9',
    border: dark ? '#3a2c20' : '#f4dec0',
    text: dark ? '#fef3e8' : '#1a0f08',
    text2: dark ? '#c9a986' : '#7a4f2c',
    text3: dark ? '#947254' : '#a87a4d',
    accent: '#f97316',
    accent2: '#ea580c',
    accentSoft: dark ? 'rgba(249,115,22,0.15)' : '#fff0e0',
    pink: '#ec4899',
    teal: '#14b8a6',
    yellow: '#facc15',
  });

  const Login = ({ dark }) => {
    const t = Token({ dark });
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.bg, color: t.text, position: 'relative', overflow: 'hidden' }}>
        {/* Big illustrated header */}
        <div style={{ height: 320, background: 'linear-gradient(160deg, #fb923c 0%, #f97316 50%, #ea580c 100%)', position: 'relative', overflow: 'hidden', borderBottomLeftRadius: 48, borderBottomRightRadius: 48 }}>
          {/* sun */}
          <div style={{ position: 'absolute', top: 60, right: -30, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, #fde68a 0%, #fbbf24 60%, transparent 70%)', opacity: 0.7 }}/>
          {/* clouds / blobs */}
          <div style={{ position: 'absolute', top: 100, left: -40, width: 160, height: 120, borderRadius: 60, background: 'rgba(255,255,255,0.18)' }}/>
          <div style={{ position: 'absolute', top: 200, left: 40, width: 100, height: 70, borderRadius: 40, background: 'rgba(255,255,255,0.12)' }}/>
          {/* router illustration */}
          <div style={{ position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)', width: 180, height: 100 }}>
            <svg width="180" height="100" viewBox="0 0 180 100">
              {/* signal arcs */}
              <path d="M30 80 Q90 -10 150 80" stroke="#fff" strokeWidth="2" fill="none" opacity="0.4"/>
              <path d="M50 80 Q90 20 130 80" stroke="#fff" strokeWidth="2" fill="none" opacity="0.55"/>
              <path d="M70 80 Q90 50 110 80" stroke="#fff" strokeWidth="2" fill="none" opacity="0.7"/>
              {/* router body */}
              <rect x="50" y="60" width="80" height="28" rx="6" fill="#fff"/>
              <circle cx="62" cy="80" r="2.5" fill="#22c55e"/>
              <circle cx="72" cy="80" r="2.5" fill="#facc15"/>
              <circle cx="82" cy="80" r="2.5" fill="#fff" opacity="0.4" stroke="#f97316" strokeWidth="1"/>
              <line x1="60" y1="68" x2="80" y2="68" stroke="#f97316" strokeWidth="1.5"/>
              {/* antenna */}
              <line x1="58" y1="60" x2="50" y2="46" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
              <line x1="122" y1="60" x2="130" y2="46" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="50" cy="46" r="3" fill="#fff"/>
              <circle cx="130" cy="46" r="3" fill="#fff"/>
            </svg>
          </div>
          {/* status text */}
          <div style={{ position: 'absolute', top: 70, left: 28, color: '#fff' }}>
            <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 600 }}>NetVale Telecom</div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 6 }}>Olá! 👋</div>
            <div style={{ fontSize: 14, opacity: 0.95, marginTop: 2 }}>Pronto pra navegar?</div>
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '28px 24px 24px', flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 4px' }}>Entrar</h2>
          <p style={{ fontSize: 13, color: t.text2, margin: '0 0 22px' }}>Acesse com seu CPF e senha cadastrados.</p>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: t.text, display: 'block', marginBottom: 6 }}>CPF</label>
            <input style={{ width: '100%', height: 52, padding: '0 18px', borderRadius: 16, border: `2px solid ${t.border}`, background: t.surface, color: t.text, fontSize: 15, outline: 'none', fontFamily: 'inherit' }} defaultValue="047.221.880-21"/>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: t.text, display: 'block', marginBottom: 6 }}>Senha</label>
            <div style={{ position: 'relative' }}>
              <input type="password" style={{ width: '100%', height: 52, padding: '0 48px 0 18px', borderRadius: 16, border: `2px solid ${t.border}`, background: t.surface, color: t.text, fontSize: 15, outline: 'none', fontFamily: 'inherit' }} defaultValue="••••••••"/>
              <Icon name="eye" size={18} style={{ position: 'absolute', right: 18, top: 17, color: t.text3 }}/>
            </div>
          </div>

          <button style={{ width: '100%', height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #fb923c, #ea580c)', color: '#fff', border: 'none', fontSize: 16, fontWeight: 800, boxShadow: '0 12px 28px -8px rgba(234,88,12,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Entrar <Icon name="arrow-right" size={18}/>
          </button>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: t.accent, fontWeight: 600 }}>
            Esqueceu a senha?
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 2, background: t.border, borderRadius: 1 }}/>
            <span style={{ fontSize: 12, color: t.text3, fontWeight: 700 }}>OU</span>
            <div style={{ flex: 1, height: 2, background: t.border, borderRadius: 1 }}/>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ flex: 1, height: 52, borderRadius: 16, background: t.surface, color: t.text, border: `2px solid ${t.border}`, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Icon name="qr" size={17}/> QR Code</button>
            <button style={{ flex: 1, height: 52, borderRadius: 16, background: '#25d366', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Icon name="chat" size={17}/> WhatsApp</button>
          </div>
        </div>
      </div>
    );
  };

  const Home = ({ dark }) => {
    const t = Token({ dark });
    return (
      <div style={{ flex: 1, overflowY: 'auto', background: t.bg, color: t.text, paddingBottom: 100 }}>
        {/* Top header */}
        <div style={{ background: 'linear-gradient(160deg, #fb923c, #ea580c)', padding: '18px 22px 56px', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, position: 'relative', overflow: 'hidden', marginBottom: 60 }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}/>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Boa tarde,</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Maria 👋</div>
            </div>
            <button style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Icon name="bell" size={18}/>
              <span style={{ position: 'absolute', top: 8, right: 8, width: 9, height: 9, borderRadius: 5, background: '#facc15', border: '2px solid #ea580c' }}/>
            </button>
          </div>
        </div>

        {/* Floating fatura card */}
        <div style={{ margin: '-60px 18px 16px', padding: 22, background: t.surface, borderRadius: 26, boxShadow: '0 20px 40px -12px rgba(234,88,12,0.2), 0 0 0 1px '+t.border, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: t.text2, fontWeight: 600 }}>Sua próxima fatura</div>
              <div style={{ fontSize: 36, fontWeight: 800, marginTop: 6, letterSpacing: '-0.02em' }}>R$ 109<span style={{ fontSize: 22, color: t.text2 }}>,90</span></div>
            </div>
            <div style={{ background: t.accentSoft, color: t.accent2, fontSize: 11, fontWeight: 800, padding: '6px 12px', borderRadius: 20 }}>4 dias</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13, color: t.text2 }}>
            <Icon name="wifi" size={13}/> Fibra 500 · vence 10/05/2026
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button style={{ flex: 1.5, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#fb923c,#ea580c)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 20px -6px rgba(234,88,12,0.5)' }}>
              <Icon name="pix" size={17}/> Pagar com Pix
            </button>
            <button style={{ flex: 1, height: 52, borderRadius: 16, background: t.surface2, color: t.accent2, border: 'none', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="barcode" size={15}/> Boleto
            </button>
          </div>
        </div>

        {/* Quick tiles, big and friendly */}
        <div style={{ padding: '0 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ padding: 16, background: 'linear-gradient(135deg,#fef3c7,#fde68a)', borderRadius: 22, position: 'relative', overflow: 'hidden', minHeight: 110 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#facc15', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px -4px rgba(250,204,21,0.5)' }}>
              <Icon name="speed" size={22} color="#78350f"/>
            </div>
            <div style={{ marginTop: 12, fontSize: 14, fontWeight: 800, color: '#78350f' }}>Speed test</div>
            <div style={{ fontSize: 11, color: '#92400e', marginTop: 2 }}>Teste sua velocidade</div>
          </div>
          <div style={{ padding: 16, background: 'linear-gradient(135deg,#fce7f3,#fbcfe8)', borderRadius: 22, minHeight: 110 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px -4px rgba(236,72,153,0.5)' }}>
              <Icon name="help" size={22} color="#fff"/>
            </div>
            <div style={{ marginTop: 12, fontSize: 14, fontWeight: 800, color: '#831843' }}>Suporte</div>
            <div style={{ fontSize: 11, color: '#9d174d', marginTop: 2 }}>Tire suas dúvidas</div>
          </div>
          <div style={{ padding: 16, background: 'linear-gradient(135deg,#ccfbf1,#99f6e4)', borderRadius: 22, minHeight: 110 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#14b8a6', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px -4px rgba(20,184,166,0.5)' }}>
              <Icon name="settings" size={22} color="#fff"/>
            </div>
            <div style={{ marginTop: 12, fontSize: 14, fontWeight: 800, color: '#134e4a' }}>Meu plano</div>
            <div style={{ fontSize: 11, color: '#115e59', marginTop: 2 }}>500 / 250 Mbps</div>
          </div>
          <div style={{ padding: 16, background: 'linear-gradient(135deg,#dbeafe,#bfdbfe)', borderRadius: 22, minHeight: 110 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px -4px rgba(59,130,246,0.5)' }}>
              <Icon name="lock" size={22} color="#fff"/>
            </div>
            <div style={{ marginTop: 12, fontSize: 14, fontWeight: 800, color: '#1e3a8a' }}>Senha Wi-Fi</div>
            <div style={{ fontSize: 11, color: '#1e40af', marginTop: 2 }}>Trocar agora</div>
          </div>
        </div>

        {/* Connection status */}
        <div style={{ margin: '0 18px 16px', padding: 18, background: t.surface, borderRadius: 22, border: `2px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#86efac,#22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="wifi" size={22} color="#fff"/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Tudo certo! ✨</div>
              <div style={{ fontSize: 12, color: t.text2 }}>Sua conexão está ótima</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '12px 0 4px', borderTop: `2px dashed ${t.border}` }}>
            <div>
              <div style={{ fontSize: 10, color: t.text2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Download</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'ui-monospace,monospace', color: '#22c55e' }}>492<span style={{ fontSize: 12, color: t.text2 }}> Mbps</span></div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: t.text2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Upload</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'ui-monospace,monospace', color: '#3b82f6' }}>247<span style={{ fontSize: 12, color: t.text2 }}> Mbps</span></div>
            </div>
          </div>
        </div>

        {/* History — chunky cards */}
        <div style={{ padding: '0 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Pagamentos recentes</div>
          {[['Abr 26','R$ 109,90','✓ Paga via Pix'],['Mar 26','R$ 109,90','✓ Paga via Pix'],['Fev 26','R$ 109,90','✓ Paga via Boleto']].map((r,i) => (
            <div key={i} style={{ padding: 14, background: t.surface, borderRadius: 18, border: `2px solid ${t.border}`, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: t.accentSoft, color: t.accent2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, lineHeight: 1.1 }}>
                <div style={{ fontSize: 8, opacity: 0.7 }}>{r[0].split(' ')[1]}</div>
                <div style={{ fontSize: 12 }}>{r[0].split(' ')[0]}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{r[1]}</div>
                <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>{r[2]}</div>
              </div>
              <Icon name="download" size={18} color={t.accent2}/>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div style={{ position: 'absolute', bottom: 16, left: 14, right: 14, padding: 6, background: t.surface, borderRadius: 24, display: 'flex', justifyContent: 'space-around', boxShadow: '0 -4px 20px rgba(234,88,12,0.12)', border: `1px solid ${t.border}` }}>
          {[['home','Início',true],['file','Faturas',false],['help','Ajuda',false],['user','Conta',false]].map(([i,l,a],k) => (
            <div key={k} style={{ flex: 1, padding: '10px 4px', borderRadius: 18, background: a ? 'linear-gradient(135deg,#fb923c,#ea580c)' : 'transparent', color: a ? '#fff' : t.text3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Icon name={i} size={18}/>
              <span style={{ fontSize: 10, fontWeight: 700 }}>{l}</span>
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
        <div style={{ background: 'linear-gradient(160deg, #fb923c, #ea580c)', padding: '18px 20px 52px', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, position: 'relative', overflow: 'hidden', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevron" size={18} style={{ transform: 'rotate(180deg)' }}/>
            </button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 800, color: '#fff' }}>Pagar fatura</div>
            <button style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="help" size={17}/>
            </button>
          </div>
          <div style={{ textAlign: 'center', color: '#fff', marginTop: 18 }}>
            <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>Total a pagar</div>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 4 }}>R$ 109,90</div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>Vence em 4 dias · 10/05/2026</div>
          </div>
        </div>

        <div style={{ margin: '-40px 18px 14px', padding: 22, background: t.surface, borderRadius: 26, boxShadow: '0 16px 36px -12px rgba(234,88,12,0.18)', border: `2px solid ${t.border}`, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'linear-gradient(135deg,#86efac,#22c55e)', color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', marginBottom: 14 }}>
            <Icon name="pix" size={12}/> PIX · MAIS RÁPIDO
          </div>
          <div style={{ width: 196, height: 196, margin: '0 auto 16px', background: '#fff', borderRadius: 22, padding: 14, border: `3px solid ${t.border}` }}>
            <svg viewBox="0 0 100 100" width="168" height="168">
              {Array.from({ length: 25 }).map((_, r) => Array.from({ length: 25 }).map((_, c) => {
                const filled = (r + c + r * c * 13) % 3 === 0 || ((r < 7 && c < 7) || (r < 7 && c > 17) || (r > 17 && c < 7));
                return filled ? <rect key={`${r}-${c}`} x={c * 4} y={r * 4} width="4" height="4" fill="#0a0a0a"/> : null;
              }))}
              <rect x="40" y="40" width="20" height="20" rx="4" fill="#fff"/>
              <rect x="44" y="44" width="12" height="12" rx="3" fill="#f97316"/>
            </svg>
          </div>
          <button style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#fb923c,#ea580c)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 10px 24px -6px rgba(234,88,12,0.5)' }}>
            <Icon name="copy" size={16}/> Copiar código Pix
          </button>
          <div style={{ fontSize: 11, color: t.text2, marginTop: 10 }}>Código válido até 10/05 às 23:59</div>
        </div>

        <div style={{ margin: '0 18px 12px' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: t.text2, marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Outras formas</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button style={{ padding: 16, background: t.surface, borderRadius: 18, border: `2px solid ${t.border}`, color: t.text, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: t.accentSoft, color: t.accent2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="barcode" size={18}/></div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Boleto</div>
              <div style={{ fontSize: 11, color: t.text2 }}>Compensa em até 2 dias úteis</div>
            </button>
            <button style={{ padding: 16, background: t.surface, borderRadius: 18, border: `2px solid ${t.border}`, color: t.text, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#dbeafe', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="card" size={18}/></div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Cartão</div>
              <div style={{ fontSize: 11, color: t.text2 }}>Parcele em até 12x</div>
            </button>
          </div>
        </div>

        <div style={{ margin: '8px 18px 0', padding: 16, background: 'linear-gradient(135deg,#fef3c7,#fde68a)', borderRadius: 18, display: 'flex', gap: 12, alignItems: 'flex-start', border: '2px solid #fcd34d' }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: '#facc15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="flash" size={18} color="#78350f"/>
          </div>
          <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>
            <strong style={{ display: 'block', marginBottom: 2 }}>Pague com Pix e ganhe!</strong>
            Pagamento em até 5 minutos. Você recebe a confirmação na hora.
          </div>
        </div>
      </div>
    );
  };

  return { Login, Home, Fatura };
})();

window.V3 = V3;
