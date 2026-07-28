'use client';

import { useEffect, useId, useRef, useState } from 'react';

// Gráfico de consumo de rede — portado de docs/prototipo/src/charts.jsx.
// Três variações (área, barras, anel), uma por layout do portal, e o seletor
// de período do protótipo: hoje, 7 dias e 30 dias.
//
// A home entrega os 7 dias já renderizados; os outros períodos são buscados
// em /api/portal/consumo quando o assinante troca, e ficam em cache aqui.
// Sem dado do ERP o componente cai num estado vazio honesto — nada de
// inventar número de tráfego para o cliente final.

import { Icon } from './icons';
import type { ErpUsagePoint, ErpUsageRange } from '@/lib/erp/types';
import type { PortalTokens } from './tokens';
import { rgba } from './tokens';

export interface NetSeries {
  /** Um ponto por intervalo (hora ou dia), em GB. */
  download: number[];
  upload: number[];
  /** Rótulo de cada ponto, ex.: "26/07" ou "14h". */
  labels?: string[];
  totalDownloadGb?: number;
  totalUploadGb?: number;
}

/** Converte o consumo do ERP (bytes por intervalo) na série do gráfico. */
export function usageToSeries(usage?: ErpUsagePoint[] | null): NetSeries | null {
  if (!usage || usage.length === 0) return null;
  const gb = (b: number) => b / 1_000_000_000;
  const download = usage.map((u) => gb(u.downloadBytes));
  const upload = usage.map((u) => gb(u.uploadBytes));
  if (download.every((v) => v === 0) && upload.every((v) => v === 0)) return null;
  return {
    download,
    upload,
    labels: usage.map((u) => u.label ?? `${u.date.slice(8, 10)}/${u.date.slice(5, 7)}`),
    totalDownloadGb: download.reduce((a, b) => a + b, 0),
    totalUploadGb: upload.reduce((a, b) => a + b, 0),
  };
}

const RANGES: { key: ErpUsageRange; label: string; period: string; grain: string }[] = [
  { key: 'today', label: 'Hoje', period: 'hoje', grain: 'por hora' },
  { key: '7d', label: '7 dias', period: 'nos últimos 7 dias', grain: 'diária' },
  { key: '30d', label: '30 dias', period: 'nos últimos 30 dias', grain: 'diária' },
];

export function NetChart({
  t,
  series,
  height = 200,
  fill = false,
}: {
  t: PortalTokens;
  /** Série do período padrão (7 dias), renderizada no servidor. */
  series?: NetSeries | null;
  /** Altura mínima da área de plotagem. O desktop pede um gráfico mais alto. */
  height?: number;
  /** Estica o gráfico até a altura do card — usado no painel web. */
  fill?: boolean;
}) {
  const [range, setRange] = useState<ErpUsageRange>('7d');
  const [cache, setCache] = useState<Partial<Record<ErpUsageRange, NetSeries | null>>>(() => ({
    '7d': series ?? null,
  }));
  const [loading, setLoading] = useState<ErpUsageRange | null>(null);
  const [failed, setFailed] = useState<ErpUsageRange | null>(null);

  async function load(next: ErpUsageRange) {
    setLoading(next);
    setFailed(null);
    try {
      const res = await fetch(`/api/portal/consumo?range=${next}`);
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { usage?: ErpUsagePoint[] };
      setCache((prev) => ({ ...prev, [next]: usageToSeries(body.usage) }));
    } catch {
      setFailed(next);
    } finally {
      setLoading((prev) => (prev === next ? null : prev));
    }
  }

  function choose(next: ErpUsageRange) {
    setRange(next);
    if (!(next in cache) && loading !== next) void load(next);
  }

  const meta = RANGES.find((r) => r.key === range) ?? RANGES[1]!;
  const current = cache[range] ?? null;
  const busy = loading === range;
  const broke = failed === range;

  const subtitle = current
    ? `${formatVolume(current.totalDownloadGb ?? 0)} ${meta.period}`
    : busy
      ? 'Carregando…'
      : broke
        ? 'Não foi possível carregar agora'
        : `Sem registro de consumo ${meta.period}`;

  return (
    <Shell t={t} fill={fill}>
      <Header
        t={t}
        title="Consumo de rede"
        subtitle={subtitle}
        action={<RangeTabs t={t} value={range} onChange={choose} busy={loading} />}
      />

      {!current ? (
        <Placeholder t={t} height={height} fill={fill}>
          {busy ? (
            <span style={{ fontSize: 12, color: t.text2 }}>Carregando consumo…</span>
          ) : broke ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: t.text2, marginBottom: 8 }}>
                Não foi possível carregar esse período.
              </div>
              <button
                type="button"
                onClick={() => void load(range)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: `1px solid ${t.border}`,
                  background: 'transparent',
                  color: t.text,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Tentar de novo
              </button>
            </div>
          ) : (
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
                  flexShrink: 0,
                }}
              >
                <Icon name="stats" size={18} />
              </div>
              <div style={{ fontSize: 12, color: t.text2 }}>
                Sem registro de consumo {meta.period}.
              </div>
            </div>
          )}
        </Placeholder>
      ) : (
        <>
          {t.layout === 'v2' ? (
            <ChartBars t={t} series={current} height={height} fill={fill} />
          ) : t.layout === 'v3' ? (
            <ChartRadial t={t} series={current} range={range} />
          ) : (
            <ChartArea t={t} series={current} height={height} fill={fill} />
          )}
          {t.layout !== 'v3' && (
            <>
              <Legend t={t} series={current} />
              <UsageFootnote t={t} grain={meta.grain} />
            </>
          )}
        </>
      )}
    </Shell>
  );
}

/** Segmentado de período, como no cabeçalho do gráfico do protótipo. */
function RangeTabs({
  t,
  value,
  onChange,
  busy,
}: {
  t: PortalTokens;
  value: ErpUsageRange;
  onChange: (next: ErpUsageRange) => void;
  busy: ErpUsageRange | null;
}) {
  return (
    <div
      role="group"
      aria-label="Período do consumo"
      style={{ display: 'flex', padding: 3, background: t.surface2, borderRadius: 9, flexShrink: 0 }}
    >
      {RANGES.map((r) => {
        const active = r.key === value;
        return (
          <button
            key={r.key}
            type="button"
            onClick={() => onChange(r.key)}
            aria-pressed={active}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: 'none',
              background: active ? t.surfaceSolid : 'transparent',
              color: active ? t.text : t.text2,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              opacity: busy === r.key ? 0.6 : 1,
            }}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

/** Caixa do tamanho do gráfico, para o card não pular ao trocar de período. */
function Placeholder({
  t,
  height,
  fill,
  children,
}: {
  t: PortalTokens;
  height: number;
  fill?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: height,
        borderRadius: t.radiusSm,
        background: rgba(t.text3, 0.05),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        ...(fill ? { flex: '1 1 auto' } : null),
      }}
    >
      {children}
    </div>
  );
}

/**
 * Tamanho real da caixa do gráfico. O desenho é feito em pixels, não escalado
 * pelo viewBox: escalar deformava o traço e, quando a proporção do viewBox não
 * batia com a do card, sobrava faixa vazia dos dois lados no desktop.
 */
function useChartBox() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      // Só reage a mudança real: escrever o mesmo tamanho realimentaria o
      // observer e o gráfico ficaria redesenhando sozinho.
      setBox((prev) =>
        Math.abs(prev.width - rect.width) < 0.5 && Math.abs(prev.height - rect.height) < 0.5
          ? prev
          : { width: rect.width, height: rect.height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, ...box };
}

/**
 * Escala do eixo y: teto redondo com folga acima do pico (era isso que
 * faltava — com o teto colado no pico a crista da onda saía cortada) e um
 * número de divisões que caia em valores redondos, não em 13/25/38.
 */
function axisScale(peak: number) {
  const max = niceCeil(peak * 1.12);
  const divisions = [4, 5].find((n) => isRoundStep(max / n)) ?? 4;
  return { max, divisions };
}

function niceCeil(value: number) {
  if (!(value > 0)) return 1;
  const base = Math.pow(10, Math.floor(Math.log10(value)));
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => value / base <= s) ?? 10;
  return step * base;
}

function isRoundStep(step: number) {
  const mantissa = step / Math.pow(10, Math.floor(Math.log10(step)));
  return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8].some((v) => Math.abs(v - mantissa) < 1e-6);
}

/** Rótulo do eixo sem zeros à toa: 10, 12.5, 0.3. */
function axisLabel(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Unidade do eixo. Uma hora de navegação rende megabytes e um mês rende
 * terabytes — plotar tudo em GB deixaria o eixo do período "hoje" em
 * 0.05 / 0.1 / 0.15, que não diz nada para o assinante.
 */
function scaleFor(peakGb: number) {
  if (peakGb >= 1000) return { factor: 1 / 1000, unit: 'TB' };
  if (peakGb >= 1) return { factor: 1, unit: 'GB' };
  if (peakGb >= 0.001) return { factor: 1000, unit: 'MB' };
  return { factor: 1_000_000, unit: 'KB' };
}

/** Volume para leitura humana, sempre na unidade que rende número curto. */
export function formatVolume(gb: number) {
  const { factor, unit } = scaleFor(gb);
  const value = gb * factor;
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

/** Um ponto só não desenha área; repete para virar um segmento reto. */
function expand<T>(values: T[]): T[] {
  return values.length > 1 ? values : [values[0], values[0]];
}

/** Quais rótulos cabem no eixo x sem se encavalarem. */
function labelIndexes(n: number, plotWidth: number) {
  const fits = Math.max(2, Math.floor(plotWidth / 52));
  const step = Math.max(1, Math.ceil((n - 1) / (fits - 1)));
  const out: number[] = [];
  for (let i = 0; i < n; i += step) out.push(i);
  // O último ponto sempre aparece. Se ele cair perto demais do rótulo
  // anterior, toma o lugar dele em vez de se empilhar em cima — era o que
  // deixava "25/0727/07" no fim do período de 30 dias.
  const last = out[out.length - 1]!;
  if (last !== n - 1) {
    if (n - 1 - last < step) out[out.length - 1] = n - 1;
    else out.push(n - 1);
  }
  return out;
}

const round = (v: number) => Math.round(v * 10) / 10;

/** Respiro em volta da plotagem: rótulos do eixo y à esquerda, datas embaixo. */
const PAD = { top: 16, right: 12, bottom: 30, left: 46 };

function Shell({ t, children, fill }: { t: PortalTokens; children: React.ReactNode; fill?: boolean }) {
  return (
    <div
      style={{
        padding: 20,
        background: t.surface,
        borderRadius: t.radius,
        border: `1px solid ${t.border}`,
        color: t.text,
        ...(fill ? { height: '100%', display: 'flex', flexDirection: 'column' } : null),
      }}
    >
      {children}
    </div>
  );
}

function Header({
  t,
  title,
  subtitle,
  action,
}: {
  t: PortalTokens;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
        flexWrap: 'wrap',
        marginBottom: 14,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: t.text2, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: t.text2, marginTop: 4 }}>{subtitle}</div>
      </div>
      {action}
    </div>
  );
}

function ChartArea({
  t,
  series,
  height,
  fill,
}: {
  t: PortalTokens;
  series: NetSeries;
  height: number;
  fill?: boolean;
}) {
  // A home renderiza a versão mobile e a web ao mesmo tempo (uma escondida
  // por CSS). Com id fixo, os dois gráficos disputavam o mesmo gradiente e um
  // deles saía sem preenchimento.
  const uid = useId().replace(/:/g, '');
  const { ref, width, height: boxHeight } = useChartBox();

  const { factor, unit } = scaleFor(Math.max(...series.download, ...series.upload, 0));
  const download = expand(series.download).map((v) => v * factor);
  const upload = expand(series.upload).map((v) => v * factor);
  const labels =
    series.labels && series.labels.length === series.download.length ? expand(series.labels) : null;

  // Antes da primeira medição (render do servidor, ou card ainda escondido
  // pelo media query) desenhamos numa largura plausível; o ResizeObserver
  // ajusta assim que o card ganha caixa.
  const W = Math.max(Math.round(width) || 560, 220);
  // Com `fill`, a caixa recebe a altura do card pelo flex e o desenho segue
  // ela; sem `fill`, a altura é a do prop e a caixa apenas acompanha.
  const H = fill ? Math.max(Math.round(boxHeight) || height, height) : height;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const baseline = PAD.top + plotH;

  const { max, divisions } = axisScale(Math.max(...download, ...upload, 0));
  const n = download.length;
  const x = (i: number) => PAD.left + (i / (n - 1)) * plotW;
  const y = (v: number) => baseline - (v / max) * plotH;
  const line = (data: number[]) =>
    'M ' + data.map((v, i) => `${round(x(i))},${round(y(v))}`).join(' L ');
  const area = (data: number[]) =>
    `${line(data)} L ${round(x(n - 1))},${baseline} L ${round(x(0))},${baseline} Z`;

  const peakIndex = download.indexOf(Math.max(...download));
  const ticks = Array.from({ length: divisions + 1 }, (_, i) => (max * i) / divisions);

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        ...(fill ? { flex: '1 1 auto', minHeight: height, overflow: 'hidden' } : null),
      }}
    >
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', maxWidth: '100%' }}
        role="img"
        aria-label={`Consumo de rede: ${formatVolume(series.totalDownloadGb ?? 0)} de download e ${formatVolume(series.totalUploadGb ?? 0)} de upload`}
      >
        <defs>
          <linearGradient id={`dl-${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={t.accent} stopOpacity="0.45" />
            <stop offset="100%" stopColor={t.accent} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`ul-${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={t.accent2} stopOpacity="0.35" />
            <stop offset="100%" stopColor={t.accent2} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((value, i) => (
          <g key={value}>
            <line
              x1={PAD.left}
              y1={round(y(value))}
              x2={W - PAD.right}
              y2={round(y(value))}
              stroke={t.borderSoft}
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={round(y(value)) + 3}
              fontSize="9"
              fill={t.text3}
              textAnchor="end"
              fontFamily={t.mono}
            >
              {/* A unidade fica só no topo do eixo — repetir em toda linha
                  polui, e sem ela o número não diz se é MB, GB ou TB. */}
              {i === ticks.length - 1 ? `${axisLabel(value)} ${unit}` : axisLabel(value)}
            </text>
          </g>
        ))}

        <path d={area(download)} fill={`url(#dl-${uid})`} />
        <path
          d={line(download)}
          stroke={t.accent}
          strokeWidth="2.5"
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path d={area(upload)} fill={`url(#ul-${uid})`} />
        <path
          d={line(upload)}
          stroke={t.accent2}
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <line
          x1={round(x(peakIndex))}
          y1={round(y(download[peakIndex]!))}
          x2={round(x(peakIndex))}
          y2={baseline}
          stroke={t.text3}
          strokeDasharray="3 3"
          strokeWidth="1"
          opacity="0.45"
        />
        {n <= 14 &&
          download.map((v, i) => (
            <circle
              key={i}
              cx={round(x(i))}
              cy={round(y(v))}
              r={i === peakIndex ? 4.5 : 3}
              fill={t.accent}
              stroke={t.surfaceSolid}
              strokeWidth="2"
            />
          ))}

        {labels &&
          labelIndexes(n, plotW).map((i) => (
            <text
              key={i}
              x={round(x(i))}
              y={H - 10}
              fontSize="10"
              fill={t.text3}
              textAnchor={i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle'}
              fontFamily={t.mono}
            >
              {labels[i]}
            </text>
          ))}
      </svg>
    </div>
  );
}

function ChartBars({
  t,
  series,
  height,
  fill,
}: {
  t: PortalTokens;
  series: NetSeries;
  height: number;
  fill?: boolean;
}) {
  const max = Math.max(...series.download, 1);
  const peakIndex = series.download.indexOf(max);
  // Reserva o rodapé para os rótulos, como no gráfico de área.
  const barsHeight = Math.max(120, height - 46);

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: series.download.length > 14 ? 1 : 3,
          height: barsHeight,
          paddingBottom: 4,
          borderBottom: `1px solid ${t.borderSoft}`,
          ...(fill ? { flex: '1 1 auto', minHeight: barsHeight, height: 'auto' } : null),
        }}
      >
        {series.download.map((dl, i) => {
          const ul = series.upload[i] ?? 0;
          const isPeak = i === peakIndex;
          return (
            // height:100% dá altura definida à coluna. Sem isso a barra, que
            // é medida em porcentagem, não tinha contra o que calcular e
            // colapsava no minHeight — o gráfico de barras saía vazio.
            <div
              key={i}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 1,
              }}
            >
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
        <span>{series.labels?.[0]}</span>
        <span>{series.labels?.[series.labels.length - 1]}</span>
      </div>
    </>
  );
}

function ChartRadial({ t, series, range }: { t: PortalTokens; series: NetSeries; range: ErpUsageRange }) {
  const uid = useId().replace(/:/g, '');
  const used = series.totalDownloadGb ?? 0;
  const limit = Math.max(used * 1.6, 0.001);
  const pct = used / limit;
  const r = 64;
  const C = 2 * Math.PI * r;
  const max = Math.max(...series.download, 1);
  const legend = range === 'today' ? 'consumidos hoje' : range === '30d' ? 'em 30 dias' : 'em 7 dias';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: 8 }}>
      <svg
        viewBox="-90 -90 180 180"
        style={{ width: '100%', maxWidth: 180, height: 'auto', transform: 'rotate(-90deg)' }}
      >
        <defs>
          <linearGradient id={`rad-${uid}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={t.accent} />
            <stop offset="100%" stopColor={t.accent2} />
          </linearGradient>
        </defs>
        <circle r={r} fill="none" stroke={t.borderSoft} strokeWidth="14" />
        <circle
          r={r}
          fill="none"
          stroke={`url(#rad-${uid})`}
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
        <div style={{ fontSize: 24, fontWeight: 800, fontFamily: t.mono, letterSpacing: '-0.02em' }}>
          {formatVolume(used)}
        </div>
        <div style={{ fontSize: 10, color: t.text3 }}>{legend}</div>
      </div>
    </div>
  );
}

function Legend({ t, series }: { t: PortalTokens; series: NetSeries }) {
  return (
    <div style={{ display: 'flex', gap: 18, marginTop: 10, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: t.accent }} />
        <span style={{ color: t.text2 }}>Download</span>
        {series.totalDownloadGb != null && (
          <span style={{ fontWeight: 700, fontFamily: t.mono }}>{formatVolume(series.totalDownloadGb)}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: t.accent2 }} />
        <span style={{ color: t.text2 }}>Upload</span>
        {series.totalUploadGb != null && (
          <span style={{ fontWeight: 700, fontFamily: t.mono }}>{formatVolume(series.totalUploadGb)}</span>
        )}
      </div>
    </div>
  );
}

/** O total é exato; a divisão por intervalo é estimada. A central diz isso. */
export function UsageFootnote({ t, grain = 'diária' }: { t: PortalTokens; grain?: string }) {
  return (
    <div style={{ fontSize: 10, color: t.text3, marginTop: 8, lineHeight: 1.4 }}>
      Distribuição {grain} estimada a partir das sessões de conexão.
    </div>
  );
}

export { rgba };
