import type { SectorAdapter, SectorId } from '@mercek/sdk';

/** A canonical-type-erased adapter, as stored in the registry. */
export type AnyAdapter = SectorAdapter<unknown>;

/**
 * Adapter registry (spec §8.5). The five sector adapters register here in
 * S3+. Adding a sector is one adapter file + one `registerAdapter` call — if it
 * costs more than that, the abstraction leaked.
 */
const registry = new Map<SectorId, AnyAdapter>();

export function registerAdapter<T>(adapter: SectorAdapter<T>): void {
  registry.set(adapter.id, adapter as unknown as AnyAdapter);
}

export function getAdapter(id: SectorId): AnyAdapter | undefined {
  return registry.get(id);
}

export function listAdapters(): AnyAdapter[] {
  return [...registry.values()];
}

export function clearAdapters(): void {
  registry.clear();
}
