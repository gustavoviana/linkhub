// CPF e CNPJ: máscara, validação e as variações de formato que os ERPs usam.
//
// O assinante digita como quiser — com ponto, sem ponto, com espaço colado do
// copiar/colar. E cada ERP guarda de um jeito: o IXC costuma gravar
// "044.489.710-07" formatado, o SGP e o Hubsoft gravam só os dígitos. Quem
// resolve essa diferença é aqui, não cada tela.

export type DocumentKind = 'cpf' | 'cnpj';

export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

export function documentKind(value: string): DocumentKind | null {
  const d = onlyDigits(value);
  if (d.length === 11) return 'cpf';
  if (d.length === 14) return 'cnpj';
  return null;
}

/** Máscara progressiva: vira CPF até 11 dígitos, CNPJ a partir daí. */
export function maskDocument(value: string): string {
  const d = onlyDigits(value).slice(0, 14);

  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Formata a partir dos dígitos — é assim que a maioria dos ERPs guarda. */
export function formatDocument(value: string): string {
  const d = onlyDigits(value);
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return value;
}

export function isValidCpf(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digit = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += Number(d[i]) * (slice + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(d[9]) && digit(10) === Number(d[10]);
}

export function isValidCnpj(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const digit = (slice: number) => {
    let sum = 0;
    let weight = slice - 7;
    for (let i = 0; i < slice; i++) {
      sum += Number(d[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return digit(12) === Number(d[12]) && digit(13) === Number(d[13]);
}

export function isValidDocument(value: string): boolean {
  const kind = documentKind(value);
  if (kind === 'cpf') return isValidCpf(value);
  if (kind === 'cnpj') return isValidCnpj(value);
  return false;
}

/**
 * Todas as escritas plausíveis do mesmo documento, sem repetir. Serve para
 * consultar o ERP: alguns guardam formatado, outros só os dígitos, e não dá
 * para saber de antemão qual é o caso de cada instalação.
 */
export function documentVariants(value: string): string[] {
  const digits = onlyDigits(value);
  if (!digits) return [];
  const formatted = formatDocument(digits);
  return formatted === digits ? [digits] : [formatted, digits];
}
