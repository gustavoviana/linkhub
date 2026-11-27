// Regras de versão do app. Puro de propósito: roda no servidor, na tela (para
// mostrar a prévia) e nos testes.
//
// O número que vale é o que o banco reserva em app_reserve_build (migração
// 014). A conta daqui é a mesma, e serve para a prévia e para escolher o
// versionName que vai junto.

/** MAJOR.MINOR.PATCH, só números. É o que a migração 014 aceita no banco. */
export const SEMVER = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;

/** Teto da Play para versionCode. */
export const MAX_VERSION_CODE = 2_100_000_000;

export const FIRST_VERSION_NAME = '1.0.0';

export interface AndroidVersionState {
  /** Último versionCode que saiu com sucesso pelo LinkHub (0 = nenhum). */
  version_code: number;
  /** versionName desse último build. */
  version_name: string;
  /** Maior versionCode enviado à loja fora do LinkHub. */
  store_version_floor: number;
  /** versionName que acompanha o piso. */
  store_version_name: string | null;
  /** Escolha manual do admin para o próximo build. */
  next_version_name: string | null;
}

export interface IosVersionState {
  ios_build_number: number;
  ios_version_name: string;
  ios_next_version_name: string | null;
}

export interface Version {
  version_code: number;
  version_name: string;
}

export function isSemver(value: string): boolean {
  return SEMVER.test(value);
}

/** 3.0.11 → 3.1.0. Valor fora do formato começa de 1.0.0. */
export function bumpMinor(name: string): string {
  if (!isSemver(name)) return FIRST_VERSION_NAME;
  const [major, minor] = name.split('.').map((n) => Number.parseInt(n, 10));
  return `${major}.${(minor ?? 0) + 1}.0`;
}

/** Compara dois semver. Negativo se a < b. */
export function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * Próxima versão do Android.
 *
 * Código: max(version_code, store_version_floor) + 1.
 * Nome: o que o admin escolheu; senão, o minor seguinte ao da versão que está
 * na loja (a do piso, quando o piso passa do que o LinkHub já gerou). O
 * primeiro build de um provedor novo sai 1.0.0.
 */
export function nextVersion(app: AndroidVersionState): Version {
  const last = Math.max(app.version_code, app.store_version_floor);
  const version_code = last + 1;

  let version_name: string;
  if (app.next_version_name && isSemver(app.next_version_name)) {
    version_name = app.next_version_name;
  } else if (last === 0) {
    version_name = FIRST_VERSION_NAME;
  } else if (app.store_version_floor > app.version_code && app.store_version_name) {
    version_name = bumpMinor(app.store_version_name);
  } else {
    version_name = bumpMinor(app.version_name);
  }

  return { version_code, version_name };
}

/** Próxima versão do iOS, com contadores próprios. */
export function nextIosVersion(app: IosVersionState): Version {
  const version_code = app.ios_build_number + 1;
  let version_name: string;
  if (app.ios_next_version_name && isSemver(app.ios_next_version_name)) {
    version_name = app.ios_next_version_name;
  } else if (app.ios_build_number === 0) {
    version_name = FIRST_VERSION_NAME;
  } else {
    version_name = bumpMinor(app.ios_version_name);
  }
  return { version_code, version_name };
}

export function versionLabel(v: { version_name: string | null; version_code: number | null }): string {
  return `${v.version_name ?? '?'} (${v.version_code ?? '?'})`;
}
