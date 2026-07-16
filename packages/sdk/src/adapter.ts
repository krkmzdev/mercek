import type { z } from 'zod';
import type { BenchmarkSet } from './benchmark';
import type { Localized, SectorId } from './common';
import type { ExtractedTable, SourceRef } from './extract';
import type { KpiDefinition } from './kpi';
import type { LlmRouter } from './llm';
import type { PromptPack } from './prompt';

/**
 * A sector adapter — the spine of the project (spec §8). Adding a sector is
 * one adapter + one registry line. Everything else in the engine serves this
 * contract.
 */
export interface SectorAdapter<TCanonical> {
  id: SectorId;
  meta: AdapterMeta;
  /** Zod schema for this sector's canonical shape. Single source of truth. */
  canonicalSchema: z.ZodType<TCanonical>;
  /** Cheap heuristic: does this data look like our sector? */
  detect(tables: ExtractedTable[]): Promise<DetectionResult>;
  /** Messy headers → canonical fields. Deterministic first, LLM fallback. */
  map(tables: ExtractedTable[], ctx: MapContext): Promise<MapResult<TCanonical>>;
  kpis: KpiDefinition<TCanonical>[];
  benchmarks: BenchmarkSet;
  prompts: PromptPack<TCanonical>;
  report: ReportSpec;
}

export interface AdapterMeta {
  name: Localized;
  description: Localized;
  /** Shown in the upload UI: what a good input looks like. */
  expectedInputs: Array<{
    label: Localized;
    fields: string[];
    example: string;
  }>;
  /** Sample dataset ids in /fixtures. */
  fixtureIds: string[];
}

export interface DetectionResult {
  confidence: number;
  matchedSignals: string[];
}

export interface MapContext {
  /** Adapters may call the LLM for fuzzy mapping. */
  llm: LlmRouter;
  locale: 'tr' | 'en';
}

export interface MapResult<T> {
  data: T;
  /** Audit trail — shown in the UI. */
  mapping: ColumnMapping[];
  unmappedColumns: string[];
  /** Canonical fields we could not fill. */
  missingFields: MissingField[];
  confidence: number;
}

export type MappingMethod = 'exact' | 'alias' | 'fuzzy' | 'llm' | 'manual';

export interface ColumnMapping {
  sourceHeader: string;
  sourceRef: SourceRef;
  canonicalField: string;
  confidence: number;
  method: MappingMethod;
}

export interface MissingField {
  field: string;
  impact: string;
  affectedKpis: string[];
}

/** Which sector-specific charts the report renders (detail lands in S5). */
export interface ReportSpec {
  charts: string[];
}
