import type { ModelPricing } from './config';

/** Token usage from a provider call (AI SDK v5 shape). */
export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  /** Portion of input served from the context cache (billed at ~10%). */
  cachedInputTokens?: number;
}

/**
 * Actual USD cost of a call, crediting the cached-prefix discount (§9.4). The
 * prompt-pack prefix (persona+domain+method) is a stable cached prefix, so a
 * large share of input tokens bill at the cached rate.
 */
export function computeCostUsd(usage: TokenUsage, pricing: ModelPricing): number {
  const input = usage.inputTokens ?? 0;
  const cached = Math.min(usage.cachedInputTokens ?? 0, input);
  const fresh = input - cached;
  const output = usage.outputTokens ?? 0;
  const cost =
    (fresh * pricing.inputPerM + cached * pricing.cachedInputPerM + output * pricing.outputPerM) /
    1_000_000;
  return cost;
}

/** Reads accumulated spend for the current day (implemented against the DB). */
export interface SpendTracker {
  todayUsd(): Promise<number>;
}

export interface CeilingCheck {
  allowed: boolean;
  spentUsd: number;
  ceilingUsd: number;
}

/**
 * Enforce the daily spend ceiling (§9.4). When hit, new analyses are refused
 * with a friendly message while pre-computed fixtures keep working.
 */
export async function checkDailyCeiling(
  tracker: SpendTracker,
  ceilingUsd: number,
): Promise<CeilingCheck> {
  const spentUsd = await tracker.todayUsd();
  return { allowed: spentUsd < ceilingUsd, spentUsd, ceilingUsd };
}
