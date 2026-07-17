import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analyze, createLlmRouter, enrich, extract, googleModelResolver, resolveGoogleApiKeyFromProcess,
} from '@mercek/core';
import type { LlmRouter } from '@mercek/sdk';
import { computeMfgSignals, manufacturingAdapter } from '../src/index';

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/manufacturing');

async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      if (!/503|overloaded|high demand|UNAVAILABLE/i.test(m) || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 2500 * (i + 1)));
    }
  }
  throw new Error('unreachable');
}
const stubLlm: LlmRouter = { complete: () => Promise.reject(new Error('no llm')), stream: () => { throw new Error('x'); } };

async function main(): Promise<void> {
  const bytes = new Uint8Array(readFileSync(resolve(fixturesDir, 'mfg-30d.csv')));
  const answerKey = JSON.parse(readFileSync(resolve(fixturesDir, 'answer-key.json'), 'utf8')) as { plantedProblems: { id: string; detail: string }[] };

  const tables = await extract({ fileId: 'mfg-30d', filename: 'mfg-30d.csv', bytes });
  const e = await enrich(manufacturingAdapter, tables, { llm: stubLlm, locale: 'tr' });
  console.log(`Eşleme güveni: ${e.mapConfidence.toFixed(2)} · satır: ${e.data.rows.length}`);

  const s = computeMfgSignals(e.data);
  console.log('\n— Sinyal —');
  console.log('Genel OEE:', s.overall && Math.round(s.overall.oee * 1000) / 10, '· bağlayıcı:', s.binding);
  console.log('Makine OEE:', s.byMachine.map((m) => `${m.machineId}:${Math.round(m.oee * 1000) / 10}(A${Math.round(m.availability * 100)})`).join(' '));
  console.log('Duruş top:', s.downtime[0]);

  const router = createLlmRouter({ resolveModel: googleModelResolver(resolveGoogleApiKeyFromProcess()) });
  console.log('\nCanlı analiz…');
  const analysis = await withRetry(() => analyze(manufacturingAdapter, e, router, 'tr'));
  const text = JSON.stringify(analysis.insight).toLowerCase();
  console.log(`📊 ${analysis.insight.headline} (${analysis.insight.healthScore}/100)`);
  for (const f of analysis.insight.findings) console.log(`  • [${f.severity}] ${f.title}`);

  const some = (w: string[]): boolean => w.some((x) => text.includes(x));
  const scorers: Record<string, () => boolean> = {
    'availability-constraint': () => some(['kullanılabilirlik', 'availability']) || (text.includes('duruş') && some(['kısıt', 'sorun', 'düşük', 'en büyük', 'birincil', 'ana'])),
    'problem-machine': () => some(['m3', 'makine 3', 'm-3', 'm 3']),
    'downtime-pareto': () => text.includes('kalıp'),
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
main().catch((err: unknown) => { console.error(err instanceof Error ? err.message : err); process.exitCode = 1; });
