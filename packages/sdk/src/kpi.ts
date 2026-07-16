import type { Decimal } from 'decimal.js';
import type { Localized } from './common';
import type { SourceRef } from './extract';

export type KpiUnit = 'currency' | 'percent' | 'ratio' | 'count' | 'days' | 'score';

export type KpiDirection = 'higher-better' | 'lower-better' | 'target-band';

/**
 * A sector KPI (spec §8.1). Every KPI carries its own human-readable formula
 * and, when computed, its evidence refs — the UI cannot render a number without
 * its provenance.
 */
export interface KpiDefinition<T> {
  id: string;
  label: Localized;
  unit: KpiUnit;
  /** Human-readable formula, rendered under the number. Mandatory. */
  formula: Localized;
  /** Canonical fields this KPI needs; a missing one degrades it to `unavailable`. */
  requiredFields: (keyof T | string)[];
  compute(data: T): KpiResult;
  direction: KpiDirection;
  benchmarkKey?: string;
  /** Explainer shown on hover — teach the user their own domain. */
  interpretation: Localized;
}

export interface KpiBreakdownItem {
  label: string;
  value: Decimal;
}

export interface KpiResult {
  kpiId: string;
  status: 'ok' | 'unavailable';
  value?: Decimal;
  unavailableReason?: string;
  /** Which cells produced this number. Mandatory when `status === 'ok'`. */
  evidence: SourceRef[];
  breakdown?: KpiBreakdownItem[];
}
