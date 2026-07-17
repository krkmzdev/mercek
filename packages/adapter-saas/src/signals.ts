import type { SaasCanonical } from './canonical';
import { cohortRetention, latestMovement, months, mrrByCustomer, type CohortRow, type Movement } from './saas';

export interface SaasSignals {
  monthCount: number;
  movement: Movement | null;
  mrrTrend: { month: string; mrr: number }[];
  cohorts: CohortRow[];
}

export function computeSaasSignals(data: SaasCanonical): SaasSignals {
  const ms = months(data.rows);
  return {
    monthCount: ms.length,
    movement: latestMovement(data.rows),
    mrrTrend: ms.map((m) => ({ month: m, mrr: Math.round([...mrrByCustomer(data.rows, m).values()].reduce((a, b) => a + b, 0)) })),
    cohorts: cohortRetention(data.rows),
  };
}
