import type { KpiDefinition, KpiResult } from '@mercek/sdk';

export interface RunKpisOptions {
  /** Canonical fields the mapper could not fill (from `MapResult.missingFields`). */
  missingFields?: string[];
}

/**
 * Run a sector's KPIs over mapped canonical data (spec §8.1). A missing
 * required field degrades that KPI to `unavailable` with a reason — it never
 * crashes the pipeline (§5 critical rule). A throwing `compute` is caught and
 * degraded the same way. An `ok` result with no evidence violates the contract
 * and is downgraded (the UI cannot render a number without provenance).
 */
export function runKpis<T>(
  kpis: KpiDefinition<T>[],
  data: T,
  opts: RunKpisOptions = {},
): KpiResult[] {
  const missing = new Set(opts.missingFields ?? []);

  return kpis.map((kpi) => {
    const blocked = kpi.requiredFields.map(String).filter((f) => missing.has(f));
    if (blocked.length > 0) {
      return unavailable(kpi.id, `Eksik alan: ${blocked.join(', ')}`);
    }

    try {
      const result = kpi.compute(data);
      if (result.status === 'ok' && result.evidence.length === 0) {
        return unavailable(kpi.id, 'Kanıt (evidence) üretilemedi.');
      }
      return result;
    } catch (err) {
      return unavailable(kpi.id, err instanceof Error ? err.message : String(err));
    }
  });
}

function unavailable(kpiId: string, reason: string): KpiResult {
  return { kpiId, status: 'unavailable', unavailableReason: reason, evidence: [] };
}
