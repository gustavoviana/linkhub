// LinkHub Admin — Dashboard reformulado (onboarding-driven)
const AdminDash = ({ dark, onLogout }) => {
  const t = window.LHTokens(dark);
  const [tab, setTab] = React.useState('visao');

  // --- Setup steps: 2 of 6 done ---
  const steps = [
    { id: 'conta', label: 'Criar conta e provedor', desc: 'LM Net · plano trial (12 dias restantes)', done: true, min: null },
    { id: 'marca', label: 'Subir logo e definir cores', desc: 'Sua marca no portal, e-mails e boletos', done: true, min: '3 min' },
    { id: 'erp', label: 'Conectar com seu ERP', desc: 'Sem isso o portal fica vazio — este é o passo crítico', done: false, min: '5 min', critical: true },
    { id: 'pgto', label: 'Configurar Pix e boleto', desc: 'Chave Pix, banco emissor e conciliação', done: false, min: '4 min', critical: true },
    { id: 'suporte', label: 'Adicionar contato de suporte', desc: 'WhatsApp, telefone e horário de atendimento', done: false, min: '2 min' },
    { id: 'dominio', label: 'Configurar domínio próprio', desc: 'portal.lmnetfibra.com.br · opcional', done: false, min: '10 min', optional: true },
  ];
  const doneCount = steps.filter(s => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const nextStep = steps.find(s => !s.done);

  // --- Sidebar ---
  const NavItem = ({ icon, label, active, badge, warn }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', borderRadius: 8, background: active ? t.accentSoft : 'transparent', color: active ? t.accent : t.text2, fontSize: 13.5, fontWeight: active ? 600 : 500, cursor: 'pointer' }}>
      <Icon name={icon} size={16}/>
      <span style={{ flex: 1 }}>{label}</span>
      {warn && <span style={{ width: 7, height: 7, borderRadius: 4, background: t.amber, flexShrink: 0 }}/>}
      {badge && <span style={{ fontSize: 10.5, padding: '1px 6px', borderRadius: 7, background: t.accent, color: '#fff', fontWeight: 700, fontFamily: t.mono }}>{badge}</span>}
    </div>
  );

  const Card = ({ children, style = {}, pad = 20 }) => (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: pad, ...style }}>{children}</div>
  );

  const SectionLabel = ({ children, action }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.text3 }}>{children}</div>
      {action && <span style={{ fontSize: 12.5, color: t.accent, fontWeight: 600, cursor: 'pointer' }}>{action}</span>}
    </div>
  );

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: t.bg, color: t.text, fontFamily: t.font, overflow: 'hidden' }}>
      {/* ══ Sidebar ══ */}
      <aside style={{ width: 232, background: t.surface, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '18px 16px', borderBottom: `1px solid ${t.borderSoft}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>L</div>
          <span style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em' }}>LinkHub Admin</span>
        </div>

        {/* Provider switcher */}
        <div style={{ padding: '12px 12px 8px' }}>
          <div style={{ padding: '9px 11px', borderRadius: 9, background: t.surface2, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg,#7c5cfc,#5b3ee0)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>L</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>LM Net</div>
              <div style={{ fontSize: 10.5, color: t.text3 }}>trial · 12 dias</div>
            </div>
            <Icon name="chevron" size={13} style={{ color: t.text3, transform: 'rotate(90deg)' }}/>
          </div>
        </div>

        <nav style={{ padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', flex: 1 }}>
          <NavItem icon="home" label="Visão geral" active/>
          <NavItem icon="building" label="Meus provedores"/>

          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.text3, padding: '14px 11px 5px' }}>Configuração</div>
          <NavItem icon="router" label="Integração ERP" warn/>
          <NavItem icon="card" label="Pagamentos" warn/>
          <NavItem icon="flash" label="Marca &amp; visual"/>
          <NavItem icon="globe" label="Domínio"/>
          <NavItem icon="bell" label="Notificações"/>

          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.text3, padding: '14px 11px 5px' }}>Operação</div>
          <NavItem icon="user" label="Clientes"/>
          <NavItem icon="file" label="Planos"/>
          <NavItem icon="ticket" label="Chamados"/>
          <NavItem icon="stats" label="Relatórios"/>

          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.text3, padding: '14px 11px 5px' }}>Conta</div>
          <NavItem icon="shield" label="Equipe &amp; acessos"/>
          <NavItem icon="settings" label="Configurações"/>
        </nav>

        {/* Trial CTA */}
        <div style={{ margin: '0 12px 12px', padding: 13, borderRadius: 11, background: t.accentSoft, border: `1px solid ${dark ? 'rgba(124,92,252,0.3)' : '#e2d9ff'}` }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: t.accent, marginBottom: 3 }}>Trial · 12 dias restantes</div>
          <div style={{ fontSize: 11.5, color: t.text2, lineHeight: 1.45, marginBottom: 10 }}>Ative um plano para liberar domínio próprio e clientes ilimitados.</div>
          <button style={{ width: '100%', padding: '7px 0', borderRadius: 8, background: t.accent, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Ver planos</button>
        </div>

        <div style={{ padding: '12px 16px', borderTop: `1px solid ${t.borderSoft}`, display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#fb923c,#ea580c)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>G</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Gustavo</div>
            <div style={{ fontSize: 10.5, color: t.text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>gustavo@lmnetfibra.com.br</div>
          </div>
          <button onClick={onLogout} title="Sair" style={{ background: 'transparent', border: 'none', color: t.text3, cursor: 'pointer', padding: 4, display: 'flex' }}><Icon name="logout" size={15}/></button>
        </div>
      </aside>

      {/* ══ Main ══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ padding: '14px 28px', borderBottom: `1px solid ${t.border}`, background: t.surface, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#7c5cfc,#5b3ee0)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>L</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em' }}>LM Net</span>
                <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 6, background: t.amberSoft, color: t.amber, fontWeight: 700, letterSpacing: '0.02em' }}>TRIAL</span>
              </div>
              <div style={{ fontSize: 12, color: t.text2, fontFamily: t.mono, display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                lmnet.linkhub.api.br <Icon name="arrow-right" size={11} style={{ transform: 'rotate(-45deg)' }}/>
              </div>
            </div>
          </div>
          <button style={{ height: 34, padding: '0 13px', borderRadius: 9, background: 'transparent', border: `1px solid ${t.border}`, color: t.text, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon name="eye" size={14}/> Ver portal
          </button>
          <button style={{ height: 34, padding: '0 14px', borderRadius: 9, background: t.accent, border: 'none', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon name="refresh" size={14}/> Sincronizar ERP
          </button>
        </header>

        {/* Tabs */}
        <div style={{ padding: '0 28px', borderBottom: `1px solid ${t.border}`, background: t.surface, display: 'flex', gap: 2, flexShrink: 0 }}>
          {[['visao','Visão geral'],['marca','Marca & visual'],['erp','Integração ERP'],['clientes','Clientes'],['planos','Planos'],['equipe','Equipe']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: '11px 13px', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab===k?t.accent:'transparent'}`, color: tab===k?t.text:t.text2, fontSize: 13.5, fontWeight: tab===k?600:500, cursor: 'pointer', marginBottom: -1, fontFamily: 'inherit' }}>{l}</button>
          ))}
        </div>

        {/* Scroll body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px 96px', minWidth: 0 }}>

          {/* ─── Critical alert ─── */}
          <div style={{ padding: '14px 18px', borderRadius: 12, background: t.amberSoft, border: `1px solid ${dark ? 'rgba(251,191,36,0.3)' : '#f5e0b8'}`, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: dark ? 'rgba(251,191,36,0.2)' : '#fdf0d5', color: t.amber, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="flash" size={17}/></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: dark ? '#fbbf24' : '#92400e' }}>Seu portal ainda não está pronto para receber clientes</div>
              <div style={{ fontSize: 12.5, color: dark ? '#d9b871' : '#a16207', marginTop: 2 }}>Falta conectar o ERP e configurar as formas de pagamento. Sem isso o cliente vê o portal vazio.</div>
            </div>
            <button style={{ height: 34, padding: '0 14px', borderRadius: 9, background: dark ? '#fbbf24' : '#b45309', color: dark ? '#1a1200' : '#fff', border: 'none', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>Resolver agora</button>
          </div>

          {/* ─── Setup hero ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 16, marginBottom: 22 }}>
            {/* Steps */}
            <Card pad={0}>
              <div style={{ padding: '18px 20px 16px', borderBottom: `1px solid ${t.borderSoft}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 15.5, fontWeight: 700, margin: '0 0 3px', letterSpacing: '-0.01em' }}>Configuração do provedor</h2>
                    <p style={{ fontSize: 12.5, color: t.text2, margin: 0 }}>{doneCount} de {steps.length} etapas concluídas · faltam ~11 min</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', fontFamily: t.mono, color: t.accent, lineHeight: 1 }}>{pct}%</div>
                  </div>
                </div>
                {/* progress */}
                <div style={{ marginTop: 14, height: 6, borderRadius: 4, background: t.surface2, overflow: 'hidden', display: 'flex', gap: 2 }}>
                  {steps.map(s => (
                    <div key={s.id} style={{ flex: 1, background: s.done ? t.accent : 'transparent', borderRadius: 4 }}/>
                  ))}
                </div>
              </div>

              <div>
                {steps.map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 20px', borderBottom: i < steps.length - 1 ? `1px solid ${t.borderSoft}` : 'none', background: (!s.done && s.critical && s.id === nextStep.id) ? t.accentSoft : 'transparent', cursor: 'pointer' }}>
                    {s.done ? (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: t.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="check" size={13} color="#fff"/></div>
                    ) : (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px dashed ${s.critical ? t.accent : t.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: t.text3, fontFamily: t.mono }}>{i + 1}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13.5, fontWeight: s.done ? 500 : 600, color: s.done ? t.text2 : t.text, textDecoration: s.done ? 'line-through' : 'none', textDecorationColor: t.text3, whiteSpace: 'nowrap' }}>{s.label}</span>
                        {s.critical && !s.done && <span style={{ fontSize: 10, padding: '1.5px 6px', borderRadius: 5, background: t.redSoft, color: t.red, fontWeight: 700, letterSpacing: '0.02em' }}>OBRIGATÓRIO</span>}
                        {s.optional && <span style={{ fontSize: 10, padding: '1.5px 6px', borderRadius: 5, background: t.surface2, color: t.text3, fontWeight: 600 }}>opcional</span>}
                      </div>
                      <div style={{ fontSize: 12, color: t.text2, marginTop: 2 }}>{s.desc}</div>
                    </div>
                    {s.min && !s.done && <span style={{ fontSize: 11, color: t.text3, fontFamily: t.mono, flexShrink: 0 }}>{s.min}</span>}
                    {!s.done && (
                      <button style={{ height: 30, padding: '0 12px', borderRadius: 8, background: s.critical ? t.accent : 'transparent', border: s.critical ? 'none' : `1px solid ${t.border}`, color: s.critical ? '#fff' : t.text, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
                        {s.critical ? 'Configurar' : 'Abrir'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Portal link */}
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: t.greenSoft, color: t.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="globe" size={15}/></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>Link do seu portal</div>
                    <div style={{ fontSize: 11.5, color: t.green, fontWeight: 600 }}>● Online</div>
                  </div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 9, background: t.surface2, border: `1px solid ${t.border}`, fontFamily: t.mono, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>lmnet.linkhub.api.br</span>
                  <Icon name="copy" size={14} style={{ color: t.text3, flexShrink: 0, cursor: 'pointer' }}/>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ flex: 1, height: 34, borderRadius: 9, background: t.surface2, border: `1px solid ${t.border}`, color: t.text, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}><Icon name="qr" size={13}/> QR Code</button>
                  <button style={{ flex: 1, height: 34, borderRadius: 9, background: t.surface2, border: `1px solid ${t.border}`, color: t.text, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}><Icon name="chat" size={13}/> WhatsApp</button>
                </div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${t.borderSoft}`, fontSize: 11.5, color: t.text2, lineHeight: 1.5 }}>
                  Clientes entram com <strong style={{ color: t.text }}>CPF/CNPJ + senha</strong> e resolvem 2ª via, Pix, boleto e chamados sozinhos.
                </div>
              </Card>

              {/* Health checks */}
              <Card style={{ flex: 1 }}>
                <SectionLabel>Saúde da integração</SectionLabel>
                {[
                  ['ERP não conectado', 'Nenhum ERP selecionado', 'err'],
                  ['Pix não configurado', 'Chave e banco pendentes', 'err'],
                  ['Marca aplicada', 'Logo + cores salvos', 'ok'],
                  ['SSL do portal', 'Certificado válido · 89 dias', 'ok'],
                  ['Contato de suporte', 'Nenhum canal informado', 'warn'],
                ].map(([l, d, st], i) => {
                  const c = st === 'ok' ? t.green : st === 'warn' ? t.amber : t.red;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 4 ? `1px solid ${t.borderSoft}` : 'none' }}>
                      <span style={{ width: 7, height: 7, borderRadius: 4, background: c, flexShrink: 0 }}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{l}</div>
                        <div style={{ fontSize: 11.5, color: t.text3 }}>{d}</div>
                      </div>
                      {st !== 'ok' && <Icon name="chevron" size={13} style={{ color: t.text3, flexShrink: 0 }}/>}
                    </div>
                  );
                })}
              </Card>
            </div>
          </div>

          {/* ─── ERP picker (recommended action) ─── */}
          <SectionLabel action="Ver documentação de API">Conecte seu ERP · passo recomendado agora</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { n: 'IXC Soft', d: 'Token API + host', pop: 'Mais usado', c: '#2563eb' },
              { n: 'SGP', d: 'App + token público', pop: null, c: '#0891b2' },
              { n: 'Hubsoft', d: 'OAuth2 client', pop: null, c: '#7c3aed' },
              { n: 'Outro / manual', d: 'CSV ou webhook', pop: null, c: '#64748b' },
            ].map(e => (
              <div key={e.n} style={{ padding: 16, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 13, cursor: 'pointer', position: 'relative' }}>
                {e.pop && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 10, padding: '2px 7px', borderRadius: 6, background: t.accentSoft, color: t.accent, fontWeight: 700 }}>{e.pop}</span>}
                <div style={{ width: 34, height: 34, borderRadius: 9, background: e.c + '1f', color: e.c, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 11 }}><Icon name="router" size={17}/></div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{e.n}</div>
                <div style={{ fontSize: 11.5, color: t.text2, marginTop: 2, fontFamily: t.mono }}>{e.d}</div>
                <div style={{ marginTop: 12, fontSize: 12, color: t.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>Conectar <Icon name="arrow-right" size={12}/></div>
              </div>
            ))}
          </div>

          {/* ─── Metrics (empty-state aware) ─── */}
          <SectionLabel>Números do provedor</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { l: 'Clientes sincronizados', v: '—', s: 'Aguardando conexão com ERP', icon: 'user' },
              { l: 'Planos importados', v: '—', s: 'Vêm do ERP automaticamente', icon: 'file' },
              { l: 'Última sincronização', v: 'Nunca', s: 'Rodará a cada 15 min quando ativo', icon: 'refresh' },
              { l: 'Acessos ao portal (7d)', v: '0', s: 'Compartilhe o link com sua base', icon: 'stats' },
            ].map(k => (
              <Card key={k.l} pad={17}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: t.text3 }}>{k.l}</span>
                  <Icon name={k.icon} size={14} color={t.text3}/>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: (k.v === '—' || k.v === 'Nunca' || k.v === '0') ? t.text3 : t.text, fontFamily: k.v === 'Nunca' ? 'inherit' : t.mono }}>{k.v}</div>
                <div style={{ fontSize: 11.5, color: t.text2, marginTop: 5, lineHeight: 1.4 }}>{k.s}</div>
              </Card>
            ))}
          </div>

          {/* ─── Bottom: recommendations + activity ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card pad={0}>
              <div style={{ padding: '16px 20px 13px', borderBottom: `1px solid ${t.borderSoft}` }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Recomendações para o lançamento</div>
                <div style={{ fontSize: 12, color: t.text2, marginTop: 2 }}>Baseado em provedores com perfil parecido ao seu</div>
              </div>
              {[
                ['Avise sua base por WhatsApp', 'Provedores que enviam um disparo no lançamento têm 3× mais adesão na 1ª semana.', 'chat'],
                ['Deixe o Pix como padrão', '78% dos pagamentos no portal são via Pix — coloque-o como primeira opção.', 'pix'],
                ['Ative lembrete de vencimento', 'Reduz inadimplência em ~18% já no primeiro ciclo de cobrança.', 'bell'],
                ['Habilite abertura de chamado', 'Tira da sua equipe as ligações de "está lento" e gera histórico.', 'ticket'],
              ].map(([tt, dd, ic], i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '13px 20px', borderBottom: i < 3 ? `1px solid ${t.borderSoft}` : 'none' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: t.accentSoft, color: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={ic} size={15}/></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{tt}</div>
                    <div style={{ fontSize: 12, color: t.text2, marginTop: 2, lineHeight: 1.45 }}>{dd}</div>
                  </div>
                  <Icon name="chevron" size={14} style={{ color: t.text3, flexShrink: 0, marginTop: 8 }}/>
                </div>
              ))}
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Card pad={0}>
                <div style={{ padding: '16px 20px 13px', borderBottom: `1px solid ${t.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Atividade recente</div>
                  <span style={{ fontSize: 12, color: t.accent, fontWeight: 600, cursor: 'pointer' }}>Ver tudo</span>
                </div>
                {[
                  ['Cores da marca atualizadas', 'Gustavo · há 12 min', t.accent],
                  ['Logo enviada (logo-lmnet.svg)', 'Gustavo · há 14 min', t.accent],
                  ['Portal provisionado com SSL', 'Sistema · há 1 h', t.green],
                  ['Provedor LM Net criado', 'Gustavo · há 1 h', t.text3],
                ].map(([l, m, c], i) => (
                  <div key={i} style={{ display: 'flex', gap: 11, padding: '11px 20px', borderBottom: i < 3 ? `1px solid ${t.borderSoft}` : 'none' }}>
                    <span style={{ width: 7, height: 7, borderRadius: 4, background: c, flexShrink: 0, marginTop: 5 }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{l}</div>
                      <div style={{ fontSize: 11, color: t.text3, marginTop: 1 }}>{m}</div>
                    </div>
                  </div>
                ))}
              </Card>

              {/* Help */}
              <Card style={{ background: dark ? '#141122' : '#faf9ff', borderColor: dark ? t.border : '#eae5ff' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: t.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="help" size={16}/></div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>Quer que a gente configure pra você?</div>
                    <div style={{ fontSize: 12, color: t.text2, marginTop: 3, lineHeight: 1.5 }}>Onboarding assistido gratuito: conectamos seu ERP e testamos os pagamentos junto com você em uma call de 30 min.</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button style={{ height: 32, padding: '0 13px', borderRadius: 8, background: t.accent, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Agendar call</button>
                      <button style={{ height: 32, padding: '0 13px', borderRadius: 8, background: 'transparent', color: t.text, border: `1px solid ${t.border}`, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Ler o guia</button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.AdminDash = AdminDash;
