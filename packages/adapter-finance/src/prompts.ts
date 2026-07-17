import { InsightSchema, type AnalysisContext, type KpiResult, type PromptPack } from '@mercek/sdk';
import type { FinanceCanonical } from './canonical';
import { computeFinanceSignals } from './signals';

export const FINANCE_PACK_VERSION = '1';

const persona =
  'Sen deneyimli bir KOBİ finans / mali analist danışmanısın. Türkçe, sakin ve teknik konuşursun. ' +
  'Sadece veriye dayanırsın; olmayan bir sayı uydurmazsın.';

const domainKnowledge = [
  'KOBİ finans domain bilgisi (master seviye):',
  '- TÜFE-reel büyüme: Türkiye’de yüksek nominal ciro büyümesi başarı sanılır; enflasyon daha yüksekse bu aslında reel daralmadır. Nominal büyümeyi TÜİK TÜFE ile deflate et: reel = (1+nominal)/(1+enflasyon)−1.',
  '- Nakit dönüşüm süresi (CCC = DSO + DIO − DPO): nakdin işletmede bağlı kaldığı gün. Uzaması, ciro büyürken bile nakit sıkışıklığı yaratır.',
  '- Likidite: Cari oran ~1.5–2.0, asit-test ~1.0 sağlıklıdır. Düşüşü kısa vadeli ödeme riski.',
  '- Kaldıraç: Borç/özkaynak yükseldikçe finansal risk artar.',
  '- Marj erozyonu: nominal satış artarken net marjın düşmesi, maliyet/fiyatlama baskısının işaretidir.',
].join('\n');

const method = [
  'Analiz yöntemi:',
  '1. TÜFE-reel büyümeyi hesapla ve nominal ile karşılaştır — reel daralma var mı?',
  '2. Nakit dönüşüm süresini dönemler boyunca izle — uzuyor mu (nakit baskısı)?',
  '3. Net marj trendine bak — satış büyürken marj eriyor mu?',
  '4. Likidite ve kaldıraç oranlarını değerlendir.',
  '5. Her bulguyu bir KPI’ya veya somut orana bağla. Eksik veriyi dataGaps olarak belirt.',
].join('\n');

const kpiLine = (k: KpiResult): string =>
  k.status === 'ok' ? `- ${k.kpiId} = ${k.value?.toString()}` : `- ${k.kpiId} = KULLANILAMIYOR (${k.unavailableReason})`;

function buildUserPrompt(ctx: AnalysisContext<FinanceCanonical>): string {
  const s = computeFinanceSignals(ctx.data);
  const rr = s.realReturn;
  return [
    `${s.periodCount} dönemlik finansal veri.`,
    `\nKPI'lar (son dönem):\n${ctx.kpis.map(kpiLine).join('\n')}`,
    rr
      ? `\nTÜFE-reel büyüme (${rr.priorPeriod} → ${rr.latestPeriod}): nominal +%${rr.nominalGrowthPct} · TÜFE +%${rr.inflationPct} · REEL %${rr.realGrowthPct}`
      : '',
    `\nNakit dönüşüm süresi (dönem · DSO · DIO · DPO · CCC gün):\n${s.ccc
      .map((c) => `- ${c.period}: ${c.dso ?? 'n/a'} · ${c.dio ?? 'n/a'} · ${c.dpo ?? 'n/a'} · CCC ${c.ccc ?? 'n/a'}`)
      .join('\n')}`,
    `\nDönemsel net satış ve net marj:\n${s.trend
      .map((t) => `- ${t.period}: satış ${t.netSales ?? 'n/a'} · net marj ${t.netMarginPct ?? 'n/a'}%`)
      .join('\n')}`,
    ctx.missingFields.length ? `\nEksik kalemler: ${ctx.missingFields.map((m) => m.field).join(', ')}` : '',
    '\nBu veriyi analiz et. Nominal büyümeye rağmen TÜFE-reel daralmayı, uzayan nakit dönüşüm süresini ve marj erozyonunu bulmaya özen göster. En az 3 bulgu ve 2 aksiyon üret; evidence.kpiId verilen KPI id’lerinden biri olmalı (yoksa null + claim).',
  ]
    .filter(Boolean)
    .join('\n');
}

export const financePrompts: PromptPack<FinanceCanonical> = {
  persona,
  domainKnowledge,
  method,
  insightSchema: InsightSchema,
  buildUserPrompt,
};
