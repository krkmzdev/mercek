import type {
  BenchmarkComparison,
  ColumnMapping,
  ExtractedTable,
  KpiResult,
  MapContext,
  MissingField,
  SectorAdapter,
} from '@mercek/sdk';
import { compareBenchmarks } from '../kpi/benchmark';
import { runKpis } from '../kpi/runner';

export interface EnrichResult<T> {
  data: T;
  mapping: ColumnMapping[];
  missingFields: MissingField[];
  mapConfidence: number;
  kpis: KpiResult[];
  benchmarks: BenchmarkComparison[];
}

/**
 * The Enrich stage (spec §5): map raw tables to canonical data, run the KPI
 * engine (degrading missing fields gracefully), and compare against benchmarks.
 * A missing column never crashes — it becomes an `unavailable` KPI and a
 * `missingField` the analysis prompt is told about (§5 critical rule).
 */
export async function enrich<T>(
  adapter: SectorAdapter<T>,
  tables: ExtractedTable[],
  ctx: MapContext,
): Promise<EnrichResult<T>> {
  const mapped = await adapter.map(tables, ctx);
  const kpis = runKpis(adapter.kpis, mapped.data, {
    missingFields: mapped.missingFields.map((m) => m.field),
  });
  const benchmarks = compareBenchmarks(adapter.kpis, kpis, adapter.benchmarks);

  return {
    data: mapped.data,
    mapping: mapped.mapping,
    missingFields: mapped.missingFields,
    mapConfidence: mapped.confidence,
    kpis,
    benchmarks,
  };
}
