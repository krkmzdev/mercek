import { InsightSchema, type AnalysisContext, type KpiResult, type PromptPack } from '@mercek/sdk';
import type { FnbCanonical } from './canonical';
import { computeFnbSignals } from './signals';

export const FNB_PACK_VERSION = '1';

const persona =
  'Sen deneyimli bir restoran / F&B analistisin. Türkçe, sakin ve teknik konuşursun. ' +
  'Sadece veriye dayanırsın; olmayan bir sayı uydurmazsın.';

const domainKnowledge = [
  'F&B domain bilgisi (master seviye):',
  '- Menü mühendisliği: her kalem popülerlik × katkı payına göre 4 çeyreğe düşer — Yıldız (koru), Beygir/Plowhorse (yeniden fiyatla veya maliyeti düşür), Bilmece/Puzzle (menüde yeniden konumlandır), Köpek/Dog (menüden çıkar).',
  '- Food cost hedef bandı 28–32%; üstü marj kaybı, çok altı porsiyon/kalite riski.',
  '- Prime cost (yemek + işçilik) < 60–65% sağlıklıdır.',
  '- Öğün (daypart) karlılığı farklıdır; yüksek ciro yapan bir öğün düşük marjla sessizce zarar ettirebilir.',
  '- Void/ikram oranı < 2% olmalı; yükseği kayıp/suistimal sinyalidir.',
].join('\n');

const method = [
  'Analiz yöntemi:',
  '1. Food cost ve ortalama adisyonla genel sağlığı oku.',
  '2. Menü mühendisliği matrisini incele: Köpek ve Beygir kalemleri belirle.',
  '3. Öğün bazlı food cost’a bak: yüksek ciro yapıp düşük marjlı (kârsız) öğün var mı?',
  '4. Her bulguyu bir KPI’ya veya somut kaleme/öğüne bağla. Eksik veriyi dataGaps olarak belirt.',
].join('\n');

const kpiLine = (k: KpiResult): string =>
  k.status === 'ok' ? `- ${k.kpiId} = ${k.value?.toString()}` : `- ${k.kpiId} = KULLANILAMIYOR (${k.unavailableReason})`;

function buildUserPrompt(ctx: AnalysisContext<FnbCanonical>): string {
  const s = computeFnbSignals(ctx.data);
  const menu = s.menu;
  return [
    `${s.rowCount} POS satırı.`,
    `\nKPI'lar:\n${ctx.kpis.map(kpiLine).join('\n')}`,
    menu
      ? `\nMenü mühendisliği (kalem · çeyrek · adet · katkı/adet):\n${menu.items
          .map((i) => `- ${i.item}: ${i.quadrant} · ${i.units} adet · ₺${i.cmPerUnit}/adet · pop %${i.popularityPct}`)
          .join('\n')}`
      : '',
    `\nÖğün bazlı ciro payı ve food cost:\n${s.daypartMargin
      .map((d) => `- ${d.daypart}: ciro %${d.revenuePct} · food cost ${d.foodCostPct ?? 'n/a'}%`)
      .join('\n')}`,
    ctx.missingFields.length ? `\nEksik alanlar: ${ctx.missingFields.map((m) => m.field).join(', ')}` : '',
    '\nBu veriyi analiz et. Menüdeki Köpek (Dog) ve Beygir (Plowhorse) kalemleri ile yüksek ciro yapıp düşük marjlı kârsız öğünü bulmaya özen göster. En az 3 bulgu ve 2 aksiyon üret; evidence.kpiId verilen KPI id’lerinden biri olmalı (yoksa null + claim).',
  ]
    .filter(Boolean)
    .join('\n');
}

export const fnbPrompts: PromptPack<FnbCanonical> = {
  persona,
  domainKnowledge,
  method,
  insightSchema: InsightSchema,
  buildUserPrompt,
};
