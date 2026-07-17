import { z } from 'zod';
import { SourceRefSchema } from './extract-schema';

/**
 * Structured LLM output (spec §8.4). Every finding must carry at least one
 * piece of evidence — no evidence, no finding. The engine's validation gate
 * (§8.4) flags any claim referencing a number not in the computed KPI set.
 */
export const InsightSchema = z.object({
  headline: z.string(),
  healthScore: z.number().min(0).max(100),
  summary: z.string(),

  /**
   * Plain-language summary for a non-technical business owner — no jargon
   * (no "NRR", "OEE", "Quick Ratio"). Answers: how are things, what matters
   * most, what to do. Rendered as the report's top "Sade Özet" panel.
   */
  plainSummary: z.object({
    verdict: z.enum(['iyi', 'orta', 'dikkat']),
    headline: z.string(),
    whatMatters: z.string(),
    whatToDo: z.string(),
  }),

  findings: z
    .array(
      z.object({
        severity: z.enum(['critical', 'warning', 'opportunity', 'positive']),
        title: z.string(),
        body: z.string(),
        evidence: z
          .array(
            z.object({
              kpiId: z.string().nullable(),
              sourceRef: SourceRefSchema.nullable(),
              claim: z.string(),
            }),
          )
          .min(1),
        confidence: z.enum(['high', 'medium', 'low']),
      }),
    )
    .min(3)
    .max(8),

  actions: z
    .array(
      z.object({
        priority: z.number().int().min(1),
        title: z.string(),
        rationale: z.string(),
        expectedImpact: z.string(),
        effort: z.enum(['low', 'medium', 'high']),
        relatedFindings: z.array(z.string()),
      }),
    )
    .min(2)
    .max(5),

  dataGaps: z.array(z.string()),
});

export type Insight = z.infer<typeof InsightSchema>;
export type Finding = Insight['findings'][number];
export type Action = Insight['actions'][number];
