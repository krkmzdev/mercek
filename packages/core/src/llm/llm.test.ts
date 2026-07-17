import { describe, expect, it } from 'vitest';
import { InsightSchema, type Insight, type KpiResult } from '@mercek/sdk';
import { computeCostUsd, checkDailyCeiling } from './cost';
import { shouldEscalate } from './escalation';
import { resolveGoogleApiKey } from './env';
import { validateInsightEvidence } from './evidence-gate';
import { InMemoryRateLimiter } from './rate-limit';
import { routingConfig } from './config';

describe('computeCostUsd', () => {
  const pricing = { inputPerM: 0.5, cachedInputPerM: 0.05, outputPerM: 3 };

  it('prices fresh input + output', () => {
    // 1M input, 1M output → 0.5 + 3 = 3.5
    expect(computeCostUsd({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, pricing)).toBeCloseTo(
      3.5,
      6,
    );
  });

  it('credits the cached-prefix discount', () => {
    // 1M input of which 800k cached → 200k*0.5 + 800k*0.05 = 0.1 + 0.04 = 0.14 /M
    const cost = computeCostUsd(
      { inputTokens: 1_000_000, cachedInputTokens: 800_000, outputTokens: 0 },
      pricing,
    );
    expect(cost).toBeCloseTo(0.14, 6);
  });
});

describe('checkDailyCeiling', () => {
  it('allows under and blocks at/over the ceiling', async () => {
    expect((await checkDailyCeiling({ todayUsd: () => Promise.resolve(1.5) }, 2)).allowed).toBe(true);
    expect((await checkDailyCeiling({ todayUsd: () => Promise.resolve(2) }, 2)).allowed).toBe(false);
  });
});

describe('shouldEscalate', () => {
  const base = {
    mapConfidence: 1,
    unavailableKpiCount: 0,
    flashValidationFailed: false,
    userRequestedDeep: false,
  };
  it('does not escalate on clean signals', () => {
    expect(shouldEscalate(base).escalate).toBe(false);
  });
  it('escalates on low map confidence', () => {
    expect(shouldEscalate({ ...base, mapConfidence: 0.6 }).escalate).toBe(true);
  });
  it('escalates on too many unavailable KPIs', () => {
    expect(shouldEscalate({ ...base, unavailableKpiCount: 4 }).escalate).toBe(true);
  });
  it('escalates when the user requested deep mode', () => {
    expect(shouldEscalate({ ...base, userRequestedDeep: true }).reasons).toHaveLength(1);
  });
});

describe('resolveGoogleApiKey', () => {
  it('uses the dev key outside production', () => {
    expect(resolveGoogleApiKey({ nodeEnv: 'development', devKey: 'dev', prodKey: undefined })).toBe(
      'dev',
    );
  });
  it('requires the prod key in production (fail loud)', () => {
    expect(() =>
      resolveGoogleApiKey({ nodeEnv: 'production', devKey: 'dev', prodKey: undefined }),
    ).toThrow(/GOOGLE_API_KEY_PROD/);
  });
  it('uses the prod key in production when present', () => {
    expect(resolveGoogleApiKey({ nodeEnv: 'production', devKey: 'dev', prodKey: 'prod' })).toBe(
      'prod',
    );
  });
});

describe('InMemoryRateLimiter', () => {
  it('enforces the guest daily limit and resets the next day', async () => {
    let now = Date.parse('2026-07-16T10:00:00Z');
    const rl = new InMemoryRateLimiter({ guestPerDay: 3, authedPerDay: 10, deepPerDay: 1 }, () => now);

    for (let i = 0; i < 3; i++) expect((await rl.limit('ip1', 'guest')).success).toBe(true);
    expect((await rl.limit('ip1', 'guest')).success).toBe(false); // 4th blocked

    now = Date.parse('2026-07-17T10:00:00Z'); // next day
    expect((await rl.limit('ip1', 'guest')).success).toBe(true);
  });

  it('separates buckets by action and identifier', async () => {
    const rl = new InMemoryRateLimiter();
    expect((await rl.limit('ip1', 'deep')).success).toBe(true);
    expect((await rl.limit('ip1', 'deep')).success).toBe(false); // deep = 1/day
    expect((await rl.limit('ip2', 'deep')).success).toBe(true); // different ip ok
  });
});

describe('routingConfig integrity', () => {
  it('has all four tasks with positive prices', () => {
    for (const task of ['vision-extract', 'schema-map', 'analyze', 'analyze-deep'] as const) {
      const cfg = routingConfig[task];
      expect(cfg.model).toBeTruthy();
      expect(cfg.pricing.inputPerM).toBeGreaterThan(0);
      expect(cfg.pricing.cachedInputPerM).toBeLessThanOrEqual(cfg.pricing.inputPerM);
    }
  });
});

// Minimal valid Insight for the evidence gate.
function insightWith(kpiId: string | null): Insight {
  const finding = {
    severity: 'warning' as const,
    title: 'Test finding',
    body: 'body',
    evidence: [{ kpiId, sourceRef: null, claim: '34.2%' }],
    confidence: 'high' as const,
  };
  return InsightSchema.parse({
    headline: 'h',
    healthScore: 50,
    summary: 's',
    plainSummary: { verdict: 'orta', headline: 'sade', whatMatters: 'x', whatToDo: 'y' },
    findings: [finding, { ...finding, title: 'F2' }, { ...finding, title: 'F3' }],
    actions: [
      { priority: 1, title: 'a', rationale: 'r', expectedImpact: 'i', effort: 'low', relatedFindings: [] },
      { priority: 2, title: 'b', rationale: 'r', expectedImpact: 'i', effort: 'low', relatedFindings: [] },
    ],
    dataGaps: [],
  });
}

describe('validateInsightEvidence', () => {
  const okKpis: KpiResult[] = [{ kpiId: 'food_cost', status: 'ok', evidence: [] }];

  it('passes when evidence cites a real ok KPI', () => {
    const report = validateInsightEvidence(insightWith('food_cost'), okKpis);
    expect(report.flagRate).toBe(0);
  });

  it('flags findings that cite an unknown KPI (hallucination guard)', () => {
    const report = validateInsightEvidence(insightWith('made_up_kpi'), okKpis);
    expect(report.flags.length).toBe(3);
    expect(report.flagRate).toBe(1);
    expect(report.flags[0]!.reason).toContain('made_up_kpi');
  });
});
