'use client';

// Gráfico de consumo de rede — portado de docs/prototipo/src/charts.jsx.
// Três variações (área, barras, anel), uma por layout do portal.
//
// Os adapters de ERP ainda não expõem consumo, então o componente recebe a
// série por prop e cai num estado vazio honesto quando não há dado. Nada de
// inventar números de tráfego para o cliente final.

import { Icon } from './icons';
import type { PortalTokens } from './tokens';
import { rgba } from './tokens';

export interface NetSeries {
  /** 24 pontos de download, em Mbps. */
  download: number[];
  /** 24 pontos de upload, em Mbps. */
  upload: number[];
  totalDownloadGb?: number;
  totalUploadGb?: number;
}

export function NetChart({ t, series }: { t: PortalTokens; series?: NetSeries | null }) {
  if (!series || series.download.length === 0) {
    return <EmptyChart t={t} />;
  }
  if (t.layout === 'v2') return <ChartBars t={t} series={series} />;
  if (t.layout === 'v3') return <ChartRadial t={t} series={series} />;
  return <ChartArea t={t} series={series} />;
}

function Shell({ t, children }: { t: PortalTokens; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 20,
        background: t.surface,
        borderRadius: t.radius,
        border: `1px solid ${t.border}`,
        color: t.text,
      }}
    >
      {children}
    </div>
  );
}

function Header({ t, title, subtitle }: { t: PortalTokens; title: string; subtitle: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 11, color: t.text2, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: t.text2, marginTop: 4 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function EmptyChart({ t }: { t: PortalTokens }) {
  return (
    <Shell t={t}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: t.accentSoft,
            color: t.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="stats" size={18} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Consumo de rede</div>
          <div style={{ fontSize: 12, color: t.text2, marginTop: 2 }}>
            Ainda sem dados — seu provedor não envia consumo por enquanto.
          </div>
        </div>
      </div>
    </Shell>
  );
}

function ChartArea({ t, series }: { t: PortalTokens; series: NetSeries }) {
  const W = 300;
  const H = 140;
  const max = Math.max(...series.download, ...series.upload, 1);
  const line = (data: number[]) =>
    'M ' + data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * H}`).join(' L ');
  const area = (data: number[]) => `${line(data)} L ${W},${H} L 0,${H} Z`;
  const peak = Math.max(...series.download);

  return (
    <Shell t={t}>
      <Header t={t} title="Consumo de hoje" subtitle={`Pico de ${peak} Mbps`} />
      <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: '100%', height: 180 }}>
        <defs>
          <linearGradient id="dl-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={t.accent} stopOpacity="0.45" />
            <stop offset="100%" stopColor={t.accent} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ul-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={t.accent2} stopOpacity="0.35" />
            <stop offset="100%" stopColor={t.accent2} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((pct) => (
          <line key={pct} x1="0" y1={H * pct} x2={W} y2={H * pct} stroke={t.borderSoft} strokeWidth="1" />
        ))}
        <path d={area(series.download)} fill="url(#dl-area)" />
        <path d={line(series.download)} stroke={t.accent} strokeWidth="2" fill="none" strokeLinejoin="round" />
        <path d={area(series.upload)} fill="url(#ul-area)" />
        <path d={line(series.upload)} stroke={t.accent2} strokeWidth="2" fill="none" strokeLinejoin="round" />
        {[0, 6, 12, 18, 23].map((h) => (
          <text
            key={h}
            x={(h / 23) * W}
            y={H + 18}
            fontSize="10"
            fill={t.text3}
            textAnchor="middle"
            fontFamily={t.mono}
          >
            {String(h).padStart(2, '0')}h
          </text>
        ))}
      </svg>
      <Legend t={t} series={series} />
    </Shell>
  );
}

function ChartBars({ t, series }: { t: PortalTokens; series: NetSeries }) {
  const max = Math.max(...series.download, 1);
  const peakIndex = series.download.indexOf(max);

  return (
    <Shell t={t}>
      <Header t={t} title="Consumo por hora" subtitle="Hoje · até agora" />
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 3,
          height: 140,
          paddingBottom: 4,
          borderBottom: `1px solid ${t.borderSoft}`,
        }}
      >
        {series.download.map((dl, i) => {
          const ul = series.upload[i] ?? 0;
          const isPeak = i === peakIndex;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <div
                style={{
                  width: '100%',
                  height: `${(dl / max) * 100}%`,
                  background: isPeak ? t.accentGrad : t.accent,
                  borderRadius: '4px 4px 0 0',
                  minHeight: 2,
                }}
              />
              <div
                style={{
                  width: '100%',
                  height: `${(ul / max) * 30}%`,
                  background: t.accent2,
                  borderRadius: '0 0 2px 2px',
                  minHeight: 1,
                  opacity: 0.6,
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: t.text3, fontFamily: t.mono }}>
        <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
      </div>
      <Legend t={t} series={series} />
    </Shell>
  );
}

function ChartRadial({ t, series }: { t: PortalTokens; series: NetSeries }) {
  const used = series.totalDownloadGb ?? 0;
  const limit = Math.max(used * 1.6, 1);
  const pct = used / limit;
  const r = 64;
  const C = 2 * Math.PI * r;
  const max = Math.max(...series.download, 1);

  return (
    <Shell t={t}>
      <Header t={t} title="Consumo do dia" subtitle="Plano ilimitado" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: 8 }}>
        <svg width="180" height="180" viewBox="-90 -90 180 180" style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="rad-grad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor={t.accent} />
              <stop offset="100%" stopColor={t.accent2} />
            </linearGradient>
          </defs>
          <circle r={r} fill="none" stroke={t.borderSoft} strokeWidth="14" />
          <circle
            r={r}
            fill="none"
            stroke="url(#rad-grad)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
          />
          {series.download.map((v, i) => {
            const rad = ((i / series.download.length) * 360 * Math.PI) / 180;
            const inner = 38;
            const len = 4 + (v / max) * 14;
            return (
              <line
                key={i}
                x1={Math.cos(rad) * inner}
                y1={Math.sin(rad) * inner}
                x2={Math.cos(rad) * (inner + len)}
                y2={Math.sin(rad) * (inner + len)}
                stroke={t.accent}
                strokeWidth="2"
                strokeLinecap="round"
                opacity={0.8}
              />
            );
          })}
        </svg>
        <div style={{ position: 'absolute', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: t.text2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Usado
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: t.mono, letterSpacing: '-0.02em' }}>
            {used.toFixed(2)}
          </div>
          <div style={{ fontSize: 10, color: t.text3, fontFamily: t.mono }}>GB hoje</div>
        </div>
      </div>
    </Shell>
  );
}

function Legend({ t, series }: { t: PortalTokens; series: NetSeries }) {
  return (
    <div style={{ display: 'flex', gap: 18, marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: t.accent }} />
        <span style={{ color: t.text2 }}>Download</span>
        {series.totalDownloadGb != null && (
          <span style={{ fontWeight: 700, fontFamily: t.mono }}>{series.totalDownloadGb.toFixed(2)} GB</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: t.accent2 }} />
        <span style={{ color: t.text2 }}>Upload</span>
        {series.totalUploadGb != null && (
          <span style={{ fontWeight: 700, fontFamily: t.mono }}>{series.totalUploadGb.toFixed(2)} GB</span>
        )}
      </div>
    </div>
  );
}

export { rgba };
