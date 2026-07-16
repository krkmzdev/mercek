import type { LlmTask } from '@mercek/sdk';

/**
 * Model routing table as DATA, not constants (spec §9.2). Model ids drift
 * (Gemini 2.0 Flash was shut down 2026-06-01; Pro left the free tier
 * 2026-04-01), so swapping a model must be a one-line edit here.
 *
 * VERIFIED 2026-07-16 with live generateContent on a fresh free-tier key:
 * `gemini-2.5-*` return 404 "no longer available to new users", and Pro is
 * 429 (paid-tier only, per §9.3). The `-latest` aliases resolve to a currently
 * available model and won't 404 as models rotate — the right hedge against
 * drift. `analyze-deep` (pro-latest) only works on the paid tier; on free-tier
 * dev, escalation to it degrades gracefully. Pricing is approximate — verify
 * against ai.google.dev/pricing. Swapping a model is a one-line edit (§9.2).
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
  // NOTE: free tier — gemini-flash-latest is frequently 503 (high demand), so
  // dev pins the reliable flash-lite. On the paid tier, bump vision-extract and
  // analyze to `gemini-flash-latest` for OCR/analysis quality (§7.3).
  'vision-extract': {
    model: 'gemini-flash-lite-latest',
    pricing: { inputPerM: 0.1, cachedInputPerM: 0.025, outputPerM: 0.4 },
  },
  'schema-map': {
    model: 'gemini-flash-lite-latest',
    pricing: { inputPerM: 0.1, cachedInputPerM: 0.025, outputPerM: 0.4 },
  },
  analyze: {
    model: 'gemini-flash-lite-latest',
    pricing: { inputPerM: 0.1, cachedInputPerM: 0.025, outputPerM: 0.4 },
  },
  'analyze-deep': {
    model: 'gemini-pro-latest',
    pricing: { inputPerM: 1.25, cachedInputPerM: 0.3125, outputPerM: 10 },
  },
};
