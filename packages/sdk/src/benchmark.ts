import type { Decimal } from 'decimal.js';
import type { Localized } from './common';

/** A benchmark value set for a sector (spec §8.2). */
export interface BenchmarkEntry {
  key: string;
  label: Localized;
  /** MANDATORY. If synthetic, say so. Never fabricate a source. */
  source: string;
  isSynthetic: boolean;
  sourceUrl?: string;
  p25?: number;
  median?: number;
  p75?: number;
  targetBand?: { min: number; max: number };
  region?: 'TR' | 'GLOBAL';
  asOf?: string;
}

export interface BenchmarkSet {
  entries: Record<string, BenchmarkEntry>;
}

/** How a computed KPI sits against its benchmark (produced by the comparator). */
export interface BenchmarkComparison {
  kpiId: string;
  benchmarkKey: string;
  value: Decimal;
  entry: BenchmarkEntry;
  /** Where the value falls relative to the benchmark distribution/band. */
  position: 'below' | 'within' | 'above' | 'unknown';
  /** value − median, when a median exists. */
  deltaFromMedian?: Decimal;
  /** Direction-aware read: is this good, a warning, or critical? */
  verdict: 'good' | 'warning' | 'critical' | 'neutral';
}
