import type { ErpUsagePoint, ErpUsageRange } from './types';

// Os intervalos que o gráfico de consumo mostra em cada período.
//
// O servidor roda em UTC, mas os baldes precisam bater com o relógio do
// assinante — senão "hoje" vira o dia errado nas três primeiras horas da
// madrugada e a hora rotulada como 14h é na verdade 11h. Por isso tudo é
// calculado no fuso do provedor.

const TZ = 'America/Sao_Paulo';

/** Deslocamento do fuso em relação ao UTC no instante dado, em ms. */
function zoneOffsetMs(epoch: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(epoch));

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return asUtc - Math.floor(epoch / 1000) * 1000;
}

/** Ano/mês/dia/hora do relógio local para um instante. */
function localParts(epoch: number) {
  const shifted = new Date(epoch + zoneOffsetMs(epoch));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
  };
}

/** Instante real em que começa a hora local informada. */
function localEpoch(year: number, month: number, day: number, hour = 0): number {
  const wall = Date.UTC(year, month, day, hour);
  // Duas passadas: a primeira estima o deslocamento, a segunda confere com o
  // deslocamento válido naquele instante (importa em mudança de fuso).
  const first = wall - zoneOffsetMs(wall);
  return wall - zoneOffsetMs(first);
}

const pad = (n: number) => String(n).padStart(2, '0');

export interface UsageSlot {
  /** Início do intervalo, em epoch ms. */
  start: number;
  /** Fim do intervalo, em epoch ms. */
  end: number;
  point: ErpUsagePoint;
}

/**
 * Baldes vazios do período, do mais antigo para o mais recente.
 *
 * "Hoje" é hora a hora, da meia-noite até a hora corrente: horas que ainda
 * não aconteceram ficam de fora, senão o gráfico terminaria num tombo até
 * zero que não é queda de consumo, é futuro.
 */
export function usageSlots(range: ErpUsageRange, now = Date.now()): UsageSlot[] {
  const slots: UsageSlot[] = [];
  const today = localParts(now);

  if (range === 'today') {
    for (let hour = 0; hour <= today.hour; hour++) {
      const start = localEpoch(today.year, today.month, today.day, hour);
      slots.push({
        start,
        end: localEpoch(today.year, today.month, today.day, hour + 1),
        point: {
          date: `${today.year}-${pad(today.month + 1)}-${pad(today.day)}T${pad(hour)}`,
          label: `${pad(hour)}h`,
          downloadBytes: 0,
          uploadBytes: 0,
        },
      });
    }
    return slots;
  }

  const days = range === '30d' ? 30 : 7;
  for (let i = days - 1; i >= 0; i--) {
    const start = localEpoch(today.year, today.month, today.day - i);
    const day = localParts(start);
    slots.push({
      start,
      end: localEpoch(today.year, today.month, today.day - i + 1),
      point: {
        date: `${day.year}-${pad(day.month + 1)}-${pad(day.day)}`,
        label: `${pad(day.day)}/${pad(day.month + 1)}`,
        downloadBytes: 0,
        uploadBytes: 0,
      },
    });
  }
  return slots;
}

/** Aceita o período vindo da query string, com 7 dias como padrão. */
export function parseUsageRange(value: unknown): ErpUsageRange {
  return value === 'today' || value === '30d' ? value : '7d';
}
