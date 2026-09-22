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
//
// O gráfico se lê: apontar com o mouse, o dedo ou as setas do teclado abre a
// leitura do intervalo — quanto cada série gastou naquele dia ou naquela
// hora. Sem isso, a única coisa que a tela respondia era a forma da curva, e
// a pergunta que o assinante faz é "quanto eu gastei na terça?".

import { Icon } from './icons';
import { usePortalRuntime } from './runtime';
import type { ErpUsagePoint, ErpUsageRange } from '@/lib/erp/types';
import type { PortalTokens } from './tokens';
import { rgba } from './tokens';
import { hexToRgbTriplet } from '@/lib/tenant/theme';

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

const RANGES: {
  key: ErpUsageRange;
  label: string;
  period: string;
  grain: string;
  /** Como o resumo chama o maior intervalo do período. */
  pico: string;
}[] = [
  { key: 'today', label: 'Hoje', period: 'hoje', grain: 'por hora', pico: 'Maior hora' },
  { key: '7d', label: '7 dias', period: 'nos últimos 7 dias', grain: 'diária', pico: 'Maior dia' },
  { key: '30d', label: '30 dias', period: 'nos últimos 30 dias', grain: 'diária', pico: 'Maior dia' },
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
  // Na demonstração o consumo vem de /api/demo, que devolve a mesma forma de
  // dado sem pedir sessão nem consultar ERP nenhum.
  const { demo } = usePortalRuntime();
  const origem = demo ? '/api/demo/consumo' : '/api/portal/consumo';
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
      const res = await fetch(`${origem}?range=${next}`);
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

  // O último período que chegou a desenhar.
  //
  // Enquanto o novo não chega, o card segue mostrando este, esmaecido, em vez
  // de esvaziar: trocar o gráfico por uma caixa de "carregando" fazia a home
  // inteira pular de altura a cada clique no seletor de período.
  const ultimo = useRef<NetSeries | null>(series ?? null);
  useEffect(() => {
    if (current) ultimo.current = current;
  }, [current]);
  const exibido = current ?? (busy ? ultimo.current : null);
  const esmaecido = !current && exibido != null;

  const subtitle = current
    ? `${formatVolume(current.totalDownloadGb ?? 0)} de download ${meta.period}`
    : busy
      ? 'Carregando…'
      : broke
        ? 'Não foi possível carregar agora'
        : `Sem registro de consumo ${meta.period}`;

  const cores = seriesColors(t);

  return (
    <Shell t={t} fill={fill}>
      <Header
        t={t}
        title="Consumo de rede"
        subtitle={subtitle}
        action={<RangeTabs t={t} value={range} onChange={choose} busy={loading} />}
      />

      {!exibido ? (
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
        <div
          // `aria-busy` conta ao leitor de tela o que o esmaecido conta a quem
          // enxerga: o que está na tela ainda é o período anterior.
          aria-busy={esmaecido || undefined}
          style={{
            opacity: esmaecido ? 0.45 : 1,
            transition: 'opacity .18s ease',
            ...(fill
              ? { flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }
              : null),
          }}
        >
          <Resumo t={t} series={exibido} meta={meta} cores={cores} />

          {t.layout === 'v2' ? (
            <ChartBars t={t} series={exibido} height={height} fill={fill} cores={cores} meta={meta} />
          ) : t.layout === 'v3' ? (
            <ChartRadial t={t} series={exibido} range={range} cores={cores} />
          ) : (
            <ChartArea t={t} series={exibido} height={height} fill={fill} cores={cores} meta={meta} />
          )}

          <UsageFootnote t={t} grain={meta.grain} />
        </div>
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
 * As duas cores do gráfico.
 *
 * O download sai na cor da marca do provedor — é o número que o assinante
 * abriu a tela para ver. O upload só sai na cor de destaque quando as duas
 * são distinguíveis de verdade: marca e destaque, na maioria dos cadastros,
 * são vizinhas do mesmo tom (um índigo e um índigo mais claro), e duas curvas
 * assim viram uma mancha só — para todo mundo, e mais ainda para quem tem
 * daltonismo. Quando é esse o caso, o upload cai num cinza-azulado neutro.
 * Série secundária em cinza ao lado da série da marca é leitura resolvida;
 * duas séries na mesma cor é gráfico que não se lê.
 */
function seriesColors(t: PortalTokens) {
  const neutro = t.dark ? '#93a0bd' : '#78839c';
  return {
    download: t.accent,
    upload: distanciaOk(t.accent, t.accent2) ? t.accent2 : neutro,
  };
}

/** Distância perceptual mínima entre as duas séries, medida em OKLab. */
const SEPARACAO_MINIMA = 15;

function distanciaOk(a: string, b: string): boolean {
  const x = oklab(a);
  const y = oklab(b);
  // Cor que não dá para interpretar fica como está: o palpite seria pior.
  if (!x || !y) return true;
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) * 100 >= SEPARACAO_MINIMA;
}

function oklab(hex: string): [number, number, number] | null {
  if (typeof hex !== 'string' || !hex.trim().startsWith('#')) return null;
  const [r, g, b] = hexToRgbTriplet(hex)
    .split(' ')
    .map((v) => {
      const s = Number(v) / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    }) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

type Cores = ReturnType<typeof seriesColors>;
type RangeMeta = (typeof RANGES)[number];

/**
 * Resumo do período: os dois totais e o maior intervalo.
 *
 * Também é a legenda — cada total vem com o traço da cor da sua série, então
 * saber qual curva é qual nunca depende de adivinhar pelo desenho.
 */
function Resumo({
  t,
  series,
  meta,
  cores,
}: {
  t: PortalTokens;
  series: NetSeries;
  meta: RangeMeta;
  cores: Cores;
}) {
  const picoIndex = series.download.indexOf(Math.max(...series.download));
  const picoValor = series.download[picoIndex] ?? 0;
  const picoRotulo = series.labels?.[picoIndex];

  return (
    <div
      style={{
        display: 'flex',
        gap: 20,
        flexWrap: 'wrap',
        marginBottom: 14,
        paddingBottom: 12,
        borderBottom: `1px solid ${t.borderSoft}`,
      }}
    >
      <Numero
        t={t}
        chave={cores.download}
        rotulo="Download"
        valor={formatVolume(series.totalDownloadGb ?? 0)}
      />
      <Numero
        t={t}
        chave={cores.upload}
        rotulo="Upload"
        valor={formatVolume(series.totalUploadGb ?? 0)}
      />
      <Numero t={t} rotulo={meta.pico} valor={formatVolume(picoValor)} nota={picoRotulo} />
    </div>
  );
}

function Numero({
  t,
  chave,
  rotulo,
  valor,
  nota,
}: {
  t: PortalTokens;
  /** Cor da série, quando este número é uma delas. */
  chave?: string;
  rotulo: string;
  valor: string;
  nota?: string;
}) {
  return (
    <div style={{ minWidth: 76 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        {chave && (
          <span
            aria-hidden
            style={{ width: 12, height: 3, borderRadius: 2, background: chave, flex: 'none' }}
          />
        )}
        <span style={{ fontSize: 11, color: t.text2, fontWeight: 600 }}>{rotulo}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{ fontSize: 15, fontWeight: 700, fontFamily: t.mono, letterSpacing: '-0.01em' }}>
          {valor}
        </span>
        {nota && <span style={{ fontSize: 10, color: t.text3, fontFamily: t.mono }}>{nota}</span>}
      </div>
    </div>
  );
}

/**
 * Leitura do intervalo apontado.
 *
 * Fica presa dentro da caixa do gráfico e fora do caminho do dedo: sobe acima
 * do ponto quando há espaço, desce quando o ponto está colado no topo.
 */
function Leitura({
  t,
  x,
  topo,
  largura,
  titulo,
  linhas,
}: {
  t: PortalTokens;
  /** Centro horizontal do ponto, em pixels da caixa. */
  x: number;
  /** Altura do ponto mais alto do intervalo. */
  topo: number;
  largura: number;
  titulo: string;
  linhas: { rotulo: string; valor: string; cor: string }[];
}) {
  const acima = topo > 70;
  const meio = 74;
  return (
    <div
      role="status"
      style={{
        position: 'absolute',
        left: Math.min(Math.max(x, meio), Math.max(largura - meio, meio)),
        top: acima ? topo - 12 : topo + 20,
        transform: acima ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
        pointerEvents: 'none',
        zIndex: 3,
        minWidth: 132,
        padding: '8px 10px',
        borderRadius: 10,
        background: t.surfaceSolid,
        border: `1px solid ${t.border}`,
        boxShadow: `0 12px 26px -14px ${rgba(t.dark ? '#000000' : '#0d0f17', 0.7)}`,
      }}
    >
      <div style={{ fontSize: 10, color: t.text3, fontWeight: 600, letterSpacing: '0.04em' }}>
        {titulo}
      </div>
      {linhas.map((linha) => (
        <div
          key={linha.rotulo}
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, marginTop: 4 }}
        >
          <span
            aria-hidden
            style={{ width: 10, height: 2.5, borderRadius: 2, background: linha.cor, flex: 'none' }}
          />
          <span style={{ color: t.text2 }}>{linha.rotulo}</span>
          <span
            style={{
              marginLeft: 'auto',
              fontWeight: 700,
              fontFamily: t.mono,
              color: t.text,
              whiteSpace: 'nowrap',
            }}
          >
            {linha.valor}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * O intervalo apontado, com teclado junto.
 *
 * O mesmo par de mãos serve os três gráficos: quem aponta com o mouse ou com
 * o dedo recebe do ponteiro, quem chega pelo Tab anda com as setas. Gráfico
 * em que só o mouse lê número é meio gráfico.
 */
function useAtivo(n: number) {
  const [ativo, setAtivo] = useState<number | null>(null);

  // Período novo, contagem de pontos nova: o índice guardado pode não existir
  // mais, e o gráfico apontaria para fora da série.
  useEffect(() => {
    setAtivo((prev) => (prev == null || prev < n ? prev : null));
  }, [n]);

  function onKeyDown(e: React.KeyboardEvent) {
    const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (passo !== 0) {
      e.preventDefault();
      setAtivo((prev) => {
        const base = prev ?? (passo > 0 ? -1 : n);
        return Math.min(n - 1, Math.max(0, base + passo));
      });
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setAtivo(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setAtivo(n - 1);
    } else if (e.key === 'Escape') {
      setAtivo(null);
    }
  }

  return { ativo, setAtivo, onKeyDown };
}

/** Rótulo de acessibilidade comum aos três gráficos. */
function resumoAcessivel(series: NetSeries, meta: RangeMeta) {
  return `Consumo de rede ${meta.period}: ${formatVolume(
    series.totalDownloadGb ?? 0,
  )} de download e ${formatVolume(
    series.totalUploadGb ?? 0,
  )} de upload. Use as setas para percorrer os intervalos.`;
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
      // Âncora do screenshot de consumo: o mockup e a exportação rolam a home
      // até aqui para o gráfico aparecer inteiro na imagem.
      data-net-chart
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
  cores,
  meta,
}: {
  t: PortalTokens;
  series: NetSeries;
  height: number;
  fill?: boolean;
  cores: Cores;
  meta: RangeMeta;
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

  const { ativo, setAtivo, onKeyDown } = useAtivo(n);
  const svgRef = useRef<SVGSVGElement | null>(null);

  /** Índice mais próximo do ponteiro. Quem aponta mira numa data, não num traço. */
  function indiceEm(clientX: number) {
    const el = svgRef.current;
    if (!el) return null;
    const caixa = el.getBoundingClientRect();
    // O svg pode estar encolhido por `maxWidth: 100%` entre uma medição e
    // outra; sem desfazer a escala, o ponteiro aponta para o intervalo errado.
    const escala = caixa.width > 0 ? caixa.width / W : 1;
    const px = (clientX - caixa.left) / escala;
    const i = Math.round(((px - PAD.left) / plotW) * (n - 1));
    return Math.min(n - 1, Math.max(0, i));
  }

  const escalaVisual = width > 0 ? Math.min(width, W) / W : 1;

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="group"
      aria-label={resumoAcessivel(series, meta)}
      onKeyDown={onKeyDown}
      onBlur={() => setAtivo(null)}
      style={{
        width: '100%',
        position: 'relative',
        ...(fill ? { flex: '1 1 auto', minHeight: height, overflow: 'hidden' } : null),
      }}
    >
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        // `pan-y` deixa a página rolar com o dedo por cima do gráfico; sem
        // isso, tocar no gráfico prendia a rolagem da home.
        style={{ display: 'block', maxWidth: '100%', touchAction: 'pan-y' }}
        role="img"
        aria-label={`Consumo de rede: ${formatVolume(series.totalDownloadGb ?? 0)} de download e ${formatVolume(series.totalUploadGb ?? 0)} de upload`}
      >
        <defs>
          <linearGradient id={`dl-${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={cores.download} stopOpacity="0.45" />
            <stop offset="100%" stopColor={cores.download} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`ul-${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={cores.upload} stopOpacity="0.32" />
            <stop offset="100%" stopColor={cores.upload} stopOpacity="0" />
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
          stroke={cores.download}
          strokeWidth="2.5"
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path d={area(upload)} fill={`url(#ul-${uid})`} />
        <path
          d={line(upload)}
          stroke={cores.upload}
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* A marca do pico sai de cena enquanto o leitor aponta: duas linhas
            verticais na mesma área viram ruído. */}
        {ativo == null && (
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
        )}

        {n <= 14 &&
          download.map((v, i) => (
            <circle
              key={i}
              cx={round(x(i))}
              cy={round(y(v))}
              r={i === peakIndex ? 4.5 : 3}
              fill={cores.download}
              stroke={t.surfaceSolid}
              strokeWidth="2"
              opacity={ativo != null && ativo !== i ? 0.45 : 1}
            />
          ))}

        {labels &&
          labelIndexes(n, plotW).map((i) => (
            <text
              key={i}
              x={round(x(i))}
              y={H - 10}
              fontSize="10"
              fill={ativo === i ? t.text : t.text3}
              fontWeight={ativo === i ? 700 : 400}
              textAnchor={i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle'}
              fontFamily={t.mono}
            >
              {labels[i]}
            </text>
          ))}

        {ativo != null && (
          <g pointerEvents="none">
            <line
              x1={round(x(ativo))}
              y1={PAD.top}
              x2={round(x(ativo))}
              y2={baseline}
              stroke={t.text3}
              strokeWidth="1"
              opacity="0.7"
            />
            <circle
              cx={round(x(ativo))}
              cy={round(y(upload[ativo]!))}
              r="4"
              fill={cores.upload}
              stroke={t.surfaceSolid}
              strokeWidth="2"
            />
            <circle
              cx={round(x(ativo))}
              cy={round(y(download[ativo]!))}
              r="5"
              fill={cores.download}
              stroke={t.surfaceSolid}
              strokeWidth="2"
            />
          </g>
        )}

        {/* O alvo do ponteiro é a caixa inteira, não a linha de 2px. */}
        <rect
          x="0"
          y="0"
          width={W}
          height={H}
          fill="transparent"
          onPointerMove={(e) => setAtivo(indiceEm(e.clientX))}
          onPointerDown={(e) => setAtivo(indiceEm(e.clientX))}
          onPointerLeave={() => setAtivo(null)}
          onPointerCancel={() => setAtivo(null)}
        />
      </svg>

      {ativo != null && (
        <Leitura
          t={t}
          x={x(ativo) * escalaVisual}
          topo={Math.min(y(download[ativo]!), y(upload[ativo]!)) * escalaVisual}
          largura={width || W}
          titulo={labels?.[ativo] ?? meta.label}
          linhas={[
            {
              rotulo: 'Download',
              valor: formatVolume(series.download[ativo] ?? download[ativo]! / factor),
              cor: cores.download,
            },
            {
              rotulo: 'Upload',
              valor: formatVolume(series.upload[ativo] ?? upload[ativo]! / factor),
              cor: cores.upload,
            },
          ]}
        />
      )}
    </div>
  );
}

function ChartBars({
  t,
  series,
  height,
  fill,
  cores,
  meta,
}: {
  t: PortalTokens;
  series: NetSeries;
  height: number;
  fill?: boolean;
  cores: Cores;
  meta: RangeMeta;
}) {
  // O topo da escala é a coluna inteira — download mais upload —, senão a
  // pilha do maior dia passava do teto da caixa. O upload ia plotado a 30% da
  // altura que lhe cabia, o que é uma segunda escala escondida dentro do
  // mesmo gráfico: a faixa de baixo parecia três vezes menor do que é.
  const maxDownload = Math.max(...series.download, 1);
  const maiorColuna = Math.max(...series.download.map((dl, i) => dl + (series.upload[i] ?? 0)), 1);
  // Teto redondo, como no eixo do gráfico de área: assim a linha de cima cai
  // num número que se lê e a maior barra não encosta no topo da caixa.
  const max = niceCeil(maiorColuna);
  const peakIndex = series.download.indexOf(maxDownload);
  // Reserva o rodapé para os rótulos, como no gráfico de área.
  const barsHeight = Math.max(120, height - 46);
  const n = series.download.length;
  const { ref, width } = useChartBox();
  const { ativo, setAtivo, onKeyDown } = useAtivo(n);

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="group"
      aria-label={resumoAcessivel(series, meta)}
      onKeyDown={onKeyDown}
      onBlur={() => setAtivo(null)}
      onPointerLeave={() => setAtivo(null)}
      style={{
        position: 'relative',
        ...(fill ? { flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0 } : null),
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: n > 14 ? 1 : 3,
          height: barsHeight,
          paddingBottom: 4,
          position: 'relative',
          borderBottom: `1px solid ${t.borderSoft}`,
          ...(fill ? { flex: '1 1 auto', minHeight: barsHeight, height: 'auto' } : null),
        }}
      >
        {/* Referência do topo: sem ela, a altura das barras não vira número
            nenhum para quem só passa o olho. */}
        <div
          aria-hidden
          style={{ position: 'absolute', left: 0, right: 0, top: 0, borderTop: `1px solid ${t.borderSoft}` }}
        />
        <span
          aria-hidden
          style={{ position: 'absolute', right: 0, top: 3, fontSize: 9, color: t.text3, fontFamily: t.mono }}
        >
          {`${axisLabel(Number((max * scaleFor(max).factor).toFixed(2)))} ${scaleFor(max).unit}`}
        </span>

        {series.download.map((dl, i) => {
          const ul = series.upload[i] ?? 0;
          const isPeak = i === peakIndex;
          const isAtivo = i === ativo;
          return (
            // height:100% dá altura definida à coluna. Sem isso a barra, que
            // é medida em porcentagem, não tinha contra o que calcular e
            // colapsava no minHeight — o gráfico de barras saía vazio.
            //
            // A coluna inteira é o alvo do ponteiro, não a barra: com 30 dias
            // cada barra tem três pixels de largura e ninguém acerta.
            <div
              key={i}
              onPointerEnter={() => setAtivo(i)}
              onPointerDown={() => setAtivo(i)}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 1,
                // Cinza, não a cor da marca: um véu colorido na coluna inteira
                // ficava com cara de uma segunda barra atrás da barra.
                background: isAtivo ? rgba(t.text3, 0.1) : 'transparent',
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: `${(dl / max) * 100}%`,
                  background: isPeak || isAtivo ? t.accentGrad : cores.download,
                  borderRadius: '4px 4px 0 0',
                  minHeight: 2,
                  opacity: ativo != null && !isAtivo ? 0.55 : 1,
                  transition: 'opacity .12s ease',
                }}
              />
              <div
                style={{
                  width: '100%',
                  height: `${(ul / max) * 100}%`,
                  background: cores.upload,
                  borderRadius: '0 0 2px 2px',
                  minHeight: 1,
                  opacity: ativo != null && !isAtivo ? 0.3 : 0.6,
                  transition: 'opacity .12s ease',
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

      {ativo != null && (
        <Leitura
          t={t}
          x={((ativo + 0.5) / n) * (width || 300)}
          topo={barsHeight - (series.download[ativo]! / max) * barsHeight}
          largura={width || 300}
          titulo={series.labels?.[ativo] ?? meta.label}
          linhas={[
            { rotulo: 'Download', valor: formatVolume(series.download[ativo]!), cor: cores.download },
            { rotulo: 'Upload', valor: formatVolume(series.upload[ativo] ?? 0), cor: cores.upload },
          ]}
        />
      )}
    </div>
  );
}

/**
 * Anel do layout Bold.
 *
 * O anel divide o tráfego do período entre download e upload, e o centro traz
 * o total. Já foi um medidor contra um "limite" que era o próprio consumo
 * multiplicado por 1,6 — ou seja, marcava os mesmos 62% fosse qual fosse o
 * consumo, e um medidor que não se mexe é enfeite com cara de dado. Plano
 * residencial não tem franquia, então não existe denominador honesto para um
 * medidor; a divisão entre as duas séries existe de verdade.
 */
function ChartRadial({
  t,
  series,
  range,
  cores,
}: {
  t: PortalTokens;
  series: NetSeries;
  range: ErpUsageRange;
  cores: Cores;
}) {
  const uid = useId().replace(/:/g, '');
  const down = series.totalDownloadGb ?? 0;
  const up = series.totalUploadGb ?? 0;
  const total = down + up;
  const fatiaDown = total > 0 ? down / total : 1;
  const r = 64;
  const C = 2 * Math.PI * r;
  // Respiro entre os dois arcos, para um não encostar no outro. Nunca maior
  // que a fatia que ele vai encurtar: numa conta com upload minúsculo, o vão
  // fixo comia o arco inteiro.
  const vao = Math.min(C * 0.012, C * fatiaDown * 0.4, C * (1 - fatiaDown) * 0.4);
  const max = Math.max(...series.download, 1);
  const legenda = range === 'today' ? 'de tráfego hoje' : 'de tráfego';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: 8 }}>
      <svg
        viewBox="-90 -90 180 180"
        style={{ width: '100%', maxWidth: 210, height: 'auto', transform: 'rotate(-90deg)' }}
        role="img"
        aria-label={`${formatVolume(total)} de tráfego: ${formatVolume(down)} de download e ${formatVolume(up)} de upload`}
      >
        <defs>
          <linearGradient id={`rad-${uid}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={cores.download} />
            <stop offset="100%" stopColor={t.accent2} />
          </linearGradient>
        </defs>

        <circle r={r} fill="none" stroke={t.borderSoft} strokeWidth="14" />
        {/* Download: do topo, no sentido do relógio. */}
        <circle
          r={r}
          fill="none"
          stroke={`url(#rad-${uid})`}
          strokeWidth="14"
          strokeDasharray={`${Math.max(C * fatiaDown - vao, 0)} ${C}`}
        />
        {/* Upload: emenda onde o download termina. */}
        <circle
          r={r}
          fill="none"
          stroke={cores.upload}
          strokeWidth="14"
          strokeDasharray={`${Math.max(C * (1 - fatiaDown) - vao, 0)} ${C}`}
          strokeDashoffset={-C * fatiaDown}
        />

        {series.download.map((v, i) => {
          const rad = ((i / series.download.length) * 360 * Math.PI) / 180;
          // Encostados no anel, não no texto do centro: a 38 eles passavam
          // por cima do número.
          const inner = 44;
          const len = 2 + (v / max) * 10;
          return (
            <line
              key={i}
              x1={Math.cos(rad) * inner}
              y1={Math.sin(rad) * inner}
              x2={Math.cos(rad) * (inner + len)}
              y2={Math.sin(rad) * (inner + len)}
              stroke={cores.download}
              strokeWidth="2"
              strokeLinecap="round"
              opacity={0.8}
            />
          );
        })}
      </svg>

      {/* O texto vive dentro do furo do anel: a largura é a do furo, não a
          do card, senão o número atravessa o aro. */}
      <div style={{ position: 'absolute', textAlign: 'center', maxWidth: 104 }}>
        <div style={{ fontSize: 10, color: t.text2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          Total
        </div>
        <div style={{ fontSize: 21, fontWeight: 800, fontFamily: t.mono, letterSpacing: '-0.02em' }}>
          {formatVolume(total)}
        </div>
        <div style={{ fontSize: 10, color: t.text3 }}>{legenda}</div>
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
