import { InsightSchema, type AnalysisContext, type KpiResult, type PromptPack } from '@mercek/sdk';
import type { RetailCanonical } from './canonical';
import { computeSignals } from './signals';

/** Bump when any static pack text changes — stale caches serving old domain
 * knowledge is a nasty bug class (spec §8.3). */
export const RETAIL_PACK_VERSION = '1';

const persona =
  'Sen kıdemli bir perakende / e-ticaret analistisin. Türkçe, sakin ve teknik konuşursun. ' +
  'Hype yapmazsın; sadece veriye dayanırsın. Olmayan bir sayı asla uydurmazsın.';

const domainKnowledge = [
  'Perakende domain bilgisi (master seviye):',
  '- Pareto/ABC: cironun büyük kısmı az sayıda SKU’dan gelir; aşırı yoğunlaşma kırılganlıktır.',
  '- İndirim türü ayrımı: kalıcı fiyat düşüşü (markdown) ile promosyon indirimi farklıdır; ikisi de marjı yer ama farklı yönetilir.',
  '- İade oranı kategoriye göre değişir: tekstil/ayakkabı ≫ elektronik. Bir SKU’nun iade oranı kategori ortalamasının çok üstündeyse ürün/beden/kalite sorunu sinyalidir.',
  '- Kanal marj asimetrisi: pazaryeri komisyonu marjı düşürür; kanal bazlı karlılık farklıdır.',
  '- Trend vs sezonsallık: kısa dalgalanma ile kalıcı düşüş ayrılmalıdır; sessizce düşen bir kategori toplam ciroda gizlenebilir.',
  '- Kanibalizasyon: derin indirimli bir ürün, tam fiyatlı benzer ürünün satışını yiyebilir; ciro artarken marj çöker.',
].join('\n');

const method = [
  'Analiz yöntemi:',
  '1. Önce genel sağlığı oku (ciro, AOV, marj).',
  '2. Kırılımlara in: SKU bazlı iade oranlarında aykırı değer var mı?',
  '3. Kategori trendini incele: ilk aya göre son ayda sessizce düşen kategori var mı?',
  '4. Haftalık indirim derinliği ile brüt marjı birlikte oku: indirimin ciroyu şişirip marjı çökerttiği hafta var mı?',
  '5. Her bulguyu bir KPI kanıtına veya somut sayıya bağla. Eksik veriyi dataGaps olarak belirt.',
].join('\n');

function kpiLine(k: KpiResult): string {
  return k.status === 'ok'
    ? `- ${k.kpiId} = ${k.value?.toString()}`
    : `- ${k.kpiId} = KULLANILAMIYOR (${k.unavailableReason})`;
}

function buildUserPrompt(ctx: AnalysisContext<RetailCanonical>): string {
  const s = computeSignals(ctx.data);
  const bench = ctx.benchmarks
    .map(
      (b) =>
        `- ${b.kpiId}: ${b.value.toString()} · konum: ${b.position} · yargı: ${b.verdict}` +
        (b.entry.median !== undefined ? ` (medyan ${b.entry.median})` : ''),
    )
    .join('\n');

  return [
    `Dönem: ${s.dateRange.start} → ${s.dateRange.end}, ${s.rowCount} kayıt.`,
    `\nHesaplanan KPI'lar:\n${ctx.kpis.map(kpiLine).join('\n')}`,
    ctx.benchmarks.length ? `\nBenchmark karşılaştırması:\n${bench}` : '',
    `\nSKU bazlı iade oranı (hacmi yüksek ilk 8):\n${s.returnBySku
      .map((r) => `- ${r.sku}: ${r.returnRatePct}% (${r.returns}/${r.sales})`)
      .join('\n')}`,
    `\nKategori ilk→son ay ciro değişimi:\n${s.categoryTrend
      .map((c) => `- ${c.category}: ${c.firstRev} → ${c.lastRev} (${c.changePct > 0 ? '+' : ''}${c.changePct}%)`)
      .join('\n')}`,
    `\nHaftalık indirim derinliği vs brüt marj:\n${s.weeklyDiscountMargin
      .map((w) => `- ${w.week}: indirim ${w.discountDepthPct}% · marj ${w.grossMarginPct ?? 'n/a'}%`)
      .join('\n')}`,
    ctx.missingFields.length
      ? `\nEksik alanlar: ${ctx.missingFields.map((m) => m.field).join(', ')}`
      : '',
    '\nBu veriyi analiz et. Aykırı iade oranını, sessizce düşen kategoriyi ve indirimin marjı çökerttiği dönemi bulmaya özen göster. En az 3 bulgu ve 2 aksiyon üret; her bulgunun evidence.kpiId alanı verilen KPI id’lerinden biri olmalı (yoksa null ve claim doldur).',
  ]
    .filter(Boolean)
    .join('\n');
}

export const retailPrompts: PromptPack<RetailCanonical> = {
  persona,
  domainKnowledge,
  method,
  insightSchema: InsightSchema,
  buildUserPrompt,
};
