// Additional pages — clientes-online, autenticações, negativação, CRM, planos, mapa, contas-pagar, fornecedores, contas-bancárias, movimentações, cheques, previsão, centro-cobrança (templates+relatório), OS (lista/timeline/agenda), tarefas, grupos-radius, sessões, equipamentos, importar, config-fiscal, config-pagamentos, lgpd
const D = window.NCData || {};

// ---------- Helpers ----------
const StatusBadge = ({ value, mapping }) => {
  const map = mapping || {
    paga: ['green','paga'], aberta: ['blue','em aberto'], parcial: ['amber','parcial'], vencida: ['red','vencida'], cancelada: ['gray','cancelada'], contestada: ['amber','contestada'], renegociada: ['violet','renegociada'],
    ativo: ['green','ativo'], ativa: ['green','ativa'], suspenso: ['amber','suspenso'], inadimplente: ['red','inadimplente'], cancelado: ['gray','cancelado'],
    online: ['green','online'], offline: ['gray','offline'],
    agendada: ['blue','agendada'], em_deslocamento: ['violet','em deslocamento'], em_execucao: ['amber','em execução'], concluida: ['green','concluída'], reagendada: ['amber','reagendada'], nao_compareceu: ['red','não compareceu'],
    aberto: ['blue','aberto'], em_andamento: ['amber','em andamento'], aguardando_cliente: ['violet','aguardando cliente'], resolvido: ['green','resolvido'], fechado: ['gray','fechado'],
    pendente: ['amber','pendente'], aprovada: ['green','aprovada'], rejeitada: ['red','rejeitada'], executada: ['green','executada'],
    autorizada: ['green','autorizada'], emitida: ['green','emitida'],
    depositar: ['blue','a depositar'], compensar: ['amber','a compensar'], compensado: ['green','compensado'], devolvido: ['red','devolvido'],
  };
  const [color, text] = map[value] || ['gray', value];
  return <span className={'badge badge-' + color}><span className="badge-dot"></span>{text}</span>;
};

const PageHeader = ({ title, subtitle, actions }) => (
  <div className="page-header">
    <div><h1 className="page-title">{title}</h1>{subtitle && <p className="page-subtitle">{subtitle}</p>}</div>
    {actions && <div className="page-actions">{actions}</div>}
  </div>
);

// ---------- Clientes Online/Offline ----------
const ClientesOnlinePage = () => {
  const [filter, setFilter] = React.useState('online');
  const sessions = (D.SESSOES || []).slice(0, 30);
  return (
    <div className="page">
      <PageHeader title="Clientes online · offline" subtitle="Status em tempo real do RADIUS · atualiza a cada 10s" actions={<button className="btn"><Icon name="refresh" size={13}/> Atualizar</button>} />
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16}}>
        <div className="kpi" onClick={() => setFilter('online')} style={{cursor: 'pointer', borderColor: filter==='online' ? 'var(--green)' : 'var(--border)', borderWidth: 2}}>
          <div className="kpi-label" style={{color: 'var(--green)'}}><span className="net-status-led"></span>Online agora</div>
          <div className="kpi-value" style={{fontSize: 36}}>3.918</div>
          <div className="kpi-meta"><span className="kpi-delta up">+24</span><span className="muted">vs há 1h</span></div>
        </div>
        <div className="kpi" onClick={() => setFilter('offline')} style={{cursor: 'pointer', borderColor: filter==='offline' ? 'var(--text-3)' : 'var(--border)', borderWidth: 2}}>
          <div className="kpi-label"><span className="net-status-led" style={{background: 'var(--text-3)', boxShadow: '0 0 0 3px rgba(139,146,156,0.2)'}}></span>Offline</div>
          <div className="kpi-value" style={{fontSize: 36}}>369</div>
          <div className="kpi-meta"><span className="muted">de 4.287 contratos ativos</span></div>
        </div>
      </div>
      <div className="card">
        <div className="filter-bar">
          <span style={{fontSize: 12, fontWeight: 500}}>Sessões PPPoE — {filter}</span>
          <div className="grow"></div>
          <span className="muted" style={{fontSize: 11}}>{filter==='online' ? '3.918' : '369'} resultados · mostrando 30</span>
        </div>
        <table className="table">
          <thead><tr><th>Cliente</th><th>Usuário PPPoE</th><th>IP</th><th>NAS</th><th>Início</th><th>Tempo</th><th>↓ / ↑</th></tr></thead>
          <tbody>
            {sessions.map((s,i) => (
              <tr key={i}>
                <td>{s.cliente}</td>
                <td className="mono" style={{fontSize: 11}}>{s.usuario}</td>
                <td className="mono num" style={{fontSize: 11}}>{s.ip}</td>
                <td className="mono" style={{fontSize: 11}}>{s.nas}</td>
                <td className="mono num" style={{fontSize: 11}}>{s.inicio}</td>
                <td className="mono num" style={{fontSize: 11}}>{s.tempo}</td>
                <td className="mono num" style={{fontSize: 11}}>{s.down} / {s.up}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------- Autenticações histórico ----------
const AutenticacoesPage = () => {
  const rows = (D.AUTENTICACOES || []);
  return (
    <div className="page">
      <PageHeader title="Histórico de autenticações" subtitle="Últimas 500 sessões PPPoE · sucesso e falhas" actions={<><button className="btn"><Icon name="filter" size={13}/> Filtros</button><button className="btn"><Icon name="download" size={13}/> Exportar CSV</button></>} />
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Tentativas (24h)</div><div className="kpi-value">14.227</div><div className="kpi-meta"><span className="kpi-delta up">+3.2%</span></div></div>
        <div className="kpi"><div className="kpi-label">Sucesso</div><div className="kpi-value" style={{color: 'var(--green)'}}>13.984</div><div className="kpi-meta"><span className="muted">98.3%</span></div></div>
        <div className="kpi"><div className="kpi-label">Falhas</div><div className="kpi-value" style={{color: 'var(--red)'}}>243</div><div className="kpi-meta"><span className="muted">senha inválida · 71%</span></div></div>
        <div className="kpi"><div className="kpi-label">Tempo médio</div><div className="kpi-value">1.4<span style={{fontSize: 14, color: 'var(--text-2)'}}>s</span></div><div className="kpi-meta"><span className="kpi-delta up">-0.2s</span></div></div>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>Cliente</th><th>Usuário</th><th>IP</th><th>NAS</th><th>Início</th><th>Fim</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r,i) => (
              <tr key={i}>
                <td>{r.cliente}</td>
                <td className="mono" style={{fontSize: 11}}>{r.usuario}</td>
                <td className="mono num" style={{fontSize: 11}}>{r.ip}</td>
                <td className="mono" style={{fontSize: 11}}>{r.nas}</td>
                <td className="mono num" style={{fontSize: 11}}>{r.inicio}</td>
                <td className="mono num" style={{fontSize: 11}}>{r.fim || '—'}</td>
                <td>{r.status === 'ok' ? <span className="badge badge-green"><span className="badge-dot"></span>autenticado</span> : r.status === 'falha' ? <span className="badge badge-red"><span className="badge-dot"></span>{r.motivo}</span> : <span className="badge badge-blue"><span className="badge-dot"></span>ativa</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------- Negativação ----------
const NegativacaoPage = () => (
  <div className="page">
    <PageHeader title="Negativação · Bureaus de crédito" subtitle="Inclusão e baixa em Serasa, SPC e Boa Vista" actions={<button className="btn btn-primary"><Icon name="plus" size={13}/> Nova inclusão</button>} />
    <div className="kpi-grid">
      <div className="kpi"><div className="kpi-label">Negativados ativos</div><div className="kpi-value">87</div><div className="kpi-meta"><span className="muted">2.0% da base</span></div></div>
      <div className="kpi"><div className="kpi-label">Valor total negativado</div><div className="kpi-value">R$ 184.722</div><div className="kpi-meta"><span className="muted">média R$ 2.123 por título</span></div></div>
      <div className="kpi"><div className="kpi-label">Inclusões 30d</div><div className="kpi-value">14</div><div className="kpi-meta"><span className="kpi-delta up">+21%</span></div></div>
      <div className="kpi"><div className="kpi-label">Baixas 30d</div><div className="kpi-value">22</div><div className="kpi-meta"><span className="muted">recuperação R$ 41.290</span></div></div>
    </div>
    <div className="card">
      <table className="table">
        <thead><tr><th>Cliente</th><th>CPF/CNPJ</th><th>Bureau</th><th>Valor</th><th>Inclusão</th><th>Protocolo</th><th>Status</th></tr></thead>
        <tbody>
          {[
            ['Roberto Schneider','047.221.********','Serasa','R$ 4.219,80','12/02/2026','SR-77821-440','ativo'],
            ['Patricia Hoffmann','188.****.220','SPC','R$ 1.197,30','22/02/2026','SP-01188-2026','ativo'],
            ['Eduardo Cristofoli','**.221.880/0001-**','Boa Vista SCPC','R$ 8.844,10','01/03/2026','BV-2026-998104','ativo'],
            ['Marcelo A. Reis','322.114.********','Serasa','R$ 880,00','14/03/2026','SR-78122-091','baixado'],
            ['Diego Petrocelli','**.498.110/0001-**','Serasa','R$ 12.420,00','21/03/2026','SR-78298-220','ativo'],
            ['Sônia M. Petry','551.882.********','SPC','R$ 549,80','03/04/2026','SP-02018-2026','ativo'],
          ].map((r,i) => (
            <tr key={i}>
              <td>{r[0]}</td>
              <td className="mono" style={{fontSize: 11}}>{r[1]}</td>
              <td><span className="badge badge-violet">{r[2]}</span></td>
              <td className="mono num">{r[3]}</td>
              <td className="mono num">{r[4]}</td>
              <td className="mono" style={{fontSize: 11}}>{r[5]}</td>
              <td>{r[6]==='ativo' ? <span className="badge badge-red"><span className="badge-dot"></span>negativado</span> : <span className="badge badge-green"><span className="badge-dot"></span>baixado</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ---------- CRM kanban ----------
const CrmPage = () => {
  const cols = [
    { id: 'novo', title: 'Novo lead', color: 'var(--blue)', cards: [
      { n: 'Henrique O. Tomazoni', d: 'Indicação · Plano 500', v: 'R$ 109,90', dias: 1 },
      { n: 'Catarina Vasconcelos', d: 'Site · Plano 1G', v: 'R$ 159,90', dias: 2 },
      { n: 'José Alvim Tortelli', d: 'Whatsapp · Empresarial', v: 'R$ 399,00', dias: 3 },
    ]},
    { id: 'contato', title: 'Em contato', color: 'var(--cyan)', cards: [
      { n: 'Carla Maria Schneider', d: 'Plano 300 · vai pensar', v: 'R$ 89,90', dias: 5 },
      { n: 'Paulo Henrique Stein', d: 'Aguardando viabilidade', v: 'R$ 109,90', dias: 4 },
    ]},
    { id: 'proposta', title: 'Proposta enviada', color: 'var(--amber)', cards: [
      { n: 'Indústria Bertolini ME', d: 'Empresarial · 4 pontos', v: 'R$ 1.580,00', dias: 8 },
      { n: 'Eduardo Cristofoli', d: 'Mudou de endereço', v: 'R$ 109,90', dias: 12 },
      { n: 'Bruna Hoffmann Petry', d: 'Plano 1G ago/26', v: 'R$ 159,90', dias: 6 },
    ]},
    { id: 'fechado', title: 'Fechado', color: 'var(--green)', cards: [
      { n: 'Renata Vargas Lopes', d: 'Instalação 06/05', v: 'R$ 89,90', dias: 0 },
      { n: 'Lucas Bittencourt', d: 'Empresarial', v: 'R$ 399,00', dias: 1 },
    ]},
    { id: 'perdido', title: 'Perdido', color: 'var(--red)', cards: [
      { n: 'Frederico Marx', d: 'Foi pra concorrente', v: 'R$ 109,90', dias: 4 },
    ]},
  ];
  return (
    <div className="page">
      <PageHeader title="CRM · Funil comercial" subtitle="38 prospectos no pipeline · valor estimado R$ 11.420 / mês" actions={<><button className="btn"><Icon name="settings" size={13}/> Etapas</button><button className="btn btn-primary"><Icon name="plus" size={13}/> Novo lead</button></>} />
      <div className="kanban">
        {cols.map(col => (
          <div key={col.id} className="kanban-col">
            <div className="kanban-col-head">
              <span style={{width: 8, height: 8, borderRadius: 4, background: col.color}}></span>
              <span className="kanban-col-title">{col.title}</span>
              <span className="kanban-col-count">{col.cards.length}</span>
              <button className="btn btn-sm btn-ghost btn-icon" style={{marginLeft: 'auto'}}><Icon name="plus" size={12}/></button>
            </div>
            {col.cards.map((c,i) => (
              <div key={i} className="kanban-card">
                <div className="kanban-card-title">{c.n}</div>
                <div className="kanban-card-meta" style={{marginBottom: 6}}>{c.d}</div>
                <div className="kanban-card-meta">
                  <span className="mono num" style={{fontWeight: 600, color: 'var(--text)'}}>{c.v}</span>
                  <span className="grow"></span>
                  <span className={'badge badge-' + (c.dias > 7 ? 'red' : c.dias > 3 ? 'amber' : 'gray')} style={{fontSize: 10, height: 16, padding: '0 5px'}}>{c.dias}d</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- Planos (lista) ----------
const PlanosPage = () => {
  const planos = D.PLANOS || [];
  return (
    <div className="page">
      <PageHeader title="Planos comerciais" subtitle="6 planos ativos · catálogo público" actions={<><button className="btn"><Icon name="download" size={13}/> Catálogo PDF</button><button className="btn btn-primary"><Icon name="plus" size={13}/> Novo plano</button></>} />
      <div className="card">
        <table className="table">
          <thead><tr><th>Plano</th><th>Velocidade</th><th>Ciclo</th><th>Preço</th><th>Fidelidade</th><th>Contratos</th><th>Status</th></tr></thead>
          <tbody>
            {planos.map(p => (
              <tr key={p.id}>
                <td><div style={{fontWeight: 600}}>{p.nome}</div><div className="muted" style={{fontSize: 11}}>{p.descricao || 'Plano residencial fibra óptica'}</div></td>
                <td><div className="mono num" style={{fontWeight: 600}}>{p.down}<span className="muted">/{p.up} Mbps</span></div></td>
                <td className="mono num">30 dias</td>
                <td className="mono num" style={{fontWeight: 600}}>{p.preco}</td>
                <td>{p.fidelidade ? <span className="badge badge-violet">{p.fidelidade}m</span> : <span className="muted">—</span>}</td>
                <td className="mono num">{p.contratos || Math.floor(Math.random()*1200+200)}</td>
                <td><span className="badge badge-green"><span className="badge-dot"></span>ativo</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------- Mapa de clientes (Leaflet stand-in) ----------
const MapaPage = () => {
  const pins = Array.from({length: 80}).map((_,i) => ({
    x: 8 + Math.random() * 84, y: 10 + Math.random() * 80,
    s: ['ativo','suspenso','inadimplente'][Math.floor(Math.random()*3)],
  }));
  const colors = { ativo: '#15915a', suspenso: '#b8730e', inadimplente: '#d6334a' };
  return (
    <div className="page">
      <PageHeader title="Mapa de clientes" subtitle="4.287 pontos · clusterização ativa · base Caxias do Sul/RS" actions={<><div className="seg"><button className="seg-btn active">Status</button><button className="seg-btn">Plano</button><button className="seg-btn">Tipo</button></div><button className="btn"><Icon name="filter" size={13}/> Filtros</button></>} />
      <div className="map-canvas">
        {/* simulated street grid */}
        <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4}}>
          <path d="M 0 100 L 800 130 M 0 280 L 800 310 M 0 430 L 800 460 M 100 0 L 130 600 M 320 0 L 350 600 M 540 0 L 570 600" stroke="rgba(109,74,224,0.4)" strokeWidth="1.5" fill="none"/>
        </svg>
        {pins.map((p,i) => (
          <div key={i} className="map-pin" style={{left: p.x + '%', top: p.y + '%', background: colors[p.s]}}></div>
        ))}
        <div className="map-cluster" style={{left: '38%', top: '42%'}}>247</div>
        <div className="map-cluster" style={{left: '58%', top: '32%'}}>184</div>
        <div className="map-cluster" style={{left: '24%', top: '64%'}}>92</div>
        <div className="map-controls">
          <button className="btn btn-icon"><Icon name="plus" size={14}/></button>
          <button className="btn btn-icon"><Icon name="x" size={14}/></button>
          <button className="btn btn-icon"><Icon name="map" size={14}/></button>
        </div>
        <div className="map-legend">
          <div style={{fontWeight: 600, marginBottom: 6, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-2)'}}>Status</div>
          <div className="row" style={{marginBottom: 4}}><span style={{width: 10, height: 10, borderRadius: 5, background: colors.ativo}}></span>Ativo · 3.918</div>
          <div className="row" style={{marginBottom: 4}}><span style={{width: 10, height: 10, borderRadius: 5, background: colors.suspenso}}></span>Suspenso · 282</div>
          <div className="row"><span style={{width: 10, height: 10, borderRadius: 5, background: colors.inadimplente}}></span>Inadimplente · 87</div>
        </div>
      </div>
    </div>
  );
};

// ---------- Contas a pagar ----------
const ContasPagarPage = () => (
  <div className="page">
    <PageHeader title="Contas a pagar" subtitle="DRE · fornecedores · folha · impostos" actions={<><button className="btn"><Icon name="download" size={13}/> Exportar</button><button className="btn btn-primary"><Icon name="plus" size={13}/> Nova conta</button></>} />
    <div className="kpi-grid">
      <div className="kpi"><div className="kpi-label">Total em aberto</div><div className="kpi-value">R$ 84.227</div><div className="kpi-meta"><span className="muted">22 títulos</span></div></div>
      <div className="kpi"><div className="kpi-label" style={{color: 'var(--red)'}}>Vencido</div><div className="kpi-value" style={{color: 'var(--red)'}}>R$ 4.180</div><div className="kpi-meta"><span className="muted">2 títulos</span></div></div>
      <div className="kpi"><div className="kpi-label" style={{color: 'var(--amber)'}}>Vence em 7 dias</div><div className="kpi-value" style={{color: 'var(--amber)'}}>R$ 22.180</div><div className="kpi-meta"><span className="muted">9 títulos</span></div></div>
      <div className="kpi"><div className="kpi-label">Pago no mês</div><div className="kpi-value">R$ 184.227</div><div className="kpi-meta"><span className="kpi-delta up">+8.4%</span></div></div>
    </div>
    <div className="card">
      <div className="filter-bar">
        <span className="filter-chip active">Todos</span>
        <span className="filter-chip">Vencidos</span>
        <span className="filter-chip">A vencer</span>
        <span className="filter-chip">Pagos</span>
        <div className="grow"></div>
        <span className="filter-chip"><span style={{width: 8, height: 8, borderRadius: 4, background: 'var(--violet)'}}></span>Fornecedor</span>
        <span className="filter-chip"><span style={{width: 8, height: 8, borderRadius: 4, background: 'var(--blue)'}}></span>Folha</span>
        <span className="filter-chip"><span style={{width: 8, height: 8, borderRadius: 4, background: 'var(--amber)'}}></span>Imposto</span>
      </div>
      <table className="table">
        <thead><tr><th>Descrição</th><th>Categoria</th><th>Fornecedor</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead>
        <tbody>
          {[
            ['Trânsito IP — V.tal','Fornecedor','V.tal · Oi Soluções','08/05/2026','R$ 18.420,00','vencida','red',true],
            ['Energia matriz · CPFL','Fornecedor','CPFL Energia','12/05/2026','R$ 4.218,90','aberta','blue',true],
            ['Folha · maio 2026','Folha','—','05/05/2026','R$ 48.220,00','aberta','blue',false],
            ['DAS Simples Nacional','Imposto','Receita Federal','20/05/2026','R$ 12.184,00','aberta','blue',false],
            ['Aluguel POP centro','Fornecedor','Imobiliária Tortelli','10/05/2026','R$ 4.800,00','aberta','blue',true],
            ['CSG/Brisanet — drop','Fornecedor','Brisanet Materiais','22/05/2026','R$ 8.220,40','aberta','blue',false],
            ['ISS retido na fonte','Imposto','Prefeitura Caxias do Sul','15/05/2026','R$ 1.844,20','aberta','blue',false],
            ['Internet móvel · técnicos','Fornecedor','Vivo Empresas','18/05/2026','R$ 480,00','aberta','blue',true],
            ['Honorários contábeis','Fornecedor','Stein Contadores','12/04/2026','R$ 2.200,00','paga','green',true],
          ].map((r,i) => (
            <tr key={i}>
              <td>{r[0]} {r[7] && <span className="badge badge-gray" style={{marginLeft: 6, fontSize: 9, height: 16, padding: '0 4px'}}>recorrente</span>}</td>
              <td><span className={'badge badge-' + (r[1]==='Fornecedor'?'violet':r[1]==='Folha'?'blue':'amber')}>{r[1]}</span></td>
              <td className="muted" style={{fontSize: 11}}>{r[2]}</td>
              <td className="mono num">{r[3]}</td>
              <td className="mono num" style={{fontWeight: 600}}>{r[4]}</td>
              <td><span className={'badge badge-' + r[6]}><span className="badge-dot"></span>{r[5]}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ---------- Fornecedores ----------
const FornecedoresPage = () => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="page">
      <PageHeader title="Fornecedores" subtitle="32 cadastrados · PF e PJ" actions={<button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" size={13}/> Novo fornecedor</button>} />
      <div className="card">
        <table className="table">
          <thead><tr><th>Razão social / Nome</th><th>Tipo</th><th>CNPJ/CPF</th><th>Telefone</th><th>Categoria</th><th>Em aberto</th></tr></thead>
          <tbody>
            {[
              ['V.tal · Oi Soluções','PJ','22.221.480/0001-80','(11) 4002-8922','Trânsito IP','R$ 18.420'],
              ['CPFL Energia','PJ','02.429.144/0001-93','(19) 3756-8000','Energia','R$ 4.218'],
              ['Brisanet Materiais','PJ','04.881.220/0001-02','(84) 3001-2200','Equipamentos','R$ 8.220'],
              ['Imobiliária Tortelli','PJ','12.480.221/0001-21','(54) 3221-7700','Imóveis','R$ 4.800'],
              ['Stein Contadores','PJ','08.122.471/0001-44','(54) 3220-1180','Contábil','—'],
              ['Vivo Empresas','PJ','02.558.157/0001-62','0800 7700404','Telecom','R$ 480'],
              ['Anderson Ferraz ME','PF','022.114.880-21','(54) 99880-1148','Mão de obra','—'],
              ['Plugnotas SA','PJ','29.882.110/0001-10','(11) 3030-2200','SaaS fiscal','R$ 199'],
            ].map((r,i) => (
              <tr key={i}>
                <td><div className="row"><div className="avatar" style={{background: 'var(--violet-soft)', color: 'var(--violet)'}}>{r[0].split(' ').map(n=>n[0]).slice(0,2).join('')}</div>{r[0]}</div></td>
                <td><span className={'badge badge-' + (r[1]==='PJ'?'blue':'cyan')}>{r[1]}</span></td>
                <td className="mono" style={{fontSize: 11}}>{r[2]}</td>
                <td className="mono num" style={{fontSize: 11}}>{r[3]}</td>
                <td className="muted" style={{fontSize: 11}}>{r[4]}</td>
                <td className="mono num" style={{color: r[5]==='—'?'var(--text-3)':'var(--text)'}}>{r[5]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3 className="card-title">Novo fornecedor</h3>
              <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setOpen(false)}><Icon name="x" size={14}/></button>
            </div>
            <div className="modal-body">
              <div className="field-row"><div className="field" style={{flex: '0 0 140px'}}><label className="label">Tipo</label><select className="select"><option>Pessoa jurídica</option><option>Pessoa física</option></select></div><div className="field"><label className="label">CNPJ</label><input className="input mono" placeholder="00.000.000/0000-00"/></div></div>
              <div className="field" style={{marginBottom: 12}}><label className="label">Razão social</label><input className="input"/></div>
              <div className="field-row"><div className="field"><label className="label">Telefone</label><input className="input mono" placeholder="(54) 0000-0000"/></div><div className="field"><label className="label">E-mail</label><input className="input"/></div></div>
              <div className="field-row"><div className="field"><label className="label">Categoria</label><select className="select"><option>Trânsito IP</option><option>Energia</option><option>Equipamentos</option><option>Imóveis</option><option>Contábil</option><option>SaaS</option></select></div><div className="field"><label className="label">Banco favorito</label><input className="input" placeholder="Sicredi · ag 0710 cc 87.221-9"/></div></div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn btn-primary">Salvar fornecedor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- Contas bancárias ----------
const ContasBancariasPage = () => (
  <div className="page">
    <PageHeader title="Contas bancárias" subtitle="Saldos consolidados · conciliação automática" actions={<><button className="btn"><Icon name="refresh" size={13}/> Sincronizar</button><button className="btn btn-primary"><Icon name="plus" size={13}/> Nova conta</button></>} />
    <div className="card" style={{padding: 18, marginBottom: 16, background: 'linear-gradient(135deg, rgba(109,74,224,0.05), rgba(43,197,224,0.05))'}}>
      <div className="muted" style={{fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600}}>Patrimônio total</div>
      <div style={{fontSize: 36, fontWeight: 700, marginTop: 6, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em'}}>R$ 482.119,40</div>
      <div className="muted" style={{fontSize: 12, marginTop: 4}}>5 contas · última sincronização há 4 minutos</div>
    </div>
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12}}>
      {[
        { n: 'Sicredi · Conta principal', t: 'Corrente', s: 'R$ 284.221,40', ag: '0710 · 87.221-9', c: '#16a34a' },
        { n: 'Banco do Brasil', t: 'Corrente', s: 'R$ 84.180,00', ag: '4422-x · 18.222-3', c: '#facc15' },
        { n: 'Sicredi · Aplicação', t: 'Poupança', s: 'R$ 92.220,00', ag: '0710 · 87.221-0', c: '#16a34a' },
        { n: 'Mercado Pago', t: 'Digital', s: 'R$ 18.998,00', ag: 'CNPJ NetVale', c: '#1a73e8' },
        { n: 'Caixinha matriz', t: 'Caixinha', s: 'R$ 2.500,00', ag: 'físico', c: '#94a3b8' },
      ].map((c,i) => (
        <div key={i} className="card" style={{padding: 16}}>
          <div className="row" style={{marginBottom: 12}}>
            <div style={{width: 40, height: 40, borderRadius: 8, background: c.c, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700}}>{c.n[0]}</div>
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{fontWeight: 600, fontSize: 13}}>{c.n}</div>
              <div className="muted" style={{fontSize: 11}}>{c.t} · {c.ag}</div>
            </div>
            <button className="btn btn-sm btn-ghost btn-icon"><Icon name="more" size={14}/></button>
          </div>
          <div className="muted" style={{fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600}}>Saldo</div>
          <div style={{fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 2}}>{c.s}</div>
          <div className="row" style={{marginTop: 12, gap: 6}}>
            <button className="btn btn-sm" style={{flex: 1}}>Extrato</button>
            <button className="btn btn-sm" style={{flex: 1}}>Conciliar</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ---------- Movimentações ----------
const MovimentacoesPage = () => (
  <div className="page">
    <PageHeader title="Movimentações financeiras" subtitle="Maio 2026 · todas as contas" actions={<><div className="seg"><button className="seg-btn active">Maio</button><button className="seg-btn">Abril</button><button className="seg-btn">Março</button></div><button className="btn"><Icon name="download" size={13}/> Exportar</button></>} />
    <div className="kpi-grid">
      <div className="kpi"><div className="kpi-label" style={{color: 'var(--green)'}}>Entradas</div><div className="kpi-value" style={{color: 'var(--green)'}}>R$ 471.220</div><div className="kpi-meta"><span className="muted">472 lançamentos</span></div></div>
      <div className="kpi"><div className="kpi-label" style={{color: 'var(--red)'}}>Saídas</div><div className="kpi-value" style={{color: 'var(--red)'}}>R$ 287.103</div><div className="kpi-meta"><span className="muted">88 lançamentos</span></div></div>
      <div className="kpi"><div className="kpi-label">Saldo do mês</div><div className="kpi-value">R$ 184.117</div><div className="kpi-meta"><span className="kpi-delta up">+R$ 22.4k</span></div></div>
    </div>
    <div className="card">
      <table className="table">
        <thead><tr><th>Data</th><th></th><th>Descrição</th><th>Conta</th><th>Categoria</th><th>Valor</th><th>Conciliada</th></tr></thead>
        <tbody>
          {[
            ['06/05','in','Pix recebido · Maria A. Silva fatura abril','Sicredi PA','Receita assinatura','+R$ 109,90','green',true],
            ['06/05','in','Boleto pago · Roberto Schneider','Sicredi PA','Receita assinatura','+R$ 159,90','green',true],
            ['06/05','out','Energia · CPFL maio','Sicredi PA','Energia','-R$ 4.218,90','amber',true],
            ['05/05','out','Folha · maio 2026','BB','Folha','-R$ 48.220,00','blue',true],
            ['05/05','in','Pix · Patricia Hoffmann','Sicredi PA','Receita assinatura','+R$ 89,90','green',true],
            ['04/05','out','Trânsito IP V.tal abril','Sicredi PA','Fornecedor','-R$ 18.420,00','amber',true],
            ['04/05','in','Cartão crédito Asaas batch','MP','Receita assinatura','+R$ 18.422,40','green',false],
            ['03/05','out','Combustível Anderson','BB','Mão de obra','-R$ 320,00','violet',false],
            ['02/05','in','Pix · 24 clientes lote','Sicredi PA','Receita assinatura','+R$ 2.638,40','green',true],
          ].map((r,i) => (
            <tr key={i}>
              <td className="mono num" style={{fontSize: 11}}>{r[0]}</td>
              <td><Icon name={r[1]==='in'?'arrowDown':'arrowUp'} size={14} style={{color: r[1]==='in'?'var(--green)':'var(--red)'}}/></td>
              <td>{r[2]}</td>
              <td className="muted" style={{fontSize: 11}}>{r[3]}</td>
              <td><span className={'badge badge-' + r[6]} style={{fontSize: 10}}>{r[4]}</span></td>
              <td className="mono num" style={{fontWeight: 600, color: r[1]==='in'?'var(--green)':'var(--red)'}}>{r[5]}</td>
              <td>{r[7] ? <Icon name="check" size={14} style={{color: 'var(--green)'}}/> : <span className="muted" style={{fontSize: 10}}>—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ---------- Cheques ----------
const ChequesPage = () => (
  <div className="page">
    <PageHeader title="Cheques" subtitle="Pré-datados · em custódia · compensados" actions={<button className="btn btn-primary"><Icon name="plus" size={13}/> Novo cheque</button>} />
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16}}>
      <div className="kpi"><div className="kpi-label">Em custódia</div><div className="kpi-value">R$ 24.880,00</div><div className="kpi-meta"><span className="muted">12 cheques · pré-datados</span></div></div>
      <div className="kpi"><div className="kpi-label">A compensar (próx 7d)</div><div className="kpi-value">R$ 8.420,00</div><div className="kpi-meta"><span className="muted">4 cheques</span></div></div>
    </div>
    <div className="card">
      <div className="filter-bar">
        <span style={{fontSize: 11, color: 'var(--text-2)'}}>Natureza:</span>
        <span className="filter-chip active">Recebidos</span>
        <span className="filter-chip">Emitidos</span>
        <div style={{width: 1, height: 16, background: 'var(--border)', margin: '0 6px'}}></div>
        <span className="filter-chip active">Todos</span>
        <span className="filter-chip">A depositar</span>
        <span className="filter-chip">A compensar</span>
        <span className="filter-chip">Compensado</span>
        <span className="filter-chip">Devolvido</span>
      </div>
      <table className="table">
        <thead><tr><th>Nº</th><th>Banco</th><th>Emitente</th><th>Bom para</th><th>Valor</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {[
            ['000142','Sicredi · 748','Indústria Bertolini ME','12/05/2026','R$ 4.220,00','depositar'],
            ['000143','Sicredi · 748','Indústria Bertolini ME','22/05/2026','R$ 4.220,00','depositar'],
            ['001882','BB · 001','Carla Maria Schneider','08/05/2026','R$ 1.180,00','compensar'],
            ['044108','Itaú · 341','Eduardo Cristofoli','02/05/2026','R$ 880,00','devolvido'],
            ['021094','Sicredi · 748','Lucas Bittencourt','22/04/2026','R$ 2.200,00','compensado'],
            ['088421','Bradesco · 237','Paulo Henrique Stein','18/04/2026','R$ 540,00','compensado'],
          ].map((r,i) => (
            <tr key={i}>
              <td className="mono">{r[0]}</td>
              <td className="mono" style={{fontSize: 11}}>{r[1]}</td>
              <td>{r[2]}</td>
              <td className="mono num">{r[3]}</td>
              <td className="mono num" style={{fontWeight: 600}}>{r[4]}</td>
              <td><StatusBadge value={r[5]}/></td>
              <td><button className="btn btn-sm btn-ghost btn-icon"><Icon name="more" size={13}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ---------- Previsão de caixa ----------
const PrevisaoPage = () => {
  const days = 30;
  const data = Array.from({length: days}).map((_,i) => {
    const base = 380000;
    const inflow = Math.sin(i / 4) * 30000 + Math.random() * 12000;
    const outflow = i % 5 === 0 ? -45000 : (i % 7 === 0 ? -22000 : -Math.random()*8000);
    return base + (i * 1800) + inflow + outflow;
  });
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data.map((v,i) => `${(i / (days-1)) * 100},${100 - ((v - min) / (max - min)) * 90}`).join(' ');
  return (
    <div className="page">
      <PageHeader title="Previsão de caixa" subtitle="Curva de saldo projetado · próximos 30 dias" actions={<div className="seg"><button className="seg-btn">7d</button><button className="seg-btn active">30d</button><button className="seg-btn">60d</button><button className="seg-btn">180d</button></div>} />
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Saldo atual</div><div className="kpi-value">R$ 482.119</div></div>
        <div className="kpi"><div className="kpi-label">Entradas previstas</div><div className="kpi-value" style={{color: 'var(--green)'}}>R$ 487.220</div></div>
        <div className="kpi"><div className="kpi-label">Saídas previstas</div><div className="kpi-value" style={{color: 'var(--red)'}}>R$ 318.420</div></div>
        <div className="kpi"><div className="kpi-label">Saldo final</div><div className="kpi-value" style={{color: 'var(--accent)'}}>R$ 650.919</div><div className="kpi-meta"><span className="kpi-delta up">+35%</span></div></div>
      </div>
      <div className="card" style={{padding: 18, marginBottom: 16}}>
        <div className="card-title" style={{marginBottom: 14}}>Curva projetada</div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{width: '100%', height: 240}}>
          <defs>
            <linearGradient id="grad-cash" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6d4ae0" stopOpacity="0.3"/><stop offset="100%" stopColor="#6d4ae0" stopOpacity="0"/></linearGradient>
          </defs>
          <polyline points={`0,100 ${points} 100,100`} fill="url(#grad-cash)"/>
          <polyline points={points} fill="none" stroke="#6d4ae0" strokeWidth="0.6"/>
        </svg>
        <div className="row" style={{justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)'}}>
          <span>hoje</span><span>+10d</span><span>+20d</span><span>+30d</span>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><h3 className="card-title">Próximos lançamentos previstos</h3></div>
        <table className="table">
          <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th><th>Saldo após</th></tr></thead>
          <tbody>
            {[
              ['08/05','out','V.tal · trânsito IP','-R$ 18.420','R$ 463.699'],
              ['10/05','in','Faturas com vencimento 10/05','+R$ 41.820','R$ 505.519'],
              ['12/05','out','Folha · 50%','-R$ 24.110','R$ 481.409'],
              ['15/05','out','ISS · INSS','-R$ 8.220','R$ 473.189'],
              ['20/05','in','Faturas vencimento 20/05','+R$ 48.220','R$ 521.409'],
              ['25/05','in','Cartão crédito · split Asaas','+R$ 22.184','R$ 543.593'],
            ].map((r,i) => (
              <tr key={i}>
                <td className="mono num">{r[0]}</td>
                <td><Icon name={r[1]==='in'?'arrowDown':'arrowUp'} size={13} style={{color: r[1]==='in'?'var(--green)':'var(--red)'}}/></td>
                <td>{r[2]}</td>
                <td className="mono num" style={{fontWeight: 600, color: r[1]==='in'?'var(--green)':'var(--red)'}}>{r[3]}</td>
                <td className="mono num">{r[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------- Centro de cobrança expandido ----------
const CentroCobrancaPage = () => {
  const [tab, setTab] = React.useState('central');
  return (
    <div className="page">
      <PageHeader title="Centro de cobrança" subtitle="Funil de inadimplência · templates · safras" actions={<button className="btn btn-primary"><Icon name="bell" size={13}/> Disparar lote</button>} />
      <div className="tabs">
        <div className={'tab' + (tab==='central'?' active':'')} onClick={() => setTab('central')}>Central</div>
        <div className={'tab' + (tab==='templates'?' active':'')} onClick={() => setTab('templates')}>Templates</div>
        <div className={'tab' + (tab==='relatorio'?' active':'')} onClick={() => setTab('relatorio')}>Relatório</div>
      </div>
      {tab === 'central' && (
        <>
          <div className="card" style={{padding: 22, marginBottom: 16, textAlign: 'center'}}>
            <div className="muted" style={{fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600}}>Saldo devedor total</div>
            <div style={{fontSize: 44, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', marginTop: 6, color: 'var(--red)'}}>R$ 184.722,40</div>
            <div className="muted" style={{fontSize: 12, marginTop: 4}}>369 contratos em atraso · 8.6% da base</div>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 16}}>
            {[
              ['A vencer 7d','blue','R$ 48.180','42 títulos'],
              ['1–3 dias','cyan','R$ 22.180','38 títulos'],
              ['4–7 dias','amber','R$ 18.420','41 títulos'],
              ['8–15 dias','amber','R$ 24.220','62 títulos'],
              ['16–30 dias','red','R$ 38.180','98 títulos'],
              ['30+ dias','red','R$ 33.522','88 títulos'],
            ].map((c,i) => (
              <div key={i} className="kpi" style={{padding: 12}}>
                <div className={'kpi-label badge-' + c[1]} style={{padding: 0, border: 'none', background: 'transparent', color: `var(--${c[1]})`}}>{c[0]}</div>
                <div className="kpi-value" style={{fontSize: 18}}>{c[2]}</div>
                <div className="kpi-meta"><span className="muted" style={{fontSize: 11}}>{c[3]}</span></div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Últimas 20 ações de cobrança</h3></div>
            <table className="table">
              <thead><tr><th>Quando</th><th>Cliente</th><th>Canal</th><th>Evento</th><th>Resultado</th></tr></thead>
              <tbody>
                {[
                  ['há 4min','Patricia Hoffmann','WhatsApp','vencido +5d · lembrete','entregue'],
                  ['há 12min','Roberto Schneider','SMS','vencido +18d · pré-suspensão','entregue'],
                  ['há 22min','Lucas Bittencourt','E-mail','vence amanhã','aberto'],
                  ['há 38min','Eduardo Cristofoli','WhatsApp','vencido +35d · negativação','clicou'],
                  ['há 1h','Carla M. Schneider','URA','vencido +28d','sem atendimento'],
                  ['há 2h','Sônia M. Petry','WhatsApp','vencido +12d','respondeu — promessa pagar 10/05'],
                ].map((r,i) => (
                  <tr key={i}>
                    <td className="mono num" style={{fontSize: 11}}>{r[0]}</td>
                    <td>{r[1]}</td>
                    <td><span className="badge badge-violet">{r[2]}</span></td>
                    <td>{r[3]}</td>
                    <td className="muted" style={{fontSize: 11}}>{r[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === 'templates' && (
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Templates por canal · evento</h3><button className="btn btn-sm">+ Novo</button></div>
            <table className="table">
              <thead><tr><th>Canal</th><th>Evento</th><th>Nome</th><th>Última edição</th></tr></thead>
              <tbody>
                {[['WhatsApp','vence em 3 dias','lembrete-3d','há 2 sem'],['WhatsApp','vencido +5d','vencido-5d','há 1 sem'],['WhatsApp','vencido +18d · pré-suspensão','suspender-18d','há 3d'],['SMS','vencido +1d','sms-1d','há 1 mês'],['E-mail','vence hoje','email-d0','há 2 sem'],['URA','vencido +28d','ura-28d','há 4 dias']].map((r,i)=>(
                  <tr key={i}><td><span className="badge badge-violet">{r[0]}</span></td><td>{r[1]}</td><td className="mono" style={{fontSize: 11}}>{r[2]}</td><td className="muted" style={{fontSize: 11}}>{r[3]}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Editor: <span className="mono">vencido-5d</span></h3></div>
            <div className="card-body">
              <div className="field" style={{marginBottom: 12}}><label className="label">Mensagem</label>
                <textarea className="textarea" defaultValue={'Olá {{nome}}, sua fatura no valor de {{valor}} venceu em {{vencimento}}. Para evitar a suspensão, regularize via Pix em https://netvale.com.br/2via/{{token}} ou responda esta mensagem.\n\nNetVale Telecom'} style={{minHeight: 140}}></textarea>
              </div>
              <div className="muted" style={{fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em'}}>Variáveis disponíveis</div>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: 4}}>
                {['{{nome}}','{{valor}}','{{vencimento}}','{{dias_atraso}}','{{token}}','{{boleto_url}}','{{pix_codigo}}','{{plano}}'].map(v => (
                  <span key={v} className="kbd" style={{cursor: 'pointer'}}>{v}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {tab === 'relatorio' && (
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Inadimplência por safra de cliente</h3></div>
            <table className="table">
              <thead><tr><th>Safra</th><th>Ativos</th><th>Inadimpl.</th><th>%</th></tr></thead>
              <tbody>
                {[['Jan/26','388','22','5.7%'],['Dez/25','421','38','9.0%'],['Nov/25','470','51','10.9%'],['Out/25','398','42','10.6%'],['Set/25','512','64','12.5%'],['Ago/25','488','71','14.5%']].map((r,i)=>(
                  <tr key={i}><td className="mono num">{r[0]}</td><td className="mono num">{r[1]}</td><td className="mono num">{r[2]}</td><td className="mono num" style={{color: parseFloat(r[3])>10?'var(--red)':'var(--text)'}}>{r[3]}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Por vendedor</h3></div>
            <table className="table">
              <thead><tr><th>Vendedor</th><th>Vendas 12m</th><th>Inadimpl.</th><th>%</th></tr></thead>
              <tbody>
                {[['Marcos Tortella','188','11','5.8%'],['Camila Schenkel','142','22','15.4%'],['Diego Petrocelli','220','24','10.9%'],['Tatiana Lopes','98','9','9.2%']].map((r,i)=>(
                  <tr key={i}><td>{r[0]}</td><td className="mono num">{r[1]}</td><td className="mono num">{r[2]}</td><td className="mono num" style={{color: parseFloat(r[3])>12?'var(--red)':'var(--text)'}}>{r[3]}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card" style={{gridColumn: '1 / -1'}}>
            <div className="card-header"><h3 className="card-title">Por plano</h3></div>
            <table className="table">
              <thead><tr><th>Plano</th><th>Ativos</th><th>Em atraso</th><th>R$ devedor</th><th>% inadimpl.</th></tr></thead>
              <tbody>
                {[['Fibra 100','480','42','R$ 12.480','8.7%'],['Fibra 300','1140','98','R$ 31.840','8.5%'],['Fibra 500','1882','142','R$ 64.220','7.5%'],['Fibra 1G','622','62','R$ 38.420','9.9%'],['Empresarial','163','25','R$ 37.762','15.3%']].map((r,i)=>(
                  <tr key={i}><td>{r[0]}</td><td className="mono num">{r[1]}</td><td className="mono num">{r[2]}</td><td className="mono num">{r[3]}</td><td className="mono num">{r[4]}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- OS lista/timeline/agenda ----------
const OsPage = () => {
  const [view, setView] = React.useState('lista');
  return (
    <div className="page">
      <PageHeader title="Ordens de serviço" subtitle="Instalação · Manutenção · Visita técnica · Retirada" actions={<><div className="seg">{['lista','timeline','agenda','mapa'].map(v => <button key={v} className={'seg-btn'+(view===v?' active':'')} onClick={() => setView(v)}>{v}</button>)}</div><button className="btn btn-primary"><Icon name="plus" size={13}/> Nova OS</button></>} />
      {view === 'lista' && (
        <div className="card">
          <table className="table">
            <thead><tr><th>OS</th><th>Tipo</th><th>Cliente</th><th>Endereço</th><th>Técnico</th><th>Data</th><th>Status</th></tr></thead>
            <tbody>
              {(D.OS_LIST || []).map(o => (
                <tr key={o.id}>
                  <td className="mono" style={{fontSize: 11}}>{o.id}</td>
                  <td><span className="badge badge-blue">{o.tipo}</span></td>
                  <td>{o.cliente}</td>
                  <td className="muted" style={{fontSize: 11}}>{o.endereco}</td>
                  <td>{o.tecnico}</td>
                  <td className="mono num">{o.data}</td>
                  <td><StatusBadge value={o.status}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {view === 'timeline' && (
        <div className="card" style={{padding: 20}}>
          {[
            { day: 'Hoje · 06/05', items: [
              { h: '08:30', t: 'Instalação · Henrique O. Tomazoni', who: 'Anderson F.', s: 'concluida' },
              { h: '10:15', t: 'Manutenção · Patricia Hoffmann', who: 'Bruno P.', s: 'em_execucao' },
              { h: '14:00', t: 'Visita técnica · Maria A. Silva', who: 'Anderson F.', s: 'em_deslocamento' },
              { h: '15:30', t: 'Instalação · Carlos Steiner', who: 'Anderson F.', s: 'agendada' },
            ]},
            { day: 'Amanhã · 07/05', items: [
              { h: '09:00', t: 'Retirada · Sônia M. Petry', who: 'Bruno P.', s: 'agendada' },
              { h: '11:00', t: 'Visita técnica · Eduardo Cristofoli', who: 'Anderson F.', s: 'agendada' },
              { h: '14:30', t: 'Manutenção · CTO 04 região centro', who: 'Bruno P.', s: 'agendada' },
            ]},
            { day: 'Sexta · 08/05', items: [
              { h: '08:00', t: 'Instalação · Bertolini ME (4 pontos)', who: 'Anderson + Bruno', s: 'agendada' },
            ]},
          ].map((d,i) => (
            <div key={i} style={{marginBottom: 24}}>
              <div className="muted" style={{fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12}}>{d.day}</div>
              <div className="tl">
                {d.items.map((it,k) => (
                  <div key={k} className="tl-item">
                    <div className={'tl-dot ' + (it.s==='concluida'?'green':it.s==='em_execucao'?'amber':it.s==='em_deslocamento'?'amber':'')}>{it.s==='concluida' && <Icon name="check" size={10} style={{color: 'var(--green)'}}/>}</div>
                    <div className="row" style={{marginBottom: 2}}>
                      <span className="mono" style={{fontSize: 12, fontWeight: 600}}>{it.h}</span>
                      <span style={{fontWeight: 500}}>{it.t}</span>
                      <StatusBadge value={it.s}/>
                    </div>
                    <div className="muted" style={{fontSize: 11}}>{it.who}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {view === 'agenda' && (
        <div className="card" style={{padding: 16}}>
          <div className="row" style={{marginBottom: 12, justifyContent: 'space-between'}}>
            <div className="row">
              <button className="btn btn-sm btn-icon"><Icon name="chevron" size={14} style={{transform: 'rotate(180deg)'}}/></button>
              <span style={{fontSize: 14, fontWeight: 600}}>Maio · 2026</span>
              <button className="btn btn-sm btn-icon"><Icon name="chevron" size={14}/></button>
            </div>
            <div className="row" style={{gap: 12, fontSize: 11}}>
              <span className="row" style={{gap: 4}}><span style={{width: 8, height: 8, borderRadius: 4, background: 'var(--blue)'}}></span>agendada</span>
              <span className="row" style={{gap: 4}}><span style={{width: 8, height: 8, borderRadius: 4, background: 'var(--amber)'}}></span>em execução</span>
              <span className="row" style={{gap: 4}}><span style={{width: 8, height: 8, borderRadius: 4, background: 'var(--green)'}}></span>concluída</span>
              <span className="row" style={{gap: 4}}><span style={{width: 8, height: 8, borderRadius: 4, background: 'var(--red)'}}></span>não compareceu</span>
            </div>
          </div>
          <div className="cal-grid">
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => <div key={d} className="cal-head">{d}</div>)}
            {Array.from({length: 35}).map((_,i) => {
              const day = i - 4;
              const outside = day < 1 || day > 31;
              const today = day === 6;
              const events = day === 6 ? [['blue','08:30 Instalação'],['amber','10:15 Manutenção'],['amber','14:00 Visita'],['blue','15:30 Instalação']]
                : day === 7 ? [['blue','09:00 Retirada'],['blue','11:00 Visita'],['blue','14:30 Manut.']]
                : day === 8 ? [['blue','08:00 Inst. Bertolini']]
                : day === 4 ? [['green','✓ Inst. concluída'],['green','✓ Visita ok']]
                : day === 5 ? [['green','✓ 3 OS concluídas']]
                : day === 12 ? [['blue','Manutenção CTO 04'],['blue','+2 OS']]
                : day === 15 ? [['red','✗ Não compareceu'],['blue','Inst. Stein']]
                : day === 22 ? [['blue','3 OS agendadas']] : [];
              return (
                <div key={i} className={'cal-cell' + (outside?' outside':'') + (today?' today':'')}>
                  <span className="cal-day">{outside ? (day < 1 ? 30 + day : day - 31) : day}</span>
                  {events.slice(0,3).map((e,k) => (
                    <span key={k} className="cal-event" style={{background: `var(--${e[0]}-soft)`, color: `var(--${e[0]})`, borderLeft: `2px solid var(--${e[0]})`}}>{e[1]}</span>
                  ))}
                  {events.length > 3 && <span className="cal-event muted" style={{background: 'var(--bg-3)'}}>+{events.length - 3} mais</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {view === 'mapa' && <MapaPage />}
    </div>
  );
};

// ---------- Tarefas internas ----------
const TarefasPage = () => {
  const cols = [
    { id: 'backlog', title: 'Backlog', color: 'var(--text-3)', cards: [
      { t: 'Reformar POP centro · cabeamento', who: 'Diego', d: 'Infra' },
      { t: 'Atualizar firmware OLTs', who: 'Bruno', d: 'Rede' },
      { t: 'Negociar com V.tal trânsito 2 Gbps', who: 'Ricardo', d: 'Comercial' },
    ]},
    { id: 'fazendo', title: 'Fazendo', color: 'var(--blue)', cards: [
      { t: 'Migrar contábil pra Stein', who: 'Camila', d: 'Adm' },
      { t: 'Refatorar régua cobrança +30d', who: 'Camila', d: 'Financeiro' },
    ]},
    { id: 'review', title: 'Revisão', color: 'var(--amber)', cards: [
      { t: 'Política de privacidade v3.3', who: 'Vinicius', d: 'LGPD' },
      { t: 'Plano empresarial 2 Gbps · pricing', who: 'Marcos', d: 'Comercial' },
    ]},
    { id: 'done', title: 'Concluído', color: 'var(--green)', cards: [
      { t: 'Integração Asaas split cartão', who: 'Diego', d: 'Tech' },
      { t: 'Treinamento N1 sobre nova régua', who: 'Tatiana', d: 'Suporte' },
    ]},
  ];
  return (
    <div className="page">
      <PageHeader title="Tarefas internas" subtitle="Backlog · planejamento · execução · etapas configuráveis pelo usuário" actions={<><div className="seg"><button className="seg-btn active">Kanban</button><button className="seg-btn">Lista</button></div><button className="btn btn-primary"><Icon name="plus" size={13}/> Nova tarefa</button></>} />
      <div className="kanban">
        {cols.map(col => (
          <div key={col.id} className="kanban-col">
            <div className="kanban-col-head">
              <span style={{width: 8, height: 8, borderRadius: 4, background: col.color}}></span>
              <span className="kanban-col-title">{col.title}</span>
              <span className="kanban-col-count">{col.cards.length}</span>
            </div>
            {col.cards.map((c,i) => (
              <div key={i} className="kanban-card">
                <div className="kanban-card-title">{c.t}</div>
                <div className="kanban-card-meta">
                  <span className="badge badge-gray" style={{fontSize: 10, height: 16}}>{c.d}</span>
                  <span className="grow"></span>
                  <div className="avatar" style={{width: 18, height: 18, fontSize: 9}}>{c.who.slice(0,2).toUpperCase()}</div>
                </div>
              </div>
            ))}
            <button className="btn btn-sm btn-ghost" style={{width: '100%', justifyContent: 'flex-start', marginTop: 4}}><Icon name="plus" size={12}/> Adicionar</button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- Grupos RADIUS ----------
const GruposRadiusPage = () => (
  <div className="page">
    <PageHeader title="Grupos RADIUS" subtitle="Mapeia plano · estado → atributos enviados ao NAS" actions={<button className="btn btn-primary"><Icon name="plus" size={13}/> Novo grupo</button>} />
    <div className="card">
      <table className="table">
        <thead><tr><th>Nome</th><th>Tipo</th><th>Plano vinculado</th><th>Rate limit</th><th>Pool IP</th><th>Redirect URL</th><th>Status</th></tr></thead>
        <tbody>
          {[
            ['fibra-100-ativo','Liberação','Fibra 100','100M/50M','pool-clientes','—','ativo'],
            ['fibra-300-ativo','Liberação','Fibra 300','300M/150M','pool-clientes','—','ativo'],
            ['fibra-500-ativo','Liberação','Fibra 500','500M/250M','pool-clientes','—','ativo'],
            ['fibra-1g-ativo','Liberação','Fibra 1G','1000M/500M','pool-clientes','—','ativo'],
            ['empresarial-ativo','Liberação','Empresarial','dedicado','pool-empresarial','—','ativo'],
            ['suspenso-aviso','Restrição','—','512K/512K','pool-suspenso','https://aviso.netvale.com.br','ativo'],
            ['negativado-bloqueio','Restrição','—','64K/64K','pool-suspenso','https://aviso.netvale.com.br/regularize','ativo'],
            ['cancelado-bloqueio','Bloqueio','—','—','—','—','ativo'],
          ].map((r,i) => (
            <tr key={i}>
              <td className="mono" style={{fontSize: 11, fontWeight: 600}}>{r[0]}</td>
              <td><span className={'badge badge-' + (r[1]==='Liberação'?'green':r[1]==='Restrição'?'amber':'red')}>{r[1]}</span></td>
              <td>{r[2]}</td>
              <td className="mono num">{r[3]}</td>
              <td className="mono" style={{fontSize: 11}}>{r[4]}</td>
              <td className="mono" style={{fontSize: 10}}>{r[5]}</td>
              <td><span className="badge badge-green"><span className="badge-dot"></span>{r[6]}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ---------- Sessões PPPoE realtime ----------
const SessoesPage = () => (
  <div className="page">
    <PageHeader title="Sessões PPPoE" subtitle="Tempo real · throughput agregado por NAS" actions={<button className="btn"><Icon name="refresh" size={13}/> Auto-refresh 10s</button>} />
    <div style={{display: 'flex', alignItems: 'center', gap: 24, padding: 18, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16}}>
      <div>
        <div className="muted" style={{fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600}}>Online agora</div>
        <div style={{fontSize: 48, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', color: 'var(--green)', lineHeight: 1}}>3.918</div>
      </div>
      <div style={{height: 50, width: 1, background: 'var(--border)'}}></div>
      <div style={{flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18}}>
        <div><div className="muted" style={{fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600}}>Throughput total</div><div style={{fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-mono)'}}>2.84 <span style={{fontSize: 13, color: 'var(--text-2)'}}>Gbps</span></div></div>
        <div><div className="muted" style={{fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600}}>Pico 24h</div><div style={{fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-mono)'}}>4.12 <span style={{fontSize: 13, color: 'var(--text-2)'}}>Gbps</span></div></div>
        <div><div className="muted" style={{fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600}}>Tempo médio</div><div style={{fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-mono)'}}>14h 22m</div></div>
        <div><div className="muted" style={{fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600}}>NAS ativos</div><div style={{fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-mono)'}}>5 <span style={{fontSize: 13, color: 'var(--green)'}}>/ 5</span></div></div>
      </div>
    </div>
    <div className="card">
      <table className="table">
        <thead><tr><th>Cliente</th><th>Usuário PPPoE</th><th>IP</th><th>NAS</th><th>Tempo</th><th>↓ Down</th><th>↑ Up</th><th>Sinal</th></tr></thead>
        <tbody>
          {(D.SESSOES || []).map((s,i) => (
            <tr key={i}>
              <td>{s.cliente}</td>
              <td className="mono" style={{fontSize: 11}}>{s.usuario}</td>
              <td className="mono num" style={{fontSize: 11}}>{s.ip}</td>
              <td className="mono" style={{fontSize: 11}}>{s.nas}</td>
              <td className="mono num" style={{fontSize: 11}}>{s.tempo}</td>
              <td className="mono num" style={{fontSize: 11, color: 'var(--green)'}}>{s.down}</td>
              <td className="mono num" style={{fontSize: 11, color: 'var(--blue)'}}>{s.up}</td>
              <td className="mono num" style={{fontSize: 11}}>{(-15 - Math.random()*8).toFixed(1)} dBm</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ---------- Equipamentos inventário ----------
const EquipamentosPage = () => (
  <div className="page">
    <PageHeader title="Inventário de equipamentos" subtitle="ONU · Roteadores · Switches · OLTs · em comodato e estoque" actions={<><button className="btn"><Icon name="upload" size={13}/> Importar</button><button className="btn btn-primary"><Icon name="plus" size={13}/> Cadastrar</button></>} />
    <div className="kpi-grid">
      <div className="kpi"><div className="kpi-label">Total inventariado</div><div className="kpi-value">5.847</div></div>
      <div className="kpi"><div className="kpi-label">Em comodato</div><div className="kpi-value">3.982</div><div className="kpi-meta"><span className="muted">68%</span></div></div>
      <div className="kpi"><div className="kpi-label">Em estoque</div><div className="kpi-value">1.247</div><div className="kpi-meta"><span className="muted">técnicos · matriz</span></div></div>
      <div className="kpi"><div className="kpi-label">Defeito</div><div className="kpi-value" style={{color: 'var(--red)'}}>22</div><div className="kpi-meta"><span className="muted">aguardando RMA</span></div></div>
    </div>
    <div className="card">
      <div className="filter-bar">
        <span className="filter-chip active">Todos</span>
        <span className="filter-chip">ONU</span>
        <span className="filter-chip">Roteador</span>
        <span className="filter-chip">Switch</span>
        <span className="filter-chip">OLT</span>
        <div className="grow"></div>
        <input className="input" placeholder="MAC · Serial · Cliente…" style={{width: 240}}/>
      </div>
      <table className="table">
        <thead><tr><th>Tipo</th><th>Modelo</th><th>MAC</th><th>Serial PON</th><th>Cliente / Local</th><th>Contrato</th><th>Status</th></tr></thead>
        <tbody>
          {(D.EQUIPAMENTOS || []).map((e,i) => (
            <tr key={i}>
              <td><span className={'badge badge-' + (e.tipo==='ONU'?'cyan':e.tipo==='Roteador'?'blue':e.tipo==='Switch'?'violet':'amber')}>{e.tipo}</span></td>
              <td>{e.modelo}</td>
              <td className="mono" style={{fontSize: 11}}>{e.mac}</td>
              <td className="mono" style={{fontSize: 11}}>{e.serial}</td>
              <td>{e.cliente}</td>
              <td className="mono" style={{fontSize: 11}}>{e.contrato || '—'}</td>
              <td><span className={'badge badge-' + (e.status==='ativo'?'green':e.status==='estoque'?'gray':'red')}><span className="badge-dot"></span>{e.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ---------- Importação CSV ----------
const ImportarPage = () => (
  <div className="page">
    <PageHeader title="Importar CSV" subtitle="Migração IXC/Hubsoft · clientes, contratos, faturas" actions={<><button className="btn"><Icon name="download" size={13}/> Modelo CSV</button></>} />
    <div className="wiz-nav">
      <div className="wiz-step done"><span className="wiz-num"><Icon name="check" size={11}/></span>Upload</div>
      <div className="wiz-line"></div>
      <div className="wiz-step active"><span className="wiz-num">2</span>Mapear colunas</div>
      <div className="wiz-line"></div>
      <div className="wiz-step"><span className="wiz-num">3</span>Validar</div>
      <div className="wiz-line"></div>
      <div className="wiz-step"><span className="wiz-num">4</span>Importar</div>
    </div>
    <div className="card" style={{marginBottom: 16}}>
      <div className="card-header">
        <div>
          <h3 className="card-title">clientes-ixc-export.csv</h3>
          <p className="card-subtitle">2.118 linhas · 24 colunas · 487 KB · upload há 2min</p>
        </div>
        <span className="badge badge-amber"><span className="badge-dot"></span>14 erros · 38 alertas</span>
      </div>
      <div className="card-body">
        <table className="table" style={{fontSize: 11}}>
          <thead><tr><th>#</th><th>Coluna CSV</th><th>Mapeada para</th><th>Exemplo</th><th>Status</th></tr></thead>
          <tbody>
            {[
              ['1','razao_social','clientes.nome','Henrique O. Tomazoni','ok'],
              ['2','cnpj_cpf','clientes.documento','022.114.880-21','ok'],
              ['3','tipo_pessoa','clientes.tipo','PF','ok'],
              ['4','telefone_celular','clientes.celular','(54) 99880-1148','ok'],
              ['5','email','clientes.email','henrique@tomazoni.com','ok'],
              ['6','cep','enderecos.cep','95020-000','ok'],
              ['7','logradouro','enderecos.logradouro','Rua Garibaldi, 1102','ok'],
              ['8','plano_id_ixc','contratos.plano_externo','PL-018','ok'],
              ['9','vencimento','contratos.vencimento','10','ok'],
              ['10','status_cliente','clientes.status','A','warning'],
              ['11','login_pppoe','contratos.usuario_pppoe','tomazoni-h','ok'],
              ['12','senha_pppoe','contratos.senha_pppoe','••••••••','ok'],
            ].map((r,i) => (
              <tr key={i}>
                <td className="mono">{r[0]}</td>
                <td className="mono" style={{fontWeight: 600}}>{r[1]}</td>
                <td><span style={{display: 'flex', alignItems: 'center', gap: 6}}><Icon name="arrow" size={11}/><span className="mono" style={{color: 'var(--accent)'}}>{r[2]}</span></span></td>
                <td className="muted">{r[3]}</td>
                <td>{r[4]==='ok' ? <Icon name="check" size={14} style={{color: 'var(--green)'}}/> : <span className="badge badge-amber">precisa atenção</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <span className="muted" style={{fontSize: 11}}>14 linhas com erro serão puladas. 38 alertas (status sem equivalente direto).</span>
        <div style={{display: 'flex', gap: 8}}>
          <button className="btn">Voltar</button>
          <button className="btn btn-primary">Validar 2.104 linhas</button>
        </div>
      </div>
    </div>
  </div>
);

// ---------- Configuração fiscal ----------
const ConfigFiscalPage = () => (
  <div className="page">
    <PageHeader title="Configuração fiscal" subtitle="NFSe · NFSC mod. 21 · Plugnotas · Certificado A1" />
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
      <div className="card">
        <div className="card-header"><h3 className="card-title">Status</h3></div>
        <div className="card-body" style={{display: 'grid', gap: 10, fontSize: 12}}>
          <div className="row" style={{justifyContent: 'space-between'}}><span>Plugnotas</span><span className="badge badge-green"><span className="badge-dot"></span>conectado</span></div>
          <div className="row" style={{justifyContent: 'space-between'}}><span>Certificado A1</span><span className="badge badge-green"><span className="badge-dot"></span>válido até 12/11/2026</span></div>
          <div className="row" style={{justifyContent: 'space-between'}}><span>Webservice município</span><span className="badge badge-green"><span className="badge-dot"></span>online</span></div>
          <div className="row" style={{justifyContent: 'space-between'}}><span>Webservice SEFAZ-RS</span><span className="badge badge-green"><span className="badge-dot"></span>online</span></div>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><h3 className="card-title">Emissor</h3></div>
        <div className="card-body" style={{fontSize: 12, display: 'grid', gap: 10}}>
          <div className="field-row"><div className="field"><label className="label">CNPJ</label><input className="input mono" defaultValue="04.221.880/0001-78" readOnly/></div><div className="field"><label className="label">Inscrição municipal</label><input className="input mono" defaultValue="221.187/2"/></div></div>
          <div className="field"><label className="label">Razão social</label><input className="input" defaultValue="NetVale Telecom Comunicações LTDA"/></div>
          <div className="field-row"><div className="field"><label className="label">Regime</label><select className="select"><option>Simples Nacional</option><option>Lucro presumido</option></select></div><div className="field"><label className="label">Alíquota ISS</label><input className="input mono" defaultValue="2,5%"/></div></div>
          <div className="field-row"><div className="field"><label className="label">Série NFSe</label><input className="input mono" defaultValue="1"/></div><div className="field"><label className="label">Próximo nº</label><input className="input mono" defaultValue="0008713"/></div><div className="field"><label className="label">Série NFSC mod.21</label><input className="input mono" defaultValue="A"/></div></div>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><h3 className="card-title">Credenciais Plugnotas</h3></div>
        <div className="card-body" style={{display: 'grid', gap: 10, fontSize: 12}}>
          <div className="field"><label className="label">X-API-KEY</label><input className="input mono" type="password" defaultValue="pn_live_••••••••••••••••H8Z21"/></div>
          <div className="field"><label className="label">Ambiente</label><select className="select"><option>Produção</option><option>Homologação</option></select></div>
          <div className="row" style={{justifyContent: 'space-between'}}><span className="muted">Saldo de envios</span><span className="mono num">8.218 / 10.000</span></div>
          <button className="btn">Testar conexão</button>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><h3 className="card-title">Certificado A1 (.pfx)</h3></div>
        <div className="card-body" style={{display: 'grid', gap: 10}}>
          <div style={{padding: 12, background: 'var(--green-soft)', border: '1px solid var(--green-border)', borderRadius: 6, fontSize: 12}}>
            <div className="row" style={{marginBottom: 4}}><Icon name="shield" size={14} style={{color: 'var(--green)'}}/><strong>NETVALE TELECOM COMUNICACOES LTDA:04221880000178</strong></div>
            <div className="muted" style={{fontSize: 11}}>Emitido por AC SAFEWEB RFB v5 · validade 12/11/2026 (190 dias)</div>
          </div>
          <button className="btn"><Icon name="upload" size={13}/> Substituir certificado</button>
        </div>
      </div>
    </div>
  </div>
);

// ---------- Configuração pagamentos ----------
const ConfigPagamentosPage = () => {
  const [provider, setProvider] = React.useState('asaas');
  return (
    <div className="page">
      <PageHeader title="Configuração de pagamentos" subtitle="Gateway primário · gateways secundários · CNAB" />
      <div className="card" style={{marginBottom: 16}}>
        <div className="card-header"><h3 className="card-title">Provider primário</h3></div>
        <div className="card-body">
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10}}>
            {[
              { id: 'asaas', n: 'Asaas', d: 'Pix · Boleto · Cartão' },
              { id: 'iugu', n: 'Iugu', d: 'Pix · Boleto · Cartão' },
              { id: 'efi', n: 'Efí', d: 'Pix · Boleto' },
              { id: 'mp', n: 'Mercado Pago', d: 'Cartão · Pix · QR' },
              { id: 'cnab', n: 'CNAB Sicredi', d: 'Boleto registrado' },
            ].map(p => (
              <div key={p.id} onClick={() => setProvider(p.id)} style={{padding: 14, border: '2px solid ' + (provider===p.id ? 'var(--accent)' : 'var(--border)'), borderRadius: 8, cursor: 'pointer', background: provider===p.id ? 'var(--accent-soft)' : 'var(--bg-2)'}}>
                <div style={{fontWeight: 700, fontSize: 14, marginBottom: 4}}>{p.n}</div>
                <div className="muted" style={{fontSize: 11}}>{p.d}</div>
                {provider === p.id && <div className="badge badge-green" style={{marginTop: 8}}><Icon name="check" size={9}/> ativo</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
      {provider === 'asaas' ? (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Credenciais Asaas</h3><span className="badge badge-green"><span className="badge-dot"></span>conectado</span></div>
          <div className="card-body" style={{display: 'grid', gap: 10}}>
            <div className="field"><label className="label">API Key</label><input className="input mono" type="password" defaultValue="$aact_prod_••••••••••••f9aBcD22"/></div>
            <div className="field-row">
              <div className="field"><label className="label">Walletid principal</label><input className="input mono" defaultValue="ec5b1c1a-•••"/></div>
              <div className="field"><label className="label">Webhook URL</label><input className="input mono" defaultValue="https://hook.netvale.com/asaas"/></div>
            </div>
            <div className="row" style={{gap: 16, padding: 8}}>
              <label className="row" style={{gap: 6, fontSize: 12, cursor: 'pointer'}}><input type="checkbox" defaultChecked/> Pix habilitado</label>
              <label className="row" style={{gap: 6, fontSize: 12, cursor: 'pointer'}}><input type="checkbox" defaultChecked/> Boleto registrado</label>
              <label className="row" style={{gap: 6, fontSize: 12, cursor: 'pointer'}}><input type="checkbox" defaultChecked/> Cartão de crédito</label>
              <label className="row" style={{gap: 6, fontSize: 12, cursor: 'pointer'}}><input type="checkbox"/> Split automático</label>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon"><Icon name="settings" size={20}/></div>
          <div className="empty-title">Etapa futura</div>
          <div className="empty-desc">Provider {provider.toUpperCase()} disponível na próxima sprint. Migração assistida partindo de Asaas.</div>
          <button className="btn">Solicitar habilitação</button>
        </div>
      )}
    </div>
  );
};

// ---------- LGPD ----------
const LgpdPage = () => (
  <div className="page">
    <PageHeader title="LGPD · Solicitações de titular" subtitle="Lei 13.709/2018 · DPO Vinicius Bittar · prazo 15 dias" actions={<button className="btn btn-primary"><Icon name="plus" size={13}/> Registrar solicitação</button>} />
    <div className="kpi-grid">
      <div className="kpi"><div className="kpi-label">Solicitações 30d</div><div className="kpi-value">14</div></div>
      <div className="kpi"><div className="kpi-label" style={{color: 'var(--amber)'}}>Pendentes</div><div className="kpi-value" style={{color: 'var(--amber)'}}>3</div><div className="kpi-meta"><span className="muted">SLA médio 8d</span></div></div>
      <div className="kpi"><div className="kpi-label" style={{color: 'var(--green)'}}>Cumprimento</div><div className="kpi-value" style={{color: 'var(--green)'}}>100%</div><div className="kpi-meta"><span className="muted">dentro do prazo</span></div></div>
    </div>
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12}}>
      {[
        { c: 'Sônia Maria Petry', cpf: '551.882.********', t: 'Eliminação de dados', s: 'pendente', d: '02/05/2026', m: 'Cancelou contrato em 01/05 · solicita exclusão integral conforme art.18 V LGPD.' },
        { c: 'Eduardo Cristofoli', cpf: '**.221.880/0001-**', t: 'Acesso aos dados', s: 'pendente', d: '04/05/2026', m: 'Solicita relatório completo de tratamento de dados pessoais.' },
        { c: 'Marcelo A. Reis', cpf: '322.114.********', t: 'Portabilidade', s: 'aprovada', d: '06/05/2026', m: 'Migração para concorrente · pediu dump de dados em formato estruturado.' },
        { c: 'Patricia Hoffmann', cpf: '188.****.220', t: 'Correção', s: 'executada', d: '28/04/2026', m: 'CPF cadastrado errado · corrigido após validação documental.' },
        { c: 'Frederico Marx', cpf: '044.221.********', t: 'Eliminação de dados', s: 'rejeitada', d: '20/04/2026', m: 'Indeferida · dados retidos por obrigação legal (notas fiscais 5 anos).' },
        { c: 'Lucas Bittencourt', cpf: '**.498.110/0001-**', t: 'Revogação consentimento', s: 'executada', d: '15/04/2026', m: 'Marketing · sair de listas WhatsApp e e-mail.' },
      ].map((s,i) => (
        <div key={i} className="card" style={{padding: 14}}>
          <div className="row" style={{marginBottom: 8}}>
            <span className="badge badge-violet">{s.t}</span>
            <span className="grow"></span>
            <StatusBadge value={s.s}/>
          </div>
          <div style={{fontWeight: 600, fontSize: 13}}>{s.c}</div>
          <div className="muted mono" style={{fontSize: 10, marginTop: 1}}>{s.cpf} · aberto {s.d}</div>
          <div style={{fontSize: 12, marginTop: 8, color: 'var(--text-2)', lineHeight: 1.5}}>{s.m}</div>
          <div style={{display: 'flex', gap: 6, marginTop: 12}}>
            {s.s === 'pendente' && <><button className="btn btn-sm btn-primary" style={{flex: 1}}>Aprovar</button><button className="btn btn-sm btn-danger" style={{flex: 1}}>Rejeitar</button></>}
            {s.s === 'aprovada' && <button className="btn btn-sm btn-primary" style={{flex: 1}}>Executar</button>}
            {(s.s === 'executada' || s.s === 'rejeitada') && <button className="btn btn-sm" style={{flex: 1}}>Ver dossiê</button>}
            <button className="btn btn-sm btn-ghost btn-icon"><Icon name="more" size={13}/></button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ---------- Cmd-K palette ----------
const CmdKPalette = ({ open, onClose, onNav }) => {
  const [q, setQ] = React.useState('');
  if (!open) return null;
  const items = [
    { sec: 'Navegação', items: [
      { t: 'Dashboard', i: 'dashboard', id: 'dashboard' },
      { t: 'Clientes', i: 'users', id: 'clientes' },
      { t: 'Faturas', i: 'money', id: 'financeiro' },
      { t: 'Contratos', i: 'contract', id: 'contratos' },
      { t: 'CRM', i: 'kanban', id: 'crm' },
      { t: 'Mapa de clientes', i: 'map', id: 'mapa' },
      { t: 'OS', i: 'clipboard', id: 'os' },
      { t: 'Concentradores Mikrotik', i: 'router', id: 'mikrotik' },
    ]},
    { sec: 'Clientes', items: [
      { t: 'Maria Aparecida Silva', i: 'user', id: 'clientes', meta: 'CT-2024-001247' },
      { t: 'Roberto Schneider', i: 'user', id: 'clientes', meta: 'CT-2023-008891' },
      { t: 'Henrique O. Tomazoni', i: 'user', id: 'clientes', meta: 'CT-2026-000312' },
    ]},
    { sec: 'Ações', items: [
      { t: 'Nova fatura', i: 'plus', id: 'financeiro', meta: '⌘N' },
      { t: 'Nova OS', i: 'plus', id: 'os', meta: '⌘⇧O' },
      { t: 'Trocar tema', i: 'moon', id: '__theme', meta: '⌘⇧L' },
    ]},
  ];
  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk" onClick={e => e.stopPropagation()}>
        <div className="cmdk-input-wrap">
          <Icon name="search" size={16}/>
          <input className="cmdk-input" autoFocus placeholder="Buscar cliente, fatura, contrato, IP, MAC, ou ação…" value={q} onChange={e => setQ(e.target.value)}/>
          <span className="kbd">esc</span>
        </div>
        <div className="cmdk-list">
          {items.map((g,i) => (
            <div key={i}>
              <div className="cmdk-section">{g.sec}</div>
              {g.items.map((it,k) => (
                <div key={k} className={'cmdk-item' + (i===0&&k===0?' active':'')} onClick={() => { if (it.id !== '__theme') onNav(it.id); onClose(); }}>
                  <Icon name={it.i} size={14}/>
                  <span>{it.t}</span>
                  {it.meta && <span className="cmdk-meta">{it.meta}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Export all
Object.assign(window, {
  ClientesOnlinePage, AutenticacoesPage, NegativacaoPage,
  CrmPage, PlanosPage, MapaPage,
  ContasPagarPage, FornecedoresPage, ContasBancariasPage, MovimentacoesPage, ChequesPage, PrevisaoPage,
  CentroCobrancaPage, OsPage, TarefasPage,
  GruposRadiusPage, SessoesPage, EquipamentosPage, ImportarPage,
  ConfigFiscalPage, ConfigPagamentosPage, LgpdPage,
  CmdKPalette, StatusBadge,
});
