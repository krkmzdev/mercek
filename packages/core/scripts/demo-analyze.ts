/**
 * Live end-to-end demo (not a sprint deliverable — a smoke demo of the thesis):
 *   real Excel → extract → KPIs → LIVE Gemini analysis → structured insight.
 * Run: pnpm --filter @mercek/core demo:analyze
 *
 * The fixture has no cost column, so the margin KPI degrades to `unavailable`
 * and the AI is told about the gap — demonstrating "no hallucination around
 * missing data" live. The real Retail adapter (11 KPIs, benchmarks with cited
 * sources, prompt pack, answer-key fixture) is sprint S3.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Decimal, InsightSchema, matchHeaders, type ExtractedTable } from '@mercek/sdk';
import { parseXlsx } from '../src/extract/xlsx';
import { runKpis } from '../src/kpi/runner';
import { resolveGoogleApiKeyFromProcess } from '../src/llm/env';
import { createLlmRouter, googleModelResolver } from '../src/llm/router';

const here = dirname(fileURLToPath(import.meta.url));

const ALIASES = {
  date: ['tarih'],
  product: ['urun', 'ürün'],
  quantity: ['adet'],
  unitPrice: ['birim fiyat'],
  revenue: ['ciro'],
  cost: ['maliyet'],
};

interface Row {
  product: string;
  quantity: number;
  revenue: number;
  cost: number | null;
}

function mapRows(table: ExtractedTable): { rows: Row[]; hasCost: boolean } {
  const { matches } = matchHeaders(table.headers, ALIASES);
  const col = (field: string): number => {
    const header = [...matches.entries()].find(([, m]) => m.canonicalField === field)?.[0];
    return header ? table.headers.indexOf(header) : -1;
  };
  const iProd = col('product');
  const iQty = col('quantity');
  const iRev = col('revenue');
  const iCost = col('cost');
  const rows = table.rows.map((r) => ({
    product: String(r[iProd] ?? ''),
    quantity: Number(r[iQty] ?? 0),
    revenue: Number(r[iRev] ?? 0),
    cost: iCost >= 0 ? Number(r[iCost] ?? 0) : null,
  }));
  return { rows, hasCost: iCost >= 0 };
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/503|overloaded|high demand|UNAVAILABLE/i.test(msg) || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 2500 * (i + 1)));
    }
  }
  throw new Error('unreachable');
}

async function main(): Promise<void> {
  const apiKey = resolveGoogleApiKeyFromProcess();

  // 1) Extract the real Excel fixture.
  const xlsxPath = resolve(here, '../../../fixtures/extract/retail-sample.xlsx');
  const [table] = await parseXlsx({
    fileId: 'demo',
    filename: 'retail-sample.xlsx',
    bytes: new Uint8Array(readFileSync(xlsxPath)),
  });
  const { rows, hasCost } = mapRows(table!);

  // 2) Compute a few KPIs (margin degrades — no cost column).
  const sourceRef = table!.sourceRef;
  const kpis = runKpis(
    [
      {
        id: 'total_revenue',
        label: { tr: 'Toplam Ciro', en: 'Total Revenue' },
        unit: 'currency',
        formula: { tr: 'Σ ciro', en: 'Σ revenue' },
        requiredFields: ['revenue'],
        direction: 'higher-better',
        interpretation: { tr: '-', en: '-' },
        compute: () => ({
          kpiId: 'total_revenue',
          status: 'ok',
          value: rows.reduce((a, r) => a.plus(r.revenue), new Decimal(0)),
          evidence: [sourceRef],
        }),
      },
      {
        id: 'total_units',
        label: { tr: 'Toplam Adet', en: 'Total Units' },
        unit: 'count',
        formula: { tr: 'Σ adet', en: 'Σ quantity' },
        requiredFields: ['quantity'],
        direction: 'higher-better',
        interpretation: { tr: '-', en: '-' },
        compute: () => ({
          kpiId: 'total_units',
          status: 'ok',
          value: rows.reduce((a, r) => a.plus(r.quantity), new Decimal(0)),
          evidence: [sourceRef],
        }),
      },
      {
        id: 'gross_margin',
        label: { tr: 'Brüt Marj %', en: 'Gross Margin %' },
        unit: 'percent',
        formula: { tr: '(ciro − maliyet) ÷ ciro × 100', en: '(rev − cost) ÷ rev × 100' },
        requiredFields: ['cost'],
        direction: 'higher-better',
        interpretation: { tr: '-', en: '-' },
        compute: () => ({ kpiId: 'gross_margin', status: 'ok', value: new Decimal(0), evidence: [sourceRef] }),
      },
    ],
    rows,
    { missingFields: hasCost ? [] : ['cost'] },
  );

  const kpiLines = kpis
    .map((k) =>
      k.status === 'ok'
        ? `- ${k.kpiId}: ${k.value?.toString()}`
        : `- ${k.kpiId}: UNAVAILABLE (${k.unavailableReason})`,
    )
    .join('\n');

  const topProducts = [...rows]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((r) => `${r.product}: ${r.revenue} (${r.quantity} adet)`)
    .join('\n');

  // 3) Live analysis.
  console.log('Canlı analiz çalışıyor (gerçek Gemini çağrısı)…\n');
  const router = createLlmRouter({ resolveModel: googleModelResolver(apiKey) });
  const result = await withRetry(() =>
    router.complete('analyze', {
      schema: InsightSchema,
      system:
        'Sen deneyimli bir perakende (retail) analistisin. Türkçe, sakin ve teknik konuş. ' +
        'Sadece verilen KPI ve verilere dayan; olmayan bir sayı uydurma. Eksik veriyi dataGaps olarak belirt. ' +
        "Her bulgunun evidence.kpiId alanı verilen KPI id'lerinden biri olmalı (yoksa null; o zaman claim doldur). " +
        'ZORUNLU: tam olarak 3 ile 5 arası "findings" ve 2 ile 3 arası "actions" üret. Az üretme.',
      prompt: [
        `Hesaplanan KPI'lar (kpiId: değer):\n${kpiLines}`,
        `\nEn çok ciro yapan ürünler:\n${topProducts}`,
        `\nToplam ${rows.length} satırlık 9 günlük perakende satış verisi. Bu veriyi analiz et.`,
        '\nEn az 3 bulgu (ürün konsantrasyonu, en çok/az satan, veri eksikliği gibi) ve en az 2 aksiyon yaz.',
      ].join('\n'),
    }),
  );

  const insight = result.data;
  const line = '─'.repeat(60);
  console.log(line);
  console.log(`📊 ${insight.headline}`);
  console.log(`Sağlık Skoru: ${insight.healthScore}/100`);
  console.log(`\n${insight.summary}`);
  console.log(`\n${line}\nBULGULAR`);
  for (const f of insight.findings) {
    const icon = { critical: '🔴', warning: '🟠', opportunity: '🔵', positive: '🟢' }[f.severity];
    console.log(`\n${icon} [${f.severity}] ${f.title}`);
    console.log(`   ${f.body}`);
    console.log(`   kanıt: ${f.evidence.map((e) => e.kpiId ?? e.claim).join(', ')}`);
  }
  console.log(`\n${line}\nAKSİYONLAR`);
  for (const a of [...insight.actions].sort((x, y) => x.priority - y.priority)) {
    console.log(`\n${a.priority}. ${a.title} (etki: ${a.expectedImpact}, efor: ${a.effort})`);
    console.log(`   neden: ${a.rationale}`);
  }
  if (insight.dataGaps.length) {
    console.log(`\n${line}\nVERİ BOŞLUKLARI`);
    for (const g of insight.dataGaps) console.log(`- ${g}`);
  }
  console.log(`\n${line}`);
  console.log(`Maliyet: ${result.usage.costUsd.toFixed(6)} USD · model: ${result.model}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
