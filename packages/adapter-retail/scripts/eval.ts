/**
 * Retail eval (spec §14): fixture → extract → map → KPIs → LIVE analysis, then
 * score whether the AI surfaced the three planted problems. Costs money; run on
 * demand: pnpm --filter @mercek/adapter-retail eval
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createLlmRouter,
  enrich,
  extract,
  googleModelResolver,
  resolveGoogleApiKeyFromProcess,
} from '@mercek/core';
import type { Insight, LlmResult, LlmRouter } from '@mercek/sdk';
import { computeSignals, retailAdapter } from '../src/index';

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/retail');

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
  complete: () => Promise.reject(new Error('map should not need the LLM here')),
  stream: () => {
    throw new Error('unused');
  },
};

async function main(): Promise<void> {
  const bytes = new Uint8Array(readFileSync(resolve(fixturesDir, 'retail-90d.csv')));
  const answerKey = JSON.parse(readFileSync(resolve(fixturesDir, 'answer-key.json'), 'utf8')) as {
    plantedProblems: { id: string; detail: string }[];
  };

  const tables = await extract({ fileId: 'retail-90d', filename: 'retail-90d.csv', bytes });
  const e = await enrich(retailAdapter, tables, { llm: stubLlm, locale: 'tr' });

  console.log(`Eşleme güveni: ${e.mapConfidence.toFixed(2)} · haritalanan satır: ${e.data.rows.length}`);
  console.log(`Eksik alanlar: ${e.missingFields.map((m) => m.field).join(', ') || '(yok)'}`);

  // Verify the fixture actually carries the anomalies (deterministic signals).
  const s = computeSignals(e.data);
  console.log('\n— Planted-signal kontrol —');
  console.log('En yüksek iade SKU:', s.returnBySku[0]);
  console.log(
    'Kategori trendi:',
    s.categoryTrend.map((c) => `${c.category} ${c.changePct}%`).join(' | '),
  );
  const worstMarginWeek = [...s.weeklyDiscountMargin].sort(
    (a, b) => (a.grossMarginPct ?? 99) - (b.grossMarginPct ?? 99),
  )[0];
  console.log('En kötü marj haftası:', worstMarginWeek);

  // Live analysis through the router.
  const apiKey = resolveGoogleApiKeyFromProcess();
  const router = createLlmRouter({ resolveModel: googleModelResolver(apiKey) });
  const p = retailAdapter.prompts;
  const system = [p.persona, p.domainKnowledge, p.method].join('\n\n');
  const prompt = p.buildUserPrompt({
    data: e.data,
    kpis: e.kpis,
    benchmarks: e.benchmarks,
    missingFields: e.missingFields,
    locale: 'tr',
  });

  console.log('\nCanlı analiz çalışıyor…');
  const res: LlmResult<Insight> = await withRetry(() =>
    router.complete('analyze', { schema: p.insightSchema, system, prompt }),
  );
  const insight = res.data;
  const text = JSON.stringify(insight).toLowerCase();

  // Score against the answer key.
  const some = (words: string[]): boolean => words.some((w) => text.includes(w));
  const scorers: Record<string, () => boolean> = {
    'return-anomaly': () =>
      text.includes('ayk-003') || (text.includes('iade') && some(['anomal', 'aykırı', 'anormal', 'en yüksek', 'yüksek iade'])),
    'category-decline': () => text.includes('elektronik') && some(['düş', 'azal', 'geril', 'daral', 'küçül']),
    'discount-margin': () =>
      some(['indirim', 'iskonto']) && text.includes('marj') && some(['çök', 'düş', 'negatif', 'erime', 'erit', 'zarar']),
  };

  console.log('\n— Bulgular —');
  console.log(`📊 ${insight.headline} (skor ${insight.healthScore}/100)`);
  for (const f of insight.findings) console.log(`  • [${f.severity}] ${f.title}`);

  console.log('\n— Eval skoru —');
  let found = 0;
  for (const pp of answerKey.plantedProblems) {
    const hit = scorers[pp.id]?.() ?? false;
    if (hit) found++;
    console.log(`  ${hit ? '✅' : '❌'} ${pp.id}: ${pp.detail}`);
  }
  console.log(`\nAI ${found}/3 gizli sorunu buldu · maliyet ${res.usage.costUsd.toFixed(6)} USD`);
  process.exitCode = found === 3 ? 0 : 2;
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
