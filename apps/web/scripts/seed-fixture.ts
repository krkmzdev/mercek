/**
 * Pre-computes the Retail fixture analysis and seeds it as a cached fixture
 * report (spec §9.4: "fixtures are pre-computed and cached — a visitor clicking
 * 'örnek veriyi dene' costs $0"). Run: pnpm --filter @mercek/web seed:fixture
 */
import './load-env';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  analyze,
  createLlmRouter,
  enrich,
  extract,
  googleModelResolver,
  resolveGoogleApiKeyFromProcess,
} from '@mercek/core';
import { computeSignals, retailAdapter } from '@mercek/adapter-retail';
import { prisma } from '@mercek/db';
import type { LlmRouter } from '@mercek/sdk';
import { buildReportView, type ReportCharts } from '../lib/report';

const FIXTURE_ID = 'retail-demo';
const fixturePath = resolve(process.cwd(), '../../fixtures/retail/retail-90d.csv');

const stubLlm: LlmRouter = {
  complete: () => Promise.reject(new Error('map should not need the LLM')),
  stream: () => {
    throw new Error('unused');
  },
};

async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      if (!/503|overloaded|high demand|UNAVAILABLE/i.test(m) || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 2500 * (i + 1)));
    }
  }
  throw new Error('unreachable');
}

async function main(): Promise<void> {
  const bytes = new Uint8Array(readFileSync(fixturePath));
  const tables = await extract({ fileId: FIXTURE_ID, filename: 'retail-90d.csv', bytes });
  const enriched = await enrich(retailAdapter, tables, { llm: stubLlm, locale: 'tr' });

  const router = createLlmRouter({ resolveModel: googleModelResolver(resolveGoogleApiKeyFromProcess()) });
  console.log('Canlı analiz (fixture, bir kez)…');
  const analysis = await withRetry(() => analyze(retailAdapter, enriched, router, 'tr'));

  const s = computeSignals(enriched.data);
  const paretoKpi = enriched.kpis.find((k) => k.kpiId === 'pareto');
  const charts: ReportCharts = {
    pareto: paretoKpi?.breakdown?.map((b) => ({ label: b.label, value: b.value.toNumber() })),
    categoryTrend: s.categoryTrend.map((c) => ({
      category: c.category,
      first: c.firstRev,
      last: c.lastRev,
      changePct: c.changePct,
    })),
    returnBySku: s.returnBySku.map((r) => ({ sku: r.sku, returnRatePct: r.returnRatePct, sales: r.sales })),
  };

  const view = buildReportView({
    id: FIXTURE_ID,
    adapter: retailAdapter as unknown as Parameters<typeof buildReportView>[0]['adapter'],
    enriched: enriched as unknown as Parameters<typeof buildReportView>[0]['enriched'],
    analysis,
    charts,
    source: { filename: 'retail-90d.csv', rows: enriched.data.rows.length },
    isFixture: true,
    generatedAt: new Date().toISOString(),
  });

  const data = {
    sector: 'RETAIL' as const,
    status: 'COMPLETE' as const,
    isFixture: true,
    provider: 'google',
    modelUsed: analysis.model,
    costUsd: analysis.costUsd,
    insight: view as unknown as object,
    purgeAt: new Date('2099-01-01'),
  };

  await prisma.analysis.upsert({
    where: { id: FIXTURE_ID },
    create: { id: FIXTURE_ID, ...data },
    update: data,
  });

  console.log(
    `Seeded /r/${FIXTURE_ID} · ${enriched.data.rows.length} satır · ${analysis.insight.findings.length} bulgu · maliyet ${analysis.costUsd.toFixed(6)} USD · evidence flag ${analysis.evidence.flagRate}`,
  );
  process.exitCode = 0;
}

main().catch((err: unknown) => {
  const e = err as { code?: string; message?: string };
  console.error('PRISMA CODE:', e.code);
  console.error('MESSAGE:', e.message);
  process.exitCode = 1;
});
