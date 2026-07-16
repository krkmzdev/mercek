import { Decimal } from 'decimal.js';

/** The five sectors (mirrors the Prisma `SectorId` enum values, §6). */
export type SectorId = 'RETAIL' | 'FNB' | 'FINANCE' | 'MANUFACTURING' | 'SAAS';

export const SECTOR_IDS: readonly SectorId[] = [
  'RETAIL',
  'FNB',
  'FINANCE',
  'MANUFACTURING',
  'SAAS',
];

/** Bilingual string. UI is Turkish-primary; every label carries both (§11). */
export interface Localized {
  tr: string;
  en: string;
}

/**
 * Re-export Decimal so adapters compute money/ratios with the same
 * implementation the engine persists (§6 Decimal discipline).
 */
export { Decimal };
