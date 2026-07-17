import type { FinanceCanonical } from './canonical';
import { cccByPeriod, computeRealReturn, type PeriodRatios, type RealReturn } from './realreturn';

export interface FinanceSignals {
  periodCount: number;
  realReturn: RealReturn | null;
  ccc: PeriodRatios[];
  trend: { period: string; netSales: number | null; netMarginPct: number | null }[];
}

export function computeFinanceSignals(data: FinanceCanonical): FinanceSignals {
  const trend = data.periods.map((p) => ({
    period: p.period,
    netSales: p.netSales ?? null,
    netMarginPct:
      p.netProfit !== undefined && p.netSales ? Math.round((p.netProfit / p.netSales) * 1000) / 10 : null,
  }));
  return {
    periodCount: data.periods.length,
    realReturn: computeRealReturn(data.periods),
    ccc: cccByPeriod(data.periods),
    trend,
  };
}
