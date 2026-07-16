import type { z } from 'zod';
import type { BenchmarkComparison } from './benchmark';
import type { Insight } from './insight';
import type { KpiResult } from './kpi';
import type { MissingField } from './adapter';

/** Everything the analysis prompt needs about one instance (dynamic part). */
export interface AnalysisContext<T> {
  data: T;
  kpis: KpiResult[];
  benchmarks: BenchmarkComparison[];
  missingFields: MissingField[];
  locale: 'tr' | 'en';
}

/**
 * The sector's prompt pack (spec §8.3). `persona + domainKnowledge + method`
 * is STATIC per sector and forms a cacheable prefix (Gemini context caching,
 * ~10% of standard rate). Only {@link buildUserPrompt} varies per request.
 * Bump the pack version whenever this text changes (§8.3, §15).
 */
export interface PromptPack<T> {
  /** STATIC, cached prefix — who the analyst is. */
  persona: string;
  /** STATIC, cached prefix — the sector's master-level domain knowledge. */
  domainKnowledge: string;
  /** STATIC, cached prefix — the analytical method for this sector. */
  method: string;
  /** Structured-output contract. */
  insightSchema: z.ZodType<Insight>;
  /** DYNAMIC — only this changes per request. */
  buildUserPrompt(ctx: AnalysisContext<T>): string;
}
