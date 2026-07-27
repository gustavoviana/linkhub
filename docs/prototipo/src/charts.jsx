// 3 variações do gráfico de consumo de rede
const NetCharts = (() => {
  const Token = ({ dark }) => ({
    bg: dark ? '#0b0e16' : '#ffffff',
    surface: dark ? '#141826' : '#ffffff',
    border: dark ? '#252a3d' : '#e7e8ee',
    text: dark ? '#eef1f8' : '#0d0f17',
    text2: dark ? '#9ca3b6' : '#525866',
    text3: dark ? '#6b7388' : '#8a90a0',
    grid: dark ? '#1d2233' : '#f0f1f6',
  });

  // Sample 24h data (download Mbps, upload Mbps)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const downloadData = [12,8,5,3,4,6,18,42,68,55,48,52,62,58,45,52,78,142,186,168,124,88,52,32];
  const uploadData =   [4,2,2,1,2,3,8,18,32,28,22,24,28,26,22,28,42,68,82,76,56,42,28,18];

  // V1 — Smooth area chart com gradiente
  const ChartArea = ({ dark }) => {
    const t = Token({ dark });
    const max = 200;
    const W = 300, H = 140;
    const path = (data) => {
      const pts = data.map((v, i) => `${(i / 23) * W},${H - (v / max) * H}`);
      return 'M ' + pts.join(' L ');
    };
    const areaPath = (data) => path(data) + ` L ${W},${H} L 0,${H} Z`;

    return (
      <div style={{ padding: 22, background: t.surface, borderRadius: 20, border: `1px solid ${t.border}`, color: t.text }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: t.text2, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Consumo de hoje</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, fontFamily: 'ui-monospace,monospace', letterSpacing: '-0.01em' }}>2.42 GB</div>
            <div style={{ fontSize: 12, color: '#10b981', marginTop: 2, fontWeight: 600 }}>↑ 12% vs ontem</div>
          </div>
          <div style={{ display: 'flex', padding: 3, background: dark ? '#1d2233' : '#f0f1f6', borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
            {['24h','7d','30d'].map((p, i) => (
              <button key={p} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: i === 0 ? t.surface : 'transparent', color: i === 0 ? t.text : t.text2, fontWeight: 600, fontSize: 11 }}>{p}</button>
            ))}
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: '100%', height: 180 }}>
          <defs>
            <linearGradient id="dl-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#5b6cff" stopOpacity="0.45"/><stop offset="100%" stopColor="#5b6cff" stopOpacity="0"/></linearGradient>
            <linearGradient id="ul-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35"/><stop offset="100%" stopColor="#22d3ee" stopOpacity="0"/></linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map(p => (
            <line key={p} x1="0" y1={H * p} x2={W} y2={H * p} stroke={t.grid} strokeWidth="1"/>
          ))}
          <path d={areaPath(downloadData)} fill="url(#dl-area)"/>
          <path d={path(downloadData)} stroke="#5b6cff" strokeWidth="2" fill="none" strokeLinejoin="round"/>
          <path d={areaPath(uploadData)} fill="url(#ul-area)"/>
          <path d={path(uploadData)} stroke="#22d3ee" strokeWidth="2" fill="none" strokeLinejoin="round"/>
          <circle cx={(18 / 23) * W} cy={H - (186 / max) * H} r="5" fill="#5b6cff" stroke={t.surface} strokeWidth="2"/>
          <line x1={(18 / 23) * W} y1="0" x2={(18 / 23) * W} y2={H} stroke={t.text3} strokeDasharray="3 3" strokeWidth="1" opacity="0.5"/>
          {[0,6,12,18,23].map(h => (
            <text key={h} x={(h/23)*W} y={H + 18} fontSize="10" fill={t.text3} textAnchor="middle" fontFamily="ui-monospace,monospace">{String(h).padStart(2,'0')}h</text>
          ))}
        </svg>

        <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: '#5b6cff' }}/>
            <span style={{ color: t.text2 }}>Download</span>
            <span style={{ fontWeight: 700, fontFamily: 'ui-monospace,monospace' }}>1.84 GB</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: '#22d3ee' }}/>
            <span style={{ color: t.text2 }}>Upload</span>
            <span style={{ fontWeight: 700, fontFamily: 'ui-monospace,monospace' }}>584 MB</span>
          </div>
        </div>
      </div>
    );
  };

  // V2 — Bar chart por hora, vertical
  const ChartBars = ({ dark }) => {
    const t = Token({ dark });
    const max = 200;
    return (
      <div style={{ padding: 22, background: t.surface, borderRadius: 20, border: `1px solid ${t.border}`, color: t.text }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Consumo por hora</div>
            <div style={{ fontSize: 12, color: t.text2 }}>Hoje · até agora</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'ui-monospace,monospace' }}>2.42<span style={{ fontSize: 12, color: t.text2, fontWeight: 500, marginLeft: 4 }}>GB</span></div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140, paddingBottom: 4, borderBottom: `1px solid ${t.grid}` }}>
          {downloadData.map((dl, i) => {
            const ul = uploadData[i];
            const isPeak = i === 18;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, position: 'relative' }}>
                {isPeak && <div style={{ position: 'absolute', top: -16, fontSize: 9, color: t.text2, fontFamily: 'ui-monospace,monospace', whiteSpace: 'nowrap' }}>pico 186</div>}
                <div style={{ width: '100%', height: (dl / max) * 100 + '%', background: isPeak ? 'linear-gradient(180deg,#fb923c,#ea580c)' : 'linear-gradient(180deg,#5b6cff,#3a48cf)', borderRadius: '4px 4px 0 0', minHeight: 2 }}/>
                <div style={{ width: '100%', height: (ul / max) * 30 + '%', background: '#22d3ee', borderRadius: '0 0 2px 2px', minHeight: 1, opacity: 0.6 }}/>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: t.text3, fontFamily: 'ui-monospace,monospace' }}>
          <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.grid}` }}>
          <div style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: dark ? 'rgba(91,108,255,0.12)' : '#eef0ff' }}>
            <div style={{ fontSize: 10, color: '#5b6cff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Download</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'ui-monospace,monospace' }}>1.84 GB</div>
          </div>
          <div style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: dark ? 'rgba(34,211,238,0.12)' : '#e0f7fa' }}>
            <div style={{ fontSize: 10, color: '#0891b2', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Upload</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'ui-monospace,monospace' }}>584 MB</div>
          </div>
          <div style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: dark ? 'rgba(249,115,22,0.12)' : '#fff0e0' }}>
            <div style={{ fontSize: 10, color: '#ea580c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pico</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'ui-monospace,monospace' }}>186 Mbps</div>
          </div>
        </div>
      </div>
    );
  };

  // V3 — Radial gauge + 24h ring + breakdown
  const ChartRadial = ({ dark }) => {
    const t = Token({ dark });
    const used = 2.42;
    const limit = 8.0;
    const pct = used / limit;
    const r = 64;
    const C = 2 * Math.PI * r;

    return (
      <div style={{ padding: 22, background: t.surface, borderRadius: 20, border: `1px solid ${t.border}`, color: t.text }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Consumo do dia</div>
            <div style={{ fontSize: 12, color: t.text2 }}>Plano ilimitado</div>
          </div>
          <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 12, background: '#10b9811a', color: '#10b981', fontWeight: 700 }}>● ao vivo</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: 8 }}>
          <svg width="180" height="180" viewBox="-90 -90 180 180" style={{ transform: 'rotate(-90deg)' }}>
            <defs>
              <linearGradient id="rad-grad" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#a78bfa"/><stop offset="50%" stopColor="#5b6cff"/><stop offset="100%" stopColor="#22d3ee"/></linearGradient>
            </defs>
            <circle r={r} fill="none" stroke={t.grid} strokeWidth="14"/>
            <circle r={r} fill="none" stroke="url(#rad-grad)" strokeWidth="14" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)}/>
            {downloadData.map((v, i) => {
              const angle = (i / 24) * 360;
              const rad = (angle * Math.PI) / 180;
              const inner = 38;
              const len = 4 + (v / 200) * 14;
              return (
                <line key={i}
                  x1={Math.cos(rad) * inner}
                  y1={Math.sin(rad) * inner}
                  x2={Math.cos(rad) * (inner + len)}
                  y2={Math.sin(rad) * (inner + len)}
                  stroke={i < 16 ? '#5b6cff' : '#a78bfa'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity={0.8}
                />
              );
            })}
          </svg>
          <div style={{ position: 'absolute', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: t.text2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Usado</div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'ui-monospace,monospace', letterSpacing: '-0.02em' }}>{used.toFixed(2)}</div>
            <div style={{ fontSize: 10, color: t.text3, fontFamily: 'ui-monospace,monospace' }}>de {limit.toFixed(0)} GB hoje</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 18 }}>
          {[
            ['Streaming','42%','#a78bfa','1.02 GB'],
            ['Navegação','31%','#5b6cff','754 MB'],
            ['Outros','27%','#22d3ee','658 MB'],
          ].map((r,i) => (
            <div key={i} style={{ padding: '10px 8px', borderRadius: 10, background: dark ? 'rgba(255,255,255,0.03)' : '#f9fafb', textAlign: 'center' }}>
              <div style={{ width: 24, height: 4, borderRadius: 2, background: r[2], margin: '0 auto 6px' }}/>
              <div style={{ fontSize: 10, color: t.text2, fontWeight: 600 }}>{r[0]}</div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'ui-monospace,monospace' }}>{r[1]}</div>
              <div style={{ fontSize: 9, color: t.text3, fontFamily: 'ui-monospace,monospace' }}>{r[3]}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return { ChartArea, ChartBars, ChartRadial };
})();

window.NetCharts = NetCharts;
