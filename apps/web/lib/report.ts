import type { AnalyzeResult, EnrichResult } from '@mercek/core';
import type {
  BenchmarkComparison,
  Insight,
  KpiDefinition,
  KpiResult,
  KpiUnit,
  SectorAdapter,
  SectorId,
} from '@mercek/sdk';

/** Serialized, render-ready report payload stored in `Analysis.insight`. */
export interface ReportView {
  id: string;
  sector: SectorId;
  sectorName: { tr: string; en: string };
  isFixture: boolean;
  source: { filename: string; sheet?: string; rows: number };
  mapping: MappingView;
  insight: Insight;
  kpis: KpiView[];
  charts: ReportCharts;
  meta: { model: string; costUsd: number; generatedAt: string; evidenceFlagRate: number };
}

export interface MappingView {
  confidence: number;
  columns: { sourceHeader: string; canonicalField: string; confidence: number; method: string }[];
  unmapped: string[];
  missingFields: { field: string; impact: string }[];
}

export interface KpiView {
  id: string;
  label: { tr: string; en: string };
  unit: KpiUnit;
  formula: { tr: string; en: string };
  interpretation: { tr: string; en: string };
  direction: string;
  status: 'ok' | 'unavailable';
  /** Formatted display value (TR), or null when unavailable. */
  value: string | null;
  unavailableReason?: string;
  evidence: { filename: string; sheet?: string; range?: string; cell?: string }[];
  benchmark?: {
    label: { tr: string; en: string };
    median?: number;
    position: string;
    verdict: string;
    source: string;
    isSynthetic: boolean;
    deltaFromMedian?: number;
  };
}

export interface ReportCharts {
  // Retail
  pareto?: { label: string; value: number }[];
  categoryTrend?: { category: string; first: number; last: number; changePct: number }[];
  returnBySku?: { sku: string; returnRatePct: number; sales: number }[];
  // F&B
  menuMatrix?: { item: string; popularityPct: number; cmPerUnit: number; quadrant: string }[];
  daypartMargin?: { daypart: string; revenuePct: number; foodCostPct: number | null }[];
  // Finance
  realReturn?: { label: string; value: number }[];
  cccTrend?: { period: string; ccc: number | null }[];
  // Manufacturing
  oeeDecomposition?: { label: string; value: number }[];
  machineOee?: { machine: string; oee: number; availability: number }[];
  downtimePareto?: { reason: string; downtimeMin: number }[];
  // SaaS
  mrrTrend?: { month: string; mrr: number }[];
  mrrMovement?: { label: string; value: number }[];
  cohortRetention?: { cohort: string; retentionPct: number[] }[];
}

const trNum = (n: number, frac = 0): string =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: frac, maximumFractionDigits: frac });

export function formatKpiValue(unit: KpiUnit, n: number): string {
  switch (unit) {
    case 'currency':
      return `${trNum(Math.round(n))} ₺`;
    case 'percent':
      return `%${trNum(n, 1)}`;
    case 'ratio':
      return trNum(n, 2);
    case 'count':
      return trNum(Math.round(n));
    case 'days':
      return `${trNum(Math.round(n))} gün`;
    case 'score':
      return trNum(Math.round(n));
    default:
      return trNum(n, 2);
  }
}

function toKpiView(
  def: KpiDefinition<unknown>,
  result: KpiResult,
  benchmark: BenchmarkComparison | undefined,
): KpiView {
  return {
    id: def.id,
    label: def.label,
    unit: def.unit,
    formula: def.formula,
    interpretation: def.interpretation,
    direction: def.direction,
    status: result.status,
    value: result.status === 'ok' && result.value ? formatKpiValue(def.unit, result.value.toNumber()) : null,
    unavailableReason: result.unavailableReason,
    evidence: result.evidence.map((e) => ({
      filename: e.filename,
      sheet: e.sheet,
      range: e.range,
      cell: e.cell,
    })),
    benchmark: benchmark
      ? {
          label: benchmark.entry.label,
          median: benchmark.entry.median,
          position: benchmark.position,
          verdict: benchmark.verdict,
          source: benchmark.entry.source,
          isSynthetic: benchmark.entry.isSynthetic,
          deltaFromMedian: benchmark.deltaFromMedian?.toNumber(),
        }
      : undefined,
  };
}

/** Serialize the pipeline output into a stored, render-ready {@link ReportView}. */
export function buildReportView(params: {
  id: string;
  adapter: SectorAdapter<unknown>;
  enriched: EnrichResult<unknown>;
  analysis: AnalyzeResult;
  charts: ReportCharts;
  source: { filename: string; sheet?: string; rows: number };
  isFixture: boolean;
  generatedAt: string;
}): ReportView {
  const { adapter, enriched, analysis } = params;
  const benchByKpi = new Map(enriched.benchmarks.map((b) => [b.kpiId, b]));
  const defById = new Map(adapter.kpis.map((k) => [k.id, k]));

  const kpis = enriched.kpis.map((r) => toKpiView(defById.get(r.kpiId)!, r, benchByKpi.get(r.kpiId)));

  return {
    id: params.id,
    sector: adapter.id,
    sectorName: adapter.meta.name,
    isFixture: params.isFixture,
    source: params.source,
    mapping: {
      confidence: enriched.mapConfidence,
      columns: enriched.mapping.map((m) => ({
        sourceHeader: m.sourceHeader,
        canonicalField: m.canonicalField,
        confidence: m.confidence,
        method: m.method,
      })),
      unmapped: [],
      missingFields: enriched.missingFields.map((m) => ({ field: m.field, impact: m.impact })),
    },
    insight: analysis.insight,
    kpis,
    charts: params.charts,
    meta: {
      model: analysis.model,
      costUsd: analysis.costUsd,
      generatedAt: params.generatedAt,
      evidenceFlagRate: analysis.evidence.flagRate,
    },
  };
}
