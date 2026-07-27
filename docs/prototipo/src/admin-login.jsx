// LinkHub Admin — Login
const AdminLogin = ({ dark, onEnter }) => {
  const t = window.LHTokens(dark);
  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', background: t.bg, color: t.text, fontFamily: t.font, overflow: 'hidden' }}>
      {/* Left — form */}
      <div style={{ padding: '48px 64px 96px', display: 'flex', flexDirection: 'column', background: t.surface, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15 }}>L</div>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>LinkHub Admin</span>
        </div>

        <div style={{ margin: 'auto 0', maxWidth: 380, width: '100%', paddingTop: 40, paddingBottom: 40 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em', margin: '0 0 8px', lineHeight: 1.15 }}>Entre na sua conta</h1>
          <p style={{ fontSize: 14, color: t.text2, margin: '0 0 32px', lineHeight: 1.55 }}>Gerencie o portal do cliente do seu provedor.</p>

          <label style={{ fontSize: 12, fontWeight: 600, color: t.text, display: 'block', marginBottom: 7 }}>E-mail corporativo</label>
          <input style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', marginBottom: 18 }} defaultValue="gustavo@lmnetfibra.com.br"/>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Senha</label>
            <span style={{ fontSize: 12, color: t.accent, fontWeight: 500 }}>Esqueci a senha</span>
          </div>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <input type="password" style={{ width: '100%', height: 44, padding: '0 42px 0 14px', borderRadius: 10, border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }} defaultValue="••••••••••"/>
            <Icon name="eye" size={17} style={{ position: 'absolute', right: 14, top: 14, color: t.text3 }}/>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: t.text2, marginBottom: 22, cursor: 'pointer' }}>
            <span style={{ width: 17, height: 17, borderRadius: 5, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="check" size={11} color="#fff"/></span>
            Manter conectado por 30 dias
          </label>

          <button onClick={onEnter} style={{ width: '100%', height: 46, borderRadius: 10, background: t.accent, color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: `0 8px 18px -8px ${t.accent}99` }}>Entrar</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: t.border }}/>
            <span style={{ fontSize: 11, color: t.text3, fontWeight: 500 }}>ou continue com</span>
            <div style={{ flex: 1, height: 1, background: t.border }}/>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {[['Google', 'globe'], ['SSO / SAML', 'shield']].map(([l, ic]) => (
              <button key={l} style={{ flex: 1, height: 44, borderRadius: 10, background: t.bg, color: t.text, border: `1px solid ${t.border}`, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Icon name={ic} size={15}/> {l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 13, color: t.text2 }}>
          Ainda não tem conta? <span style={{ color: t.accent, fontWeight: 600 }}>Criar provedor grátis</span>
        </div>
      </div>

      {/* Right — brand panel */}
      <div style={{ background: dark ? '#100c22' : '#f6f4ff', borderLeft: `1px solid ${t.border}`, padding: '56px 56px 96px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflowY: 'auto', minHeight: 0 }}>
        <div style={{ position: 'absolute', top: -140, right: -140, width: 420, height: 420, borderRadius: '50%', background: `radial-gradient(circle, ${t.accent}33, transparent 70%)` }}/>
        <div style={{ position: 'absolute', bottom: -160, left: -100, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.18), transparent 70%)' }}/>

        <div style={{ position: 'relative', maxWidth: 400 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 20, background: t.surface, border: `1px solid ${t.border}`, fontSize: 11, fontWeight: 600, color: t.accent, marginBottom: 22, whiteSpace: 'nowrap', width: 'fit-content' }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: '#10b981', flexShrink: 0 }}/> IXC · SGP · Hubsoft integrados
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25, margin: '0 0 14px' }}>Seu portal do cliente, pronto em minutos.</h2>
          <p style={{ fontSize: 14, color: t.text2, lineHeight: 1.6, margin: '0 0 32px' }}>Conecte seu ERP, aplique sua marca e libere 2ª via, Pix, boleto e abertura de chamados — sem escrever uma linha de código.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['Pagamento via Pix e boleto', 'Confirmação automática em até 5 min'],
              ['Marca 100% sua', 'Logo, cores e domínio próprio'],
              ['Sincronização em tempo real', 'Faturas e contratos sempre atualizados'],
            ].map(([tt, ss]) => (
              <div key={tt} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: 7, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}><Icon name="check" size={13} color="#fff"/></div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{tt}</div>
                  <div style={{ fontSize: 12.5, color: t.text2, marginTop: 1 }}>{ss}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 40, padding: 18, borderRadius: 14, background: t.surface, border: `1px solid ${t.border}` }}>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: '0 0 14px', color: t.text }}>“Cortamos 60% das ligações de 2ª via no primeiro mês. Os clientes resolvem sozinhos.”</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#fb923c,#ea580c)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>RT</div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>Rafael Tortelli</div>
                <div style={{ fontSize: 11.5, color: t.text3 }}>Diretor · Vale Fibra · 4.200 assinantes</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.AdminLogin = AdminLogin;
