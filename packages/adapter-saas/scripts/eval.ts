import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analyze, createLlmRouter, enrich, extract, googleModelResolver, resolveGoogleApiKeyFromProcess,
} from '@mercek/core';
import type { LlmRouter } from '@mercek/sdk';
import { computeSaasSignals, saasAdapter } from '../src/index';

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/saas');

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
  const bytes = new Uint8Array(readFileSync(resolve(fixturesDir, 'saas-18mo.csv')));
  const answerKey = JSON.parse(readFileSync(resolve(fixturesDir, 'answer-key.json'), 'utf8')) as { plantedProblems: { id: string; detail: string }[] };

  const tables = await extract({ fileId: 'saas-18mo', filename: 'saas-18mo.csv', bytes });
  const e = await enrich(saasAdapter, tables, { llm: stubLlm, locale: 'tr' });
  console.log(`Eşleme güveni: ${e.mapConfidence.toFixed(2)} · satır: ${e.data.rows.length}`);

  const s = computeSaasSignals(e.data);
  const kv = new Map(e.kpis.map((k) => [k.kpiId, k.status === 'ok' ? k.value?.toNumber() : null]));
  console.log('\n— Sinyal —');
  console.log('MRR ilk→son:', s.mrrTrend[0]?.mrr, '→', s.mrrTrend[s.mrrTrend.length - 1]?.mrr);
  console.log('NRR:', kv.get('nrr')?.toFixed(1), '· Quick Ratio:', kv.get('quick_ratio')?.toFixed(2), '· logo churn:', kv.get('logo_churn')?.toFixed(1));
  if (s.movement) console.log('Hareket:', { yeni: Math.round(s.movement.newMrr), gen: Math.round(s.movement.expansion), dar: Math.round(s.movement.contraction), churn: Math.round(s.movement.churn) });

  const router = createLlmRouter({ resolveModel: googleModelResolver(resolveGoogleApiKeyFromProcess()) });
  console.log('\nCanlı analiz…');
  const analysis = await withRetry(() => analyze(saasAdapter, e, router, 'tr'));
  const text = JSON.stringify(analysis.insight).toLowerCase();
  console.log(`📊 ${analysis.insight.headline} (${analysis.insight.healthScore}/100)`);
  for (const f of analysis.insight.findings) console.log(`  • [${f.severity}] ${f.title}`);

  const some = (w: string[]): boolean => w.some((x) => text.includes(x));
  const scorers: Record<string, () => boolean> = {
    'leaky-bucket': () => some(['sızdıran', 'leaky']) || (text.includes('nrr') && some(['100', 'altında', 'düşük', '%9'])),
    'quick-ratio-low': () => text.includes('quick ratio') || text.includes('quick-ratio') || text.includes('quickratio'),
    'churn-masked': () => text.includes('churn') && some(['maskele', 'yeni', 'gizl', 'örtül', 'rağmen', 'logo']),
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
