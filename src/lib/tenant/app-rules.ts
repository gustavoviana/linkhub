// Regras de trava do app: identificador do pacote e passos da migração.
// Puro, para a API, a tela e os testes usarem a mesma decisão.

/** Regra do Android: segmentos separados por ponto, cada um começando com letra. */
export const PACKAGE_ID = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
export const PACKAGE_ID_MAX = 150;

export function isValidPackageId(value: string): boolean {
  return value.length <= PACKAGE_ID_MAX && PACKAGE_ID.test(value);
}

export type PackageChange =
  | { ok: true; mode: 'unchanged' | 'free' | 'override' }
  | { ok: false; status: 400 | 403 | 409; error: string };

/**
 * Pode trocar o identificador do pacote?
 *
 * Livre até o primeiro build marcado como publicado. Depois, só super
 * administrador, e só com a confirmação digitada igual ao pacote novo.
 */
export function checkPackageChange(input: {
  current: string;
  next: string;
  published: boolean;
  isPlatformAdmin: boolean;
  confirmation: string | null | undefined;
}): PackageChange {
  if (input.next === input.current) return { ok: true, mode: 'unchanged' };
  if (!isValidPackageId(input.next)) {
    return { ok: false, status: 400, error: 'Pacote inválido. Use algo como br.com.provedor.central.' };
  }
  if (!input.published) return { ok: true, mode: 'free' };
  if (!input.isPlatformAdmin) {
    return {
      ok: false,
      status: 409,
      error: 'O app já foi publicado. Trocar o pacote criaria outro app na loja.',
    };
  }
  if (input.confirmation !== input.next) {
    return {
      ok: false,
      status: 400,
      error: 'Para trocar o pacote de um app publicado, digite o pacote novo na confirmação.',
    };
  }
  return { ok: true, mode: 'override' };
}

export interface MigrationState {
  migration_enabled: boolean;
  package_id: string;
  store_version_floor: number;
  migration_pem_downloaded_at: string | null;
  migration_reset_requested_at: string | null;
  migration_reset_approved_at: string | null;
  play_signing_sha256: string | null;
}

export type MigrationStepKey = 'package' | 'certificate' | 'reset' | 'signing' | 'build';

export interface MigrationStep {
  key: MigrationStepKey;
  done: boolean;
}

export function migrationSteps(app: MigrationState): MigrationStep[] {
  return [
    { key: 'package', done: isValidPackageId(app.package_id) && app.store_version_floor > 0 },
    { key: 'certificate', done: Boolean(app.migration_pem_downloaded_at) },
    { key: 'reset', done: Boolean(app.migration_reset_requested_at && app.migration_reset_approved_at) },
    { key: 'signing', done: Boolean(app.play_signing_sha256) },
    { key: 'build', done: false },
  ];
}

/**
 * Por que o build está bloqueado, ou null se pode gerar. Na migração, o
 * build só libera depois que o Google aprova a redefinição da chave: enviar
 * antes disso dá erro de assinatura na Play.
 */
export function buildBlockReason(app: MigrationState): string | null {
  if (!app.migration_enabled) return null;
  if (app.store_version_floor <= 0) {
    return 'Informe o código de versão atual na loja antes de gerar o build.';
  }
  if (!app.migration_reset_requested_at) {
    return 'Peça a redefinição da chave de upload no Play Console antes de gerar o build.';
  }
  if (!app.migration_reset_approved_at) {
    return 'Aguarde o Google aprovar a redefinição da chave e marque o passo 3 como concluído.';
  }
  return null;
}
