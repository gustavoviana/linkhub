import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// 'YYYY-MM-DD' do Postgres é dia civil, não instante. `new Date()` interpreta
// como UTC e, em fuso negativo, volta um dia: no Brasil o vencimento aparecia
// com um dia a menos e o mês de referência (sempre dia 01) com um mês a menos.
function parseDbDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!m) return new Date(date);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function formatDate(date: string | Date, opts: Intl.DateTimeFormatOptions = {}) {
  return parseDbDate(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...opts,
  });
}

export function formatMonthYear(date: string | Date) {
  return parseDbDate(date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function maskCpfCnpj(value: string | null | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}

/** Máscara progressiva de CPF, para aplicar enquanto o cliente digita. */
export function maskCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Validação dos dígitos verificadores — evita ida ao ERP com CPF inventado. */
export function isValidCpf(value: string): boolean {
  const d = value.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digit = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += Number(d[i]) * (slice + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(d[9]) && digit(10) === Number(d[10]);
}

export function maskPhone(value: string | null | undefined): string {
  if (!value) return '';
  const d = value.replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return value;
}

// Os ERPs guardam nome em caixa alta ("ERICSON FERNANDO MACHADO"). Gritar com
// o assinante na tela dele não combina com nada; normalizamos na exibição e
// deixamos o dado original intacto no banco.
const NAME_PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du', 'del', 'della', 'van', 'von']);

export function titleCaseName(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  // Nome já escrito com maiúsculas e minúsculas fica como está — pode ser uma
  // grafia intencional ("McDonald", "D'Ávila").
  if (raw !== raw.toUpperCase() && raw !== raw.toLowerCase()) return raw;

  return raw
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) => {
      if (i > 0 && NAME_PARTICLES.has(word)) return word;
      // Trata hífen e apóstrofo: "maria-clara" e "d'ávila".
      return word.replace(/(^|[-'])([\p{L}])/gu, (_, sep, letter) => sep + letter.toUpperCase());
    })
    .join(' ');
}

/**
 * Situação do contrato em português.
 *
 * O banco guarda o enum em inglês e a central mostrava o valor cru: o
 * assinante lia "suspended" na tela dele. Traduz o que conhecemos e devolve o
 * resto como veio — status novo vindo de um ERP é melhor aparecer estranho do
 * que sumir.
 */
const SITUACAO_CONTRATO: Record<string, string> = {
  active: 'Ativo',
  suspended: 'Suspenso',
  cancelled: 'Cancelado',
  canceled: 'Cancelado',
  pending: 'Em ativação',
};

export function contractStatusLabel(status: string | null | undefined): string {
  const chave = (status ?? '').trim().toLowerCase();
  if (!chave) return '—';
  return SITUACAO_CONTRATO[chave] ?? status!;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}
