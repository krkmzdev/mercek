import type {
  BenchmarkComparison,
  BenchmarkEntry,
  BenchmarkSet,
  KpiDefinition,
  KpiDirection,
  KpiResult,
} from '@mercek/sdk';

type Position = BenchmarkComparison['position'];
type Verdict = BenchmarkComparison['verdict'];

/** Where a value sits relative to a benchmark's band or percentile spread. */
function positionOf(value: number, entry: BenchmarkEntry): Position {
  if (entry.targetBand) {
    if (value < entry.targetBand.min) return 'below';
    if (value > entry.targetBand.max) return 'above';
    return 'within';
  }
  if (entry.p25 !== undefined && entry.p75 !== undefined) {
    if (value < entry.p25) return 'below';
    if (value > entry.p75) return 'above';
    return 'within';
  }
  if (entry.median !== undefined) {
    if (value < entry.median) return 'below';
    if (value > entry.median) return 'above';
    return 'within';
  }
  return 'unknown';
}

/** Turn a position into a direction-aware verdict. */
function verdictOf(direction: KpiDirection, position: Position): Verdict {
  if (position === 'unknown') return 'neutral';
  if (direction === 'target-band') return position === 'within' ? 'good' : 'warning';
  if (direction === 'higher-better') {
    return position === 'above' ? 'good' : position === 'within' ? 'neutral' : 'warning';
  }
  // lower-better
  return position === 'below' ? 'good' : position === 'within' ? 'neutral' : 'warning';
}

/**
 * Compare computed KPIs against the sector's benchmark set (spec §8.2). Only
 * `ok` KPIs that declare a `benchmarkKey` with a matching entry are compared.
 */
export function compareBenchmarks<T>(
  kpis: KpiDefinition<T>[],
  results: KpiResult[],
  benchmarks: BenchmarkSet,
): BenchmarkComparison[] {
  const defById = new Map(kpis.map((k) => [k.id, k]));
  const comparisons: BenchmarkComparison[] = [];

  for (const result of results) {
    if (result.status !== 'ok' || result.value === undefined) continue;
    const def = defById.get(result.kpiId);
    if (!def?.benchmarkKey) continue;
    const entry = benchmarks.entries[def.benchmarkKey];
    if (!entry) continue;

    const value = result.value.toNumber();
    const position = positionOf(value, entry);
    comparisons.push({
      kpiId: result.kpiId,
      benchmarkKey: def.benchmarkKey,
      value: result.value,
      entry,
      position,
      deltaFromMedian: entry.median !== undefined ? result.value.minus(entry.median) : undefined,
      verdict: verdictOf(def.direction, position),
    });
  }

  return comparisons;
}
