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
import { computeFnbSignals, fnbAdapter } from '../src/index';

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/fnb');

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
  const bytes = new Uint8Array(readFileSync(resolve(fixturesDir, 'fnb-60d.csv')));
  const answerKey = JSON.parse(readFileSync(resolve(fixturesDir, 'answer-key.json'), 'utf8')) as {
    plantedProblems: { id: string; detail: string }[];
  };

  const tables = await extract({ fileId: 'fnb-60d', filename: 'fnb-60d.csv', bytes });
  const e = await enrich(fnbAdapter, tables, { llm: stubLlm, locale: 'tr' });
  console.log(`Eşleme güveni: ${e.mapConfidence.toFixed(2)} · satır: ${e.data.rows.length}`);

  const s = computeFnbSignals(e.data);
  console.log('\n— Sinyal kontrol —');
  console.log('Menü çeyrek sayıları:', s.menu?.counts);
  console.log('Dog kalemler:', s.menu?.items.filter((i) => i.quadrant === 'dog').map((i) => i.item));
  console.log('Plowhorse kalemler:', s.menu?.items.filter((i) => i.quadrant === 'plowhorse').map((i) => i.item));
  console.log('Öğün marj:', s.daypartMargin);

  const router = createLlmRouter({ resolveModel: googleModelResolver(resolveGoogleApiKeyFromProcess()) });
  console.log('\nCanlı analiz…');
  const analysis = await withRetry(() => analyze(fnbAdapter, e, router, 'tr'));
  const insight = analysis.insight;
  const text = JSON.stringify(insight).toLowerCase();

  console.log(`📊 ${insight.headline} (${insight.healthScore}/100)`);
  for (const f of insight.findings) console.log(`  • [${f.severity}] ${f.title}`);

  const some = (w: string[]): boolean => w.some((x) => text.includes(x));
  const scorers: Record<string, () => boolean> = {
    'menu-dog': () => text.includes('güveç') && some(['dog', 'köpek']),
    'menu-plowhorse': () => text.includes('köfte') && some(['plowhorse', 'beygir', 'yeniden fiyat', 're-cost', 'düşük katkı', 'düşük marj']),
    'lunch-unprofitable': () => some(['öğle', 'lunch']) && some(['food cost', 'marj', 'kâr', 'zarar', 'yüksek maliyet', 'düşük']),
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
