// Central do Cliente (PWA mockup)
const PortalHome = () => (
  <div style={{padding: '8px 18px 80px'}}>
    <div className="row" style={{justifyContent: 'space-between', marginTop: 6, marginBottom: 16}}>
      <div>
        <div style={{fontSize: 11, color: 'var(--text-2)'}}>Olá,</div>
        <div style={{fontSize: 18, fontWeight: 600}}>Maria Aparecida 👋</div>
      </div>
      <div className="avatar" style={{width: 36, height: 36, fontSize: 12, background: 'hsl(40,60%,90%)', color: 'hsl(40,50%,30%)'}}>MS</div>
    </div>

    <div style={{padding: 16, background: 'linear-gradient(135deg, #f97316, #ea580c)', borderRadius: 14, color: 'white', marginBottom: 14, boxShadow: '0 8px 20px rgba(249,115,22,0.25)'}}>
      <div style={{fontSize: 11, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600}}>Próxima fatura</div>
      <div style={{fontSize: 26, fontWeight: 700, marginTop: 6, fontFamily: 'var(--font-mono)'}}>R$ 109,90</div>
      <div style={{fontSize: 12, opacity: 0.9, marginTop: 2}}>Vence 10/05/2026 · Fibra 500 Mega</div>
      <div style={{display: 'flex', gap: 6, marginTop: 12}}>
        <button style={{flex: 1, height: 36, border: 'none', background: 'white', color: '#ea580c', borderRadius: 8, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6}}><Icon name="pix" size={14}/> Pagar com Pix</button>
        <button style={{flex: 1, height: 36, border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 8, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6}}><Icon name="barcode" size={14}/> Boleto</button>
      </div>
    </div>

    <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14}}>
      {[['file','2ª via'],['ticket','Suporte'],['flash','Velocímetro'],['settings','Plano']].map(([i,l],k) => (
        <div key={k} style={{padding: '12px 4px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, textAlign: 'center'}}>
          <div style={{width: 32, height: 32, margin: '0 auto', borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-2)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon name={i} size={15}/></div>
          <div style={{fontSize: 10, marginTop: 6, fontWeight: 500}}>{l}</div>
        </div>
      ))}
    </div>

    <div style={{padding: 14, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14}}>
      <div className="row" style={{marginBottom: 10}}>
        <Icon name="wifi" size={14}/><span style={{fontWeight: 600, fontSize: 13}}>Sua conexão</span>
        <span className="badge badge-green" style={{marginLeft: 'auto'}}><span className="badge-dot"></span>Online</span>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10}}>
        <div><div className="muted" style={{fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em'}}>Download</div><div style={{fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-mono)'}}>492 <span style={{fontSize: 11, color: 'var(--text-2)'}}>Mbps</span></div></div>
        <div><div className="muted" style={{fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em'}}>Upload</div><div style={{fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-mono)'}}>247 <span style={{fontSize: 11, color: 'var(--text-2)'}}>Mbps</span></div></div>
        <div><div className="muted" style={{fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em'}}>Sinal óptico</div><div style={{fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--green)'}}>−18.4 dBm</div></div>
        <div><div className="muted" style={{fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em'}}>Plano</div><div style={{fontSize: 13, fontWeight: 500, marginTop: 2}}>500 / 250 Mbps</div></div>
      </div>
    </div>

    <div style={{fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-2)', marginBottom: 8}}>Últimas faturas</div>
    {[
      { m: 'Abr/2026', v: 'R$ 109,90', s: 'paga' },
      { m: 'Mar/2026', v: 'R$ 109,90', s: 'paga' },
      { m: 'Fev/2026', v: 'R$ 109,90', s: 'paga' },
    ].map((f,i) => (
      <div key={i} style={{padding: 12, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10}}>
        <Icon name="check" size={14} style={{color: 'var(--green)'}}/>
        <div style={{flex: 1}}>
          <div style={{fontSize: 12, fontWeight: 500}}>{f.m}</div>
          <div className="muted" style={{fontSize: 11}}>{f.v}</div>
        </div>
        <Icon name="download" size={14} style={{color: 'var(--text-2)'}}/>
      </div>
    ))}

    <div style={{position: 'absolute', bottom: 24, left: 18, right: 18, padding: 8, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, display: 'flex', justifyContent: 'space-around', boxShadow: '0 -4px 12px rgba(0,0,0,0.04)'}}>
      {[['home','Início',true],['file','Faturas',false],['ticket','Suporte',false],['user','Conta',false]].map(([i,l,a],k) => (
        <div key={k} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 12px', color: a ? 'var(--accent)' : 'var(--text-3)'}}>
          <Icon name={i} size={18}/><span style={{fontSize: 9, fontWeight: 600}}>{l}</span>
        </div>
      ))}
    </div>
  </div>
);

const PortalFatura = () => (
  <div style={{padding: '8px 18px 24px'}}>
    <div className="row" style={{marginTop: 6, marginBottom: 16}}>
      <button className="btn btn-sm btn-ghost btn-icon"><Icon name="chevron" size={16} style={{transform: 'rotate(180deg)'}}/></button>
      <div style={{flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600}}>Fatura abril/26</div>
      <button className="btn btn-sm btn-ghost btn-icon"><Icon name="download" size={15}/></button>
    </div>

    <div style={{padding: 18, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 14, textAlign: 'center'}}>
      <div className="muted" style={{fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600}}>Total a pagar</div>
      <div style={{fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 6}}>R$ 109,90</div>
      <div className="muted" style={{fontSize: 11, marginTop: 4}}>Vence 10/05/2026</div>
      <span className="badge badge-blue" style={{marginTop: 10}}>Em aberto</span>
    </div>

    <div style={{padding: 14, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 12}}>
      <div className="row" style={{marginBottom: 12}}>
        <Icon name="pix" size={16} style={{color: 'var(--green)'}}/>
        <span style={{fontWeight: 600, fontSize: 13}}>Pix copia e cola</span>
      </div>
      <div style={{width: 168, height: 168, margin: '0 auto', background: 'white', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8}}>
        <svg viewBox="0 0 100 100" width="150" height="150">
          {Array.from({length: 25}).map((_,r) => Array.from({length: 25}).map((_,c) => {
            const filled = (r+c+r*c) % 3 === 0 || ((r<7&&c<7)||(r<7&&c>17)||(r>17&&c<7));
            return filled ? <rect key={`${r}-${c}`} x={c*4} y={r*4} width="4" height="4" fill="#0a0a0a"/> : null;
          }))}
        </svg>
      </div>
      <div className="mono" style={{fontSize: 9, marginTop: 10, padding: 8, background: 'var(--bg-3)', borderRadius: 6, wordBreak: 'break-all', textAlign: 'center', color: 'var(--text-2)'}}>00020126580014BR.GOV.BCB.PIX0136a1f3...netvale89020410990</div>
      <button className="btn btn-primary" style={{width: '100%', marginTop: 10, height: 36}}><Icon name="check" size={13}/> Copiar código</button>
    </div>

    <div style={{padding: 14, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 12}}>
      <div className="row" style={{marginBottom: 10}}>
        <Icon name="barcode" size={16}/><span style={{fontWeight: 600, fontSize: 13}}>Boleto bancário</span>
      </div>
      <div className="mono" style={{fontSize: 10, padding: 10, background: 'var(--bg-3)', borderRadius: 6, textAlign: 'center', letterSpacing: '0.04em'}}>34191.79001 01043.510047<br/>91020.150008 4 99820000010990</div>
      <div style={{display: 'flex', gap: 6, marginTop: 10}}>
        <button className="btn" style={{flex: 1, height: 34}}>Copiar linha</button>
        <button className="btn" style={{flex: 1, height: 34}}><Icon name="download" size={12}/> Baixar PDF</button>
      </div>
    </div>

    <div style={{padding: 14, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12}}>
      <div style={{fontSize: 12, fontWeight: 600, marginBottom: 10}}>Detalhamento</div>
      {[
        ['Plano Fibra 500 Mega','R$ 109,90'],
        ['Adicionais','R$ 0,00'],
        ['Subtotal','R$ 109,90'],
        ['Tributos (incluso ISS 2,5%)','R$ 2,75'],
      ].map(([k,v],i) => (
        <div key={i} className="row" style={{justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none', fontSize: 12}}>
          <span style={{color: i===2 ? 'var(--text)' : 'var(--text-2)'}}>{k}</span>
          <span className="mono num-tab" style={{fontWeight: i===2 ? 600 : 400}}>{v}</span>
        </div>
      ))}
      <div style={{marginTop: 10, paddingTop: 10, borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between'}}>
        <span style={{fontWeight: 600, fontSize: 13}}>Total</span>
        <span className="mono num-tab" style={{fontWeight: 700, fontSize: 14}}>R$ 109,90</span>
      </div>
      <button className="btn" style={{width: '100%', marginTop: 12, height: 34}}><Icon name="fiscal" size={12}/> Baixar NFSe 0008712</button>
    </div>
  </div>
);

const PortalSuporte = () => (
  <div style={{padding: '8px 18px 80px'}}>
    <div style={{marginTop: 6, marginBottom: 16}}>
      <div style={{fontSize: 18, fontWeight: 600}}>Suporte</div>
      <div className="muted" style={{fontSize: 12}}>Como podemos te ajudar hoje?</div>
    </div>

    <div style={{padding: 16, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14}}>
      <div className="row" style={{marginBottom: 8}}>
        <div style={{width: 32, height: 32, borderRadius: 8, background: 'var(--green-soft)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon name="check" size={16}/></div>
        <div style={{flex: 1}}>
          <div style={{fontWeight: 600, fontSize: 13}}>Sua conexão está estável</div>
          <div className="muted" style={{fontSize: 11}}>Sinal ótimo · sem reclamações na sua área</div>
        </div>
      </div>
    </div>

    <div style={{fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-2)', marginBottom: 8}}>Resoluções rápidas</div>
    {[
      ['refresh','Reiniciar conexão remotamente'],
      ['flash','Testar velocidade'],
      ['lock','Trocar senha do Wi-Fi'],
      ['truck','Agendar visita técnica'],
    ].map(([i,l],k) => (
      <div key={k} style={{padding: 12, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12}}>
        <div style={{width: 32, height: 32, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-2)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon name={i} size={14}/></div>
        <div style={{flex: 1, fontSize: 13}}>{l}</div>
        <Icon name="chevron" size={14} style={{color: 'var(--text-3)'}}/>
      </div>
    ))}

    <div style={{fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-2)', marginBottom: 8, marginTop: 14}}>Meus chamados</div>
    <div style={{padding: 12, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 6}}>
      <div className="row" style={{marginBottom: 6}}>
        <span className="mono muted" style={{fontSize: 10}}>#4464</span>
        <span className="badge badge-amber" style={{marginLeft: 'auto'}}>em andamento</span>
      </div>
      <div style={{fontSize: 13, fontWeight: 500}}>Visita técnica - cabo rompido</div>
      <div className="muted" style={{fontSize: 11, marginTop: 2}}>Anderson F. · agendado 06/05 14h</div>
    </div>

    <button className="btn btn-primary" style={{width: '100%', marginTop: 14, height: 40}}><Icon name="ticket" size={14}/> Abrir novo chamado</button>
  </div>
);

const PortalPage = () => (
  <div className="page" style={{background: 'var(--bg)'}}>
    <div className="page-header">
      <div>
        <h1 className="page-title">Central do Cliente</h1>
        <p className="page-subtitle">PWA · login por CPF + senha · 2ª via, Pix, NFSe e suporte sem app store</p>
      </div>
    </div>
    <div className="phone-stage">
      <PhoneFrame label="Início — visão geral"><PortalHome /></PhoneFrame>
      <PhoneFrame label="Fatura — Pix / Boleto / NFSe"><PortalFatura /></PhoneFrame>
      <PhoneFrame label="Suporte — auto-atendimento"><PortalSuporte /></PhoneFrame>
    </div>
  </div>
);

window.PortalPage = PortalPage;
