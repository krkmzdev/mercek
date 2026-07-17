import type { FinancePeriod } from './canonical';

/**
 * TÜFE real-return engine (spec §10.3 — the signature move). Turkish SMEs read
 * high nominal revenue growth as success while inflation ran higher: real
 * contraction dressed as a win. Direct lineage from the KELD Wallet real-return
 * math. Cite TÜİK as the source.
 */
export interface RealReturn {
  latestPeriod: string;
  priorPeriod: string;
  nominalGrowthPct: number;
  inflationPct: number;
  realGrowthPct: number;
}

/** Year-over-year real growth (latest period vs 4 quarters earlier). */
export function computeRealReturn(periods: FinancePeriod[]): RealReturn | null {
  const withData = periods.filter((p) => p.netSales !== undefined && p.cpiIndex !== undefined);
  if (withData.length < 5) return null;
  const latest = withData[withData.length - 1]!;
  const prior = withData[withData.length - 5]!; // 4 quarters back
  if (!latest.netSales || !prior.netSales || !latest.cpiIndex || !prior.cpiIndex) return null;

  const nominal = latest.netSales / prior.netSales - 1;
  const inflation = latest.cpiIndex / prior.cpiIndex - 1;
  const real = (1 + nominal) / (1 + inflation) - 1;

  return {
    latestPeriod: latest.period,
    priorPeriod: prior.period,
    nominalGrowthPct: Math.round(nominal * 1000) / 10,
    inflationPct: Math.round(inflation * 1000) / 10,
    realGrowthPct: Math.round(real * 1000) / 10,
  };
}

const DAYS_IN_QUARTER = 91;

export interface PeriodRatios {
  period: string;
  dso: number | null;
  dio: number | null;
  dpo: number | null;
  ccc: number | null;
}

/** Cash-conversion-cycle components per period (for the lengthening-CCC signal). */
export function cccByPeriod(periods: FinancePeriod[]): PeriodRatios[] {
  return periods.map((p) => {
    const dso = p.receivables !== undefined && p.netSales ? (p.receivables / p.netSales) * DAYS_IN_QUARTER : null;
    const dio = p.inventory !== undefined && p.cogs ? (p.inventory / p.cogs) * DAYS_IN_QUARTER : null;
    const dpo = p.payables !== undefined && p.cogs ? (p.payables / p.cogs) * DAYS_IN_QUARTER : null;
    const round = (x: number | null): number | null => (x === null ? null : Math.round(x * 10) / 10);
    const ccc = dso !== null && dio !== null && dpo !== null ? dso + dio - dpo : null;
    return { period: p.period, dso: round(dso), dio: round(dio), dpo: round(dpo), ccc: round(ccc) };
  });
}
