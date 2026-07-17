import { InsightSchema, type AnalysisContext, type KpiResult, type PromptPack } from '@mercek/sdk';
import type { MfgCanonical } from './canonical';
import { computeMfgSignals } from './signals';

export const MFG_PACK_VERSION = '1';

const persona =
  'Sen deneyimli bir üretim / imalat verimlilik mühendisisin. Türkçe, sakin ve teknik konuşursun. ' +
  'Sadece veriye dayanırsın; olmayan bir sayı uydurmazsın.';

const domainKnowledge = [
  'Üretim domain bilgisi (master seviye):',
  '- OEE tek bir sayı değildir: her zaman Kullanılabilirlik (A) × Performans (P) × Kalite (Q) olarak ayrıştır.',
  '- Çoğu tesis tek OEE raporlar ve yanlış faktörü optimize eder. %62 OEE’de A=71%, P=94%, Q=93% ise sorun DURUŞ (availability), kalite değildir.',
  '- Bağlayıcı kısıtı (en düşük faktör) isimlendir; sonra o faktörü çözecek eyleme yönlendir.',
  '- Duruş Pareto’su: hangi duruş nedenine önce saldırılacağını söyler.',
  '- Kompozit OEE, tek bir sorunlu makineyi (düşük A) gizleyebilir; makine bazlı OEE’ye bak.',
].join('\n');

const method = [
  'Analiz yöntemi:',
  '1. Genel OEE’yi A×P×Q olarak ayrıştır ve bağlayıcı kısıtı belirle.',
  '2. Makine bazlı OEE’ye bak: kompozitin gizlediği düşük-OEE makine var mı ve nedeni (A/P/Q) ne?',
  '3. Duruş Pareto’suna bak: en büyük duruş nedeni ne?',
  '4. Her bulguyu bir KPI’ya bağla ve somut eylem öner. Eksik veriyi dataGaps olarak belirt.',
].join('\n');

const kpiLine = (k: KpiResult): string =>
  k.status === 'ok' ? `- ${k.kpiId} = ${k.value?.toString()}` : `- ${k.kpiId} = KULLANILAMIYOR (${k.unavailableReason})`;

const pctOf = (x: number): string => `%${(Math.round(x * 1000) / 10).toFixed(1)}`;

function buildUserPrompt(ctx: AnalysisContext<MfgCanonical>): string {
  const s = computeMfgSignals(ctx.data);
  return [
    `${s.rowCount} üretim kaydı.`,
    `\nKPI'lar:\n${ctx.kpis.map(kpiLine).join('\n')}`,
    s.overall
      ? `\nGenel OEE ayrıştırması: OEE ${pctOf(s.overall.oee)} = A ${pctOf(s.overall.availability)} × P ${pctOf(s.overall.performance)} × Q ${pctOf(s.overall.quality)} · bağlayıcı kısıt: ${s.binding}`
      : '',
    `\nMakine bazlı OEE (A / P / Q):\n${s.byMachine
      .map((m) => `- ${m.machineId}: OEE ${pctOf(m.oee)} (A ${pctOf(m.availability)} · P ${pctOf(m.performance)} · Q ${pctOf(m.quality)})`)
      .join('\n')}`,
    `\nDuruş Pareto (neden · dakika · pay):\n${s.downtime
      .slice(0, 6)
      .map((d) => `- ${d.reason}: ${d.downtimeMin} dk · %${d.sharePct}`)
      .join('\n')}`,
    ctx.missingFields.length ? `\nEksik alanlar: ${ctx.missingFields.map((m) => m.field).join(', ')}` : '',
    '\nBu veriyi analiz et. Bağlayıcı kısıtı isimlendir, kompozit OEE’nin gizlediği sorunlu makineyi (düşük kullanılabilirlik) ve en büyük duruş nedenini bul. En az 3 bulgu ve 2 aksiyon üret; evidence.kpiId verilen KPI id’lerinden biri olmalı (yoksa null + claim).',
  ]
    .filter(Boolean)
    .join('\n');
}

export const manufacturingPrompts: PromptPack<MfgCanonical> = {
  persona,
  domainKnowledge,
  method,
  insightSchema: InsightSchema,
  buildUserPrompt,
};
