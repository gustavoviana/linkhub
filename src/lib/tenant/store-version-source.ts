import type { TenantApp } from './app-config';

// De onde vem "o maior versionCode que a loja já recebeu".
//
// Hoje: o campo manual "Código de versão atual na loja" (store_version_floor).
//
// Fase 2 (não implementada): uma implementação que usa a Google Play
// Developer API com a conta de serviço que o provedor autoriza no Play
// Console dele. `edits.insert` + `edits.bundles.list` devolve os
// versionCodes enviados; o maior deles substitui o campo manual. A mesma
// credencial serve para enviar o .aab direto à faixa de teste interno
// (`edits.bundles.upload` + `edits.tracks.update` + `edits.commit`).
// Encaixa aqui sem mexer na reserva: o build route chama `highest()` e grava
// o resultado em store_version_floor antes de reservar.

export interface StoreVersion {
  versionCode: number;
  versionName: string | null;
}

export interface StoreVersionSource {
  readonly kind: 'manual' | 'play_api';
  /** Maior versão já enviada à loja fora do LinkHub, ou null se não houver. */
  highest(app: TenantApp): Promise<StoreVersion | null>;
}

export class ManualStoreVersionSource implements StoreVersionSource {
  readonly kind = 'manual' as const;

  async highest(app: TenantApp): Promise<StoreVersion | null> {
    if (app.store_version_floor <= 0) return null;
    return { versionCode: app.store_version_floor, versionName: app.store_version_name };
  }
}

export function storeVersionSourceFor(_app: TenantApp): StoreVersionSource {
  return new ManualStoreVersionSource();
}
