// Extract-layer contract (§7.1)
export type {
  CellValue,
  ExtractionMethod,
  SourceRef,
  ExtractedTable,
  ExtractedTableMeta,
} from './extract';
export { SourceRefSchema } from './extract-schema';

// Common (§8, §11)
export { SECTOR_IDS, Decimal } from './common';
export type { SectorId, Localized } from './common';

// Adapter contract (§8)
export type {
  SectorAdapter,
  AdapterMeta,
  DetectionResult,
  MapContext,
  MapResult,
  MappingMethod,
  ColumnMapping,
  MissingField,
  ReportSpec,
} from './adapter';

// KPIs (§8.1)
export type { KpiDefinition, KpiResult, KpiUnit, KpiDirection, KpiBreakdownItem } from './kpi';

// Benchmarks (§8.2)
export type { BenchmarkSet, BenchmarkEntry, BenchmarkComparison } from './benchmark';

// Prompt pack (§8.3)
export type { PromptPack, AnalysisContext } from './prompt';

// Insight (§8.4)
export { InsightSchema } from './insight';
export type { Insight, Finding, Action } from './insight';

// LLM router contract (§9.1)
export type {
  LlmRouter,
  LlmTask,
  LlmCompleteOpts,
  LlmResult,
  LlmStreamChunk,
  LlmUsage,
} from './llm';

// Helpers (§10)
export {
  normalizeHeader,
  levenshtein,
  similarity,
  matchHeader,
  matchHeaders,
} from './alias';
export type { AliasMatch, MatchOptions, HeaderMatchResult } from './alias';

// Locale-aware number parser (§7.3) — shared by extract (core) and adapters
export { parseLocaleNumber } from './parse-number';
export type { ParsedNumber, NumberLocale, ParseNumberOptions } from './parse-number';
