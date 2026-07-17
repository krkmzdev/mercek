import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analyze,
  createLlmRouter,
  enrich,
  extract,
  googleModelResolver,
  resolveGoogleApiKeyFromProcess,
} from '@mercek/core';
import type { LlmRouter } from '@mercek/sdk';
import { computeFinanceSignals, financeAdapter } from '../src/index';

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/finance');

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

const stubLlm: LlmRouter = {
  complete: () => Promise.reject(new Error('map needs no LLM')),
  stream: () => {
    throw new Error('unused');
  },
};

async function main(): Promise<void> {
  const bytes = new Uint8Array(readFileSync(resolve(fixturesDir, 'finance-8q.csv')));
  const answerKey = JSON.parse(readFileSync(resolve(fixturesDir, 'answer-key.json'), 'utf8')) as {
    plantedProblems: { id: string; detail: string }[];
  };

  const tables = await extract({ fileId: 'finance-8q', filename: 'finance-8q.csv', bytes });
  const e = await enrich(financeAdapter, tables, { llm: stubLlm, locale: 'tr' });
  console.log(`Eşleme güveni: ${e.mapConfidence.toFixed(2)} · dönem: ${e.data.periods.length}`);

  const s = computeFinanceSignals(e.data);
  console.log('\n— Sinyal kontrol —');
  console.log('Real-return:', s.realReturn);
  console.log('CCC ilk→son:', s.ccc[0]?.ccc, '→', s.ccc[s.ccc.length - 1]?.ccc);
  console.log('Net marj ilk→son:', s.trend[0]?.netMarginPct, '→', s.trend[s.trend.length - 1]?.netMarginPct);

  const router = createLlmRouter({ resolveModel: googleModelResolver(resolveGoogleApiKeyFromProcess()) });
  console.log('\nCanlı analiz…');
  const analysis = await withRetry(() => analyze(financeAdapter, e, router, 'tr'));
  const insight = analysis.insight;
  const text = JSON.stringify(insight).toLowerCase();
  console.log(`📊 ${insight.headline} (${insight.healthScore}/100)`);
  for (const f of insight.findings) console.log(`  • [${f.severity}] ${f.title}`);

  const some = (w: string[]): boolean => w.some((x) => text.includes(x));
  const scorers: Record<string, () => boolean> = {
    'real-contraction': () => text.includes('reel') && some(['daral', 'negatif', 'eksi', 'küçül', 'geril', 'düş', '-']),
    'lengthening-ccc': () => some(['nakit dönüşüm', 'nakit döngüsü', 'ccc']) && some(['uza', 'art', 'yüksel', 'kötüleş', 'büyü']),
    'margin-erosion': () => text.includes('marj') && some(['eri', 'düş', 'daral', 'azal', 'gerile']),
  };

  console.log('\n— Eval —');
  let found = 0;
  for (const pp of answerKey.plantedProblems) {
    const hit = scorers[pp.id]?.() ?? false;
    if (hit) found++;
    console.log(`  ${hit ? '✅' : '❌'} ${pp.id}: ${pp.detail}`);
  }
  console.log(`\nAI ${found}/3 · maliyet ${analysis.costUsd.toFixed(6)} USD`);
  process.exitCode = found === 3 ? 0 : 2;
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
