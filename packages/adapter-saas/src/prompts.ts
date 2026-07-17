import { InsightSchema, type AnalysisContext, type KpiResult, type PromptPack } from '@mercek/sdk';
import type { SaasCanonical } from './canonical';
import { computeSaasSignals } from './signals';

export const SAAS_PACK_VERSION = '1';

const persona =
  'Sen deneyimli bir SaaS büyüme / gelir analistisin. Türkçe, sakin ve teknik konuşursun. ' +
  'Sadece veriye dayanırsın; olmayan bir sayı uydurmazsın.';

const domainKnowledge = [
  'SaaS metrik domain bilgisi (master seviye):',
  '- Quick Ratio = (yeni + genişleme) ÷ (daralma + churn). Sağlıklı ~4. ~1 civarı SIZDIRAN KOVA: MRR büyüse bile her yeni dolar bir kayıpla götürülüyor.',
  '- NRR < 100 ise mevcut müşteri tabanı küçülüyor; sağlıklı büyümede NRR > 100 olur.',
  '- Yeni-logo büyümesi, yüksek churn/daralmayı MRR grafiğinde maskeleyebilir. Quick Ratio ve NRR bunu ifşa eder.',
  '- Kohort retention eğrisi: yeni kohortlar hızlı düşüyorsa ürün-pazar uyumu/onboarding sorunu.',
].join('\n');

const method = [
  'Analiz yöntemi:',
  '1. MRR büyüyor mu diye bak — ama yüzeyde kalma.',
  '2. Quick Ratio ve NRR’yi oku: sızdıran kova var mı (MRR büyürken NRR<100 / Quick Ratio ~1)?',
  '3. MRR hareketini ayrıştır: yeni vs genişleme vs daralma vs churn.',
  '4. Kohort retention’a bak. Her bulguyu bir KPI’ya bağla; eksik veriyi dataGaps olarak belirt.',
].join('\n');

const kpiLine = (k: KpiResult): string =>
  k.status === 'ok' ? `- ${k.kpiId} = ${k.value?.toString()}` : `- ${k.kpiId} = KULLANILAMIYOR (${k.unavailableReason})`;

function buildUserPrompt(ctx: AnalysisContext<SaasCanonical>): string {
  const s = computeSaasSignals(ctx.data);
  const m = s.movement;
  return [
    `${s.monthCount} aylık abonelik verisi.`,
    `\nKPI'lar (son ay hareketi):\n${ctx.kpis.map(kpiLine).join('\n')}`,
    m
      ? `\nMRR hareketi (${m.fromMonth}→${m.toMonth}): yeni +${Math.round(m.newMrr)} · genişleme +${Math.round(m.expansion)} · daralma −${Math.round(m.contraction)} · churn −${Math.round(m.churn)} · net ${Math.round(m.newMrr + m.expansion - m.contraction - m.churn)}`
      : '',
    `\nMRR trendi:\n${s.mrrTrend.map((t) => `- ${t.month}: ${t.mrr}`).join('\n')}`,
    s.cohorts.length
      ? `\nKohort retention (ilk 4 kohort, %):\n${s.cohorts
          .slice(0, 4)
          .map((c) => `- ${c.cohort} (n=${c.size}): ${c.retentionPct.slice(0, 6).join(' → ')}`)
          .join('\n')}`
      : '',
    ctx.missingFields.length ? `\nEksik alanlar: ${ctx.missingFields.map((mm) => mm.field).join(', ')}` : '',
    '\nBu veriyi analiz et. MRR büyümesinin altında Quick Ratio ve NRR ile sızdıran kovayı (yüksek churn/daralmanın yeni-logo ile maskelenmesi) ifşa etmeye özen göster. En az 3 bulgu ve 2 aksiyon üret; evidence.kpiId verilen KPI id’lerinden biri olmalı (yoksa null + claim).',
  ]
    .filter(Boolean)
    .join('\n');
}

export const saasPrompts: PromptPack<SaasCanonical> = {
  persona,
  domainKnowledge,
  method,
  insightSchema: InsightSchema,
  buildUserPrompt,
};
