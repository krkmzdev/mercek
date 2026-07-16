import type { LlmTask } from '@mercek/sdk';

/**
 * Model routing table as DATA, not constants (spec §9.2). Model ids drift
 * (Gemini 2.0 Flash was shut down 2026-06-01; Pro left the free tier
 * 2026-04-01), so swapping a model must be a one-line edit here.
 *
 * NOTE (§0 rule #6): these model ids are from the spec and are NOT yet verified
 * against a live key — confirm them when GOOGLE_API_KEY is wired.
 */
export interface ModelPricing {
  /** USD per 1M input tokens. */
  inputPerM: number;
  /** USD per 1M cached-input tokens (Gemini context caching ≈ 10% of input). */
  cachedInputPerM: number;
  /** USD per 1M output tokens. */
  outputPerM: number;
}

export interface TaskModelConfig {
  model: string;
  pricing: ModelPricing;
}

export type RoutingConfig = Record<LlmTask, TaskModelConfig>;

export const routingConfig: RoutingConfig = {
  'vision-extract': {
    model: 'gemini-3-flash',
    pricing: { inputPerM: 0.5, cachedInputPerM: 0.05, outputPerM: 3 },
  },
  'schema-map': {
    model: 'gemini-3.1-flash-lite',
    pricing: { inputPerM: 0.25, cachedInputPerM: 0.025, outputPerM: 1.5 },
  },
  analyze: {
    model: 'gemini-3-flash',
    pricing: { inputPerM: 0.5, cachedInputPerM: 0.05, outputPerM: 3 },
  },
  'analyze-deep': {
    model: 'gemini-3.1-pro',
    pricing: { inputPerM: 2, cachedInputPerM: 0.2, outputPerM: 12 },
  },
};
