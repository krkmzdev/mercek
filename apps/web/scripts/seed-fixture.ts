/**
 * Pre-computes the sector fixture analyses and seeds them as cached fixture
 * reports (spec §9.4: a visitor clicking "örnek veriyi dene" costs $0).
 * Run: pnpm --filter @mercek/web seed:fixture
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
  type EnrichResult,
} from '@mercek/core';
import { computeSignals as retailSignals, retailAdapter } from '@mercek/adapter-retail';
import { computeFnbSignals, fnbAdapter } from '@mercek/adapter-fnb';
import { computeFinanceSignals, financeAdapter } from '@mercek/adapter-finance';
import { prisma } from '@mercek/db';
import type { LlmRouter, SectorAdapter } from '@mercek/sdk';
import { buildReportView, type ReportCharts } from '../lib/report';

const fixturesRoot = resolve(process.cwd(), '../../fixtures');

const stubLlm: LlmRouter = {
  complete: () => Promise.reject(new Error('map needs no LLM')),
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

/* eslint-disable @typescript-eslint/no-explicit-any -- pipeline output is erased across sectors */
type AnyEnrich = EnrichResult<any>;

interface SectorSeed {
  id: string;
  sector: 'RETAIL' | 'FNB' | 'FINANCE';
  adapter: SectorAdapter<any>;
  file: string;
  buildCharts: (e: AnyEnrich) => ReportCharts;
}

const SEEDS: SectorSeed[] = [
  {
    id: 'retail-demo',
    sector: 'RETAIL',
    adapter: retailAdapter as SectorAdapter<any>,
    file: 'retail/retail-90d.csv',
    buildCharts: (e) => {
      const s = retailSignals(e.data);
      const pareto = e.kpis.find((k: any) => k.kpiId === 'pareto');
      return {
        pareto: pareto?.breakdown?.map((b: any) => ({ label: b.label, value: b.value.toNumber() })),
        categoryTrend: s.categoryTrend.map((c) => ({ category: c.category, first: c.firstRev, last: c.lastRev, changePct: c.changePct })),
        returnBySku: s.returnBySku.map((r) => ({ sku: r.sku, returnRatePct: r.returnRatePct, sales: r.sales })),
      };
    },
  },
  {
    id: 'fnb-demo',
    sector: 'FNB',
    adapter: fnbAdapter as SectorAdapter<any>,
    file: 'fnb/fnb-60d.csv',
    buildCharts: (e) => {
      const s = computeFnbSignals(e.data);
      return {
        menuMatrix: s.menu?.items.map((i) => ({ item: i.item, popularityPct: i.popularityPct, cmPerUnit: i.cmPerUnit, quadrant: i.quadrant })),
        daypartMargin: s.daypartMargin.map((d) => ({ daypart: d.daypart, revenuePct: d.revenuePct, foodCostPct: d.foodCostPct })),
      };
    },
  },
  {
    id: 'finance-demo',
    sector: 'FINANCE',
    adapter: financeAdapter as SectorAdapter<any>,
    file: 'finance/finance-8q.csv',
    buildCharts: (e) => {
      const s = computeFinanceSignals(e.data);
      const rr = s.realReturn;
      return {
        realReturn: rr
          ? [
              { label: 'Nominal', value: rr.nominalGrowthPct },
              { label: 'TÜFE', value: rr.inflationPct },
              { label: 'Reel', value: rr.realGrowthPct },
            ]
          : undefined,
        cccTrend: s.ccc.map((c) => ({ period: c.period, ccc: c.ccc })),
      };
    },
  },
];

async function seedOne(seed: SectorSeed, router: LlmRouter): Promise<void> {
  const bytes = new Uint8Array(readFileSync(resolve(fixturesRoot, seed.file)));
  const filename = seed.file.split('/').pop()!;
  const tables = await extract({ fileId: seed.id, filename, bytes });
  const enriched = await enrich(seed.adapter, tables, { llm: stubLlm, locale: 'tr' });
  const analysis = await withRetry(() => analyze(seed.adapter, enriched, router, 'tr'));

  const rowsOrPeriods = (enriched.data as { rows?: unknown[]; periods?: unknown[] });
  const rowCount = rowsOrPeriods.rows?.length ?? rowsOrPeriods.periods?.length ?? 0;

  const view = buildReportView({
    id: seed.id,
    adapter: seed.adapter as SectorAdapter<unknown>,
    enriched: enriched as EnrichResult<unknown>,
    analysis,
    charts: seed.buildCharts(enriched),
    source: { filename, rows: rowCount },
    isFixture: true,
    generatedAt: new Date().toISOString(),
  });

  const data = {
    sector: seed.sector,
    status: 'COMPLETE' as const,
    isFixture: true,
    provider: 'google',
    modelUsed: analysis.model,
    costUsd: analysis.costUsd,
    insight: view as unknown as object,
    purgeAt: new Date('2099-01-01'),
  };
  await prisma.analysis.upsert({ where: { id: seed.id }, create: { id: seed.id, ...data }, update: data });
  console.log(`  ✓ /r/${seed.id} · ${rowCount} kayıt · ${analysis.insight.findings.length} bulgu · ${analysis.costUsd.toFixed(6)} USD`);
}

async function main(): Promise<void> {
  const router = createLlmRouter({ resolveModel: googleModelResolver(resolveGoogleApiKeyFromProcess()) });
  for (const seed of SEEDS) {
    console.log(`${seed.sector} seed…`);
    await seedOne(seed, router);
  }
  process.exitCode = 0;
}

main().catch((err: unknown) => {
  const e = err as { code?: string; message?: string };
  console.error('SEED FAILED:', e.code ?? '', e.message ?? err);
  process.exitCode = 1;
});
