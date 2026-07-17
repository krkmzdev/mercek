import type { Insight, LlmRouter, SectorAdapter } from '@mercek/sdk';
import { validateInsightEvidence, type EvidenceReport } from '../llm/evidence-gate';
import type { EnrichResult } from './enrich';

export interface AnalyzeResult {
  insight: Insight;
  /** Hallucination-guard report over the insight's evidence (§8.4). */
  evidence: EvidenceReport;
  model: string;
  costUsd: number;
}

/**
 * The Analyze stage (spec §5): feed the enriched KPIs/benchmarks through the
 * sector's prompt pack to the LLM, get a structured {@link Insight}, then run
 * the evidence-validation gate. The persona/domainKnowledge/method prefix is
 * stable per sector (cacheable, §8.3); only the user prompt varies.
 */
export async function analyze<T>(
  adapter: SectorAdapter<T>,
  enriched: EnrichResult<T>,
  router: LlmRouter,
  locale: 'tr' | 'en' = 'tr',
): Promise<AnalyzeResult> {
  const p = adapter.prompts;
  const system = [p.persona, p.domainKnowledge, p.method].join('\n\n');
  const prompt = p.buildUserPrompt({
    data: enriched.data,
    kpis: enriched.kpis,
    benchmarks: enriched.benchmarks,
    missingFields: enriched.missingFields,
    locale,
  });

  const res = await router.complete('analyze', { schema: p.insightSchema, system, prompt });
  return {
    insight: res.data,
    evidence: validateInsightEvidence(res.data, enriched.kpis),
    model: res.model,
    costUsd: res.usage.costUsd,
  };
}
