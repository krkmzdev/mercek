import { z } from 'zod';
import type { SourceRef } from '@mercek/sdk';

/**
 * Finance canonical (spec §10.3). Input is a long-format financial statement
 * (period · line item · value); the mapper pivots it into one record per
 * period. A different data shape from the transactional sectors — which is the
 * whole point of the multi-sector claim.
 */
export interface FinancePeriod {
  period: string; // e.g. "2024-Q1"
  netSales?: number;
  cogs?: number; // SMM
  grossProfit?: number;
  operatingProfit?: number;
  netProfit?: number;
  depreciation?: number;
  currentAssets?: number;
  inventory?: number;
  receivables?: number;
  currentLiabilities?: number;
  payables?: number;
  totalDebt?: number;
  equity?: number;
  cpiIndex?: number; // TÜİK TÜFE index
}

export const PERIOD_FIELDS = [
  'netSales',
  'cogs',
  'grossProfit',
  'operatingProfit',
  'netProfit',
  'depreciation',
  'currentAssets',
  'inventory',
  'receivables',
  'currentLiabilities',
  'payables',
  'totalDebt',
  'equity',
  'cpiIndex',
] as const;
export type PeriodField = (typeof PERIOD_FIELDS)[number];

export const FinanceCanonicalSchema = z.object({
  periods: z.array(
    z.object({ period: z.string() }).catchall(z.number().optional()),
  ),
});

export type FinanceCanonical = { periods: FinancePeriod[]; sourceRef: SourceRef };
