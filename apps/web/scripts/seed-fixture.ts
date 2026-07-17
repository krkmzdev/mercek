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
import { retailAdapter } from '@mercek/adapter-retail';
import { fnbAdapter } from '@mercek/adapter-fnb';
import { financeAdapter } from '@mercek/adapter-finance';
import { manufacturingAdapter } from '@mercek/adapter-manufacturing';
import { saasAdapter } from '@mercek/adapter-saas';
import { prisma } from '@mercek/db';
import type { LlmRouter, SectorAdapter, SectorId } from '@mercek/sdk';
import { buildReportView } from '../lib/report';
import { buildChartsFor } from '../lib/build-charts';

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
interface SectorSeed {
  id: string;
  sector: SectorId;
  adapter: SectorAdapter<any>;
  file: string;
}

const SEEDS: SectorSeed[] = [
  { id: 'retail-demo', sector: 'RETAIL', adapter: retailAdapter as SectorAdapter<any>, file: 'retail/retail-90d.csv' },
  { id: 'fnb-demo', sector: 'FNB', adapter: fnbAdapter as SectorAdapter<any>, file: 'fnb/fnb-60d.csv' },
  { id: 'finance-demo', sector: 'FINANCE', adapter: financeAdapter as SectorAdapter<any>, file: 'finance/finance-8q.csv' },
  { id: 'manufacturing-demo', sector: 'MANUFACTURING', adapter: manufacturingAdapter as SectorAdapter<any>, file: 'manufacturing/mfg-30d.csv' },
  { id: 'saas-demo', sector: 'SAAS', adapter: saasAdapter as SectorAdapter<any>, file: 'saas/saas-18mo.csv' },
];

async function seedOne(seed: SectorSeed, router: LlmRouter): Promise<void> {
  const bytes = new Uint8Array(readFileSync(resolve(fixturesRoot, seed.file)));
  const filename = seed.file.split('/').pop()!;
  const tables = await extract({ fileId: seed.id, filename, bytes });
  const enriched = await enrich(seed.adapter, tables, { llm: stubLlm, locale: 'tr' });
  const analysis = await withRetry(() => analyze(seed.adapter, enriched, router, 'tr'));

  const d = enriched.data as { rows?: unknown[]; periods?: unknown[] };
  const rowCount = d.rows?.length ?? d.periods?.length ?? 0;

  const view = buildReportView({
    id: seed.id,
    adapter: seed.adapter as SectorAdapter<unknown>,
    enriched: enriched as EnrichResult<unknown>,
    analysis,
    charts: buildChartsFor(seed.sector, enriched),
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
