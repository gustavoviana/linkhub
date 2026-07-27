// Versão Web (desktop) — dashboard cliente
const WebDashboard = ({ dark }) => {
  const t = {
    bg: dark ? '#0b0e16' : '#f6f7fb',
    surface: dark ? '#141826' : '#ffffff',
    surface2: dark ? '#1a1f30' : '#f6f7fb',
    border: dark ? '#252a3d' : '#e7e8ee',
    text: dark ? '#eef1f8' : '#0d0f17',
    text2: dark ? '#9ca3b6' : '#525866',
    text3: dark ? '#6b7388' : '#8a90a0',
    accent: '#5b6cff',
    accentSoft: dark ? 'rgba(91,108,255,0.15)' : '#eef0ff',
  };

  const NavItem = ({ icon, label, active, badge }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: active ? t.accentSoft : 'transparent', color: active ? t.accent : t.text2, fontSize: 13, fontWeight: active ? 600 : 500, cursor: 'pointer' }}>
      <Icon name={icon} size={17}/>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: t.accent, color: '#fff', fontWeight: 700 }}>{badge}</span>}
    </div>
  );

  return (
    <div style={{ width: '100%', height: '100%', background: t.bg, color: t.text, display: 'flex', fontFamily: 'inherit', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{ width: 240, background: t.surface, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', padding: '18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px 18px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#5b6cff,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M2 9c5-5 15-5 20 0M5 12c3.5-3.5 11-3.5 14 0M9 16c1.5-1.5 4.5-1.5 6 0" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>NetVale</div>
            <div style={{ fontSize: 10, color: t.text3 }}>Central do cliente</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 10, color: t.text3, padding: '8px 14px 4px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Principal</div>
          <NavItem icon="home" label="Visão geral" active/>
          <NavItem icon="file" label="Faturas" badge="1"/>
          <NavItem icon="speed" label="Consumo de rede"/>
          <NavItem icon="wifi" label="Minha conexão"/>

          <div style={{ fontSize: 10, color: t.text3, padding: '14px 14px 4px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Suporte</div>
          <NavItem icon="help" label="Atendimento"/>
          <NavItem icon="settings" label="Configurações"/>
          <NavItem icon="user" label="Meus dados"/>
        </div>

        <div style={{ marginTop: 'auto', padding: 12, borderRadius: 12, background: t.surface2, border: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#fb923c,#ea580c)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>MS</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Maria Silva</div>
              <div style={{ fontSize: 10, color: t.text3, fontFamily: 'ui-monospace,monospace' }}>cliente #18472</div>
            </div>
          </div>
          <button style={{ width: '100%', padding: 8, borderRadius: 8, border: `1px solid ${t.border}`, background: t.surface, color: t.text2, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Sair da conta</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', padding: '20px 28px 28px' }}>
        {/* topbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: t.text2, fontWeight: 600 }}>Início / Visão geral</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '4px 0 0', letterSpacing: '-0.01em' }}>Olá, Maria 👋</h1>
          </div>
          <div style={{ position: 'relative', width: 280 }}>
            <Icon name="search" size={15} style={{ position: 'absolute', left: 12, top: 10, color: t.text3 }}/>
            <input placeholder="Buscar fatura, protocolo..." style={{ width: '100%', height: 36, padding: '0 12px 0 36px', borderRadius: 9, border: `1px solid ${t.border}`, background: t.surface, color: t.text, fontSize: 12, outline: 'none', fontFamily: 'inherit' }}/>
          </div>
          <button style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${t.border}`, background: t.surface, color: t.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
            <Icon name="bell" size={15}/>
            <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4, background: '#ef4444' }}/>
          </button>
        </div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
          {[
            { l: 'Próxima fatura', v: 'R$ 109,90', s: 'Vence em 4 dias · 10/05', icon: 'card', color: '#5b6cff', cta: 'Pagar agora' },
            { l: 'Status da conexão', v: 'Online', s: '492 ↓ / 247 ↑ Mbps', icon: 'wifi', color: '#10b981' },
            { l: 'Consumo do mês', v: '184.2 GB', s: 'Plano ilimitado', icon: 'speed', color: '#a78bfa' },
            { l: 'Plano atual', v: 'Fibra 500', s: 'Até 500 Mbps', icon: 'shield', color: '#f97316' },
          ].map((k, i) => (
            <div key={i} style={{ padding: 18, background: t.surface, borderRadius: 14, border: `1px solid ${t.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: t.text2, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{k.l}</div>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: k.color + '1f', color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={k.icon} size={14}/>
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: k.l.includes('Status') ? 'inherit' : 'ui-monospace,monospace', letterSpacing: '-0.01em' }}>{k.v}</div>
              <div style={{ fontSize: 11, color: t.text3, marginTop: 4 }}>{k.s}</div>
              {k.cta && (
                <button style={{ marginTop: 12, padding: '7px 12px', borderRadius: 8, background: k.color, color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{k.cta}</button>
              )}
            </div>
          ))}
        </div>

        {/* Two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 18 }}>
          {/* Network chart */}
          <div style={{ padding: 22, background: t.surface, borderRadius: 14, border: `1px solid ${t.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Consumo de rede</div>
                <div style={{ fontSize: 11, color: t.text2 }}>Últimos 7 dias · download e upload</div>
              </div>
              <div style={{ display: 'flex', padding: 3, background: t.surface2, borderRadius: 8, fontSize: 11 }}>
                {['24h','7d','30d'].map((p, i) => (
                  <button key={p} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: i === 1 ? t.surface : 'transparent', color: i === 1 ? t.text : t.text2, fontWeight: 600, cursor: 'pointer', fontSize: 11 }}>{p}</button>
                ))}
              </div>
            </div>

            <svg viewBox="0 0 600 200" style={{ width: '100%', height: 220 }}>
              <defs>
                <linearGradient id="dl-w" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#5b6cff" stopOpacity="0.4"/><stop offset="100%" stopColor="#5b6cff" stopOpacity="0"/></linearGradient>
                <linearGradient id="ul-w" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3"/><stop offset="100%" stopColor="#22d3ee" stopOpacity="0"/></linearGradient>
              </defs>
              {[0.25,0.5,0.75,1].map(p => (
                <g key={p}>
                  <line x1="40" y1={200 * p - 20} x2="600" y2={200 * p - 20} stroke={t.grid || t.border} strokeWidth="1" opacity="0.5"/>
                  <text x="36" y={200 * p - 17} fontSize="9" fill={t.text3} textAnchor="end" fontFamily="ui-monospace,monospace">{Math.round(200 - (200 * p - 20))}</text>
                </g>
              ))}
              {(() => {
                const dl = [120,145,98,162,138,184,165];
                const ul = [42,58,38,72,55,82,68];
                const W = 540, X0 = 50;
                const path = (d, max) => 'M ' + d.map((v, i) => `${X0 + (i / 6) * W},${180 - (v / max) * 160}`).join(' L ');
                const area = (d, max) => path(d, max) + ` L ${X0 + W},180 L ${X0},180 Z`;
                return (
                  <g>
                    <path d={area(dl, 200)} fill="url(#dl-w)"/>
                    <path d={path(dl, 200)} stroke="#5b6cff" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
                    <path d={area(ul, 200)} fill="url(#ul-w)"/>
                    <path d={path(ul, 200)} stroke="#22d3ee" strokeWidth="2" fill="none" strokeLinejoin="round"/>
                    {dl.map((v, i) => <circle key={i} cx={X0 + (i / 6) * W} cy={180 - (v / 200) * 160} r="3.5" fill="#5b6cff" stroke={t.surface} strokeWidth="2"/>)}
                  </g>
                );
              })()}
              {['Qua','Qui','Sex','Sáb','Dom','Seg','Ter'].map((d, i) => (
                <text key={i} x={50 + (i / 6) * 540} y="196" fontSize="10" fill={t.text3} textAnchor="middle" fontFamily="ui-monospace,monospace">{d}</text>
              ))}
            </svg>

            <div style={{ display: 'flex', gap: 24, marginTop: 4, paddingTop: 14, borderTop: `1px solid ${t.border}` }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: t.text2 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#5b6cff' }}/>Download</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'ui-monospace,monospace', marginTop: 2 }}>1.012 GB</div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: t.text2 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#22d3ee' }}/>Upload</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'ui-monospace,monospace', marginTop: 2 }}>415 GB</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: t.text2 }}>Pico</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'ui-monospace,monospace', marginTop: 2, color: '#f97316' }}>184 Mbps</div>
              </div>
              <div style={{ flex: 1 }}/>
              <button style={{ alignSelf: 'flex-end', padding: '8px 14px', borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', color: t.text2, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Exportar CSV</button>
            </div>
          </div>

          {/* Pay column */}
          <div style={{ padding: 22, background: t.surface, borderRadius: 14, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Pagar fatura aberta</div>
            <div style={{ fontSize: 11, color: t.text2, marginBottom: 14 }}>Vence em 4 dias · 10/05/2026</div>

            <div style={{ padding: 14, borderRadius: 12, border: `1.5px dashed ${t.border}`, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 11, color: t.text2 }}>Total</span>
                <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'ui-monospace,monospace', letterSpacing: '-0.01em' }}>R$ 109,90</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 11, color: t.text2 }}>Plano · Fibra 500</span>
                <span style={{ fontSize: 11, color: t.text2, fontFamily: 'ui-monospace,monospace' }}>ABR/2026</span>
              </div>
            </div>

            <button style={{ width: '100%', padding: 12, borderRadius: 10, background: t.text, color: t.bg, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
              <Icon name="pix" size={15}/> Pagar com Pix · grátis
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ flex: 1, padding: 10, borderRadius: 10, background: 'transparent', color: t.text, border: `1px solid ${t.border}`, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon name="barcode" size={13}/> 2ª via boleto
              </button>
              <button style={{ flex: 1, padding: 10, borderRadius: 10, background: 'transparent', color: t.text, border: `1px solid ${t.border}`, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon name="card" size={13}/> Cartão
              </button>
            </div>

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 11, color: t.text2, fontWeight: 600, marginBottom: 8 }}>Histórico</div>
              {[['Mar/26','Paga','R$ 109,90'],['Fev/26','Paga','R$ 109,90'],['Jan/26','Paga','R$ 119,90']].map((r,i)=>(
                <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: i<2?`1px solid ${t.border}`:'none' }}>
                  <div style={{ flex: 1, fontSize: 12, fontFamily: 'ui-monospace,monospace' }}>{r[0]}</div>
                  <div style={{ width: 60, fontSize: 10, color: '#10b981', fontWeight: 600 }}>● {r[1]}</div>
                  <div style={{ width: 80, fontSize: 12, fontWeight: 600, fontFamily: 'ui-monospace,monospace', textAlign: 'right' }}>{r[2]}</div>
                  <button style={{ marginLeft: 8, padding: 4, color: t.text3, background: 'transparent', border: 'none', cursor: 'pointer' }}><Icon name="download" size={12}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          {/* Speed live */}
          <div style={{ padding: 18, background: t.surface, borderRadius: 14, border: `1px solid ${t.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Velocidade ao vivo</div>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: '#10b9811f', color: '#10b981', fontWeight: 700 }}>● ATIVO</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', padding: '8px 0' }}>
              <div>
                <div style={{ fontSize: 10, color: t.text2, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Down</div>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'ui-monospace,monospace', color: '#5b6cff' }}>492</div>
                <div style={{ fontSize: 10, color: t.text3, fontFamily: 'ui-monospace,monospace' }}>Mbps</div>
              </div>
              <div style={{ width: 1, background: t.border }}/>
              <div>
                <div style={{ fontSize: 10, color: t.text2, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Up</div>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'ui-monospace,monospace', color: '#22d3ee' }}>247</div>
                <div style={{ fontSize: 10, color: t.text3, fontFamily: 'ui-monospace,monospace' }}>Mbps</div>
              </div>
              <div style={{ width: 1, background: t.border }}/>
              <div>
                <div style={{ fontSize: 10, color: t.text2, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Ping</div>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'ui-monospace,monospace', color: '#10b981' }}>8</div>
                <div style={{ fontSize: 10, color: t.text3, fontFamily: 'ui-monospace,monospace' }}>ms</div>
              </div>
            </div>
            <button style={{ marginTop: 10, width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', color: t.text, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Refazer teste</button>
          </div>

          {/* Tickets */}
          <div style={{ padding: 18, background: t.surface, borderRadius: 14, border: `1px solid ${t.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Atendimentos</div>
              <button style={{ fontSize: 11, color: t.accent, background: 'transparent', border: 'none', fontWeight: 600, cursor: 'pointer' }}>+ Abrir chamado</button>
            </div>
            {[
              ['#48721','Lentidão à noite','Resolvido','#10b981'],
              ['#48312','Troca de senha Wi-Fi','Resolvido','#10b981'],
              ['#47844','Sem conexão','Resolvido','#10b981'],
            ].map(([n,d,s,c],i)=>(
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i<2?`1px solid ${t.border}`:'none' }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: c }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d}</div>
                  <div style={{ fontSize: 10, color: t.text3, fontFamily: 'ui-monospace,monospace' }}>{n}</div>
                </div>
                <span style={{ fontSize: 10, color: c, fontWeight: 700 }}>{s}</span>
              </div>
            ))}
          </div>

          {/* Plano */}
          <div style={{ padding: 18, background: 'linear-gradient(135deg,#5b6cff,#7c3aed)', borderRadius: 14, color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }}/>
            <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Seu plano</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, letterSpacing: '-0.01em' }}>Fibra 500</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 14 }}>500 ↓ / 250 ↑ Mbps · ilimitado</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="check" size={12}/> Wi-Fi 6 incluso</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="check" size={12}/> IP fixo opcional</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="check" size={12}/> Suporte 24/7</div>
            </div>

            <button style={{ marginTop: 16, padding: '8px 14px', borderRadius: 9, background: '#fff', color: '#5b6cff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Ver opções de upgrade →</button>
          </div>
        </div>
      </main>
    </div>
  );
};

window.WebDashboard = WebDashboard;
