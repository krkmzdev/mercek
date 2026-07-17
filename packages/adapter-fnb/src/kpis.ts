import { Decimal, type KpiDefinition, type KpiResult, type SourceRef } from '@mercek/sdk';
import type { FnbCanonical, FnbRow } from './canonical';
import { menuEngineering } from './menu';

const D = (n: number | Decimal): Decimal => new Decimal(n);
const sum = (rows: FnbRow[], f: (r: FnbRow) => number): Decimal => rows.reduce((a, r) => a.plus(f(r)), D(0));
const nonVoid = (d: FnbCanonical): FnbRow[] => d.rows.filter((r) => !r.voidFlag);

function ok(id: string, v: Decimal, ref: SourceRef, breakdown?: KpiResult['breakdown']): KpiResult {
  return { kpiId: id, status: 'ok', value: v, evidence: [ref], breakdown };
}
const na = (id: string, reason: string): KpiResult => ({ kpiId: id, status: 'unavailable', unavailableReason: reason, evidence: [] });
const pct = (num: Decimal, den: Decimal): Decimal | null => (den.isZero() ? null : num.div(den).times(100));

export function fnbKpis(): KpiDefinition<FnbCanonical>[] {
  return [
    {
      id: 'food_cost_pct',
      label: { tr: 'Food Cost %', en: 'Food Cost %' },
      unit: 'percent',
      formula: { tr: 'yemek maliyeti ÷ net satış × 100', en: 'food cost ÷ net sales × 100' },
      requiredFields: ['foodCost'],
      direction: 'target-band',
      benchmarkKey: 'food_cost',
      interpretation: { tr: 'Hedef bant 28–32%. Üstü marj kaybı, altı porsiyon riski.', en: 'Target 28–32%.' },
      compute: (d) => {
        const s = nonVoid(d);
        if (s.every((r) => r.foodCost === undefined)) return na('food_cost_pct', 'Yemek maliyeti verisi yok.');
        const v = pct(sum(s, (r) => r.foodCost ?? 0), sum(s, (r) => r.revenue));
        return v ? ok('food_cost_pct', v, d.sourceRef) : na('food_cost_pct', 'Net satış sıfır.');
      },
    },
    {
      id: 'prime_cost_pct',
      label: { tr: 'Prime Cost %', en: 'Prime Cost %' },
      unit: 'percent',
      formula: { tr: '(yemek + işçilik) ÷ net satış × 100', en: '(food + labor) ÷ net sales × 100' },
      requiredFields: ['foodCost'],
      direction: 'lower-better',
      interpretation: { tr: 'İşçilik verisi gerektirir; POS satırından hesaplanamaz.', en: 'Needs labor data.' },
      compute: () => na('prime_cost_pct', 'İşçilik (labor) verisi yok.'),
    },
    {
      id: 'avg_check',
      label: { tr: 'Ortalama Adisyon', en: 'Average Check' },
      unit: 'currency',
      formula: { tr: 'net satış ÷ adisyon sayısı', en: 'net sales ÷ order count' },
      requiredFields: ['orderId'],
      direction: 'higher-better',
      benchmarkKey: 'avg_check',
      interpretation: { tr: 'Adisyon başına ortalama ciro.', en: 'Average revenue per check.' },
      compute: (d) => {
        const s = nonVoid(d);
        const orders = new Set(s.map((r) => r.orderId).filter(Boolean));
        if (orders.size === 0) return na('avg_check', 'Adisyon (orderId) verisi yok.');
        return ok('avg_check', sum(s, (r) => r.revenue).div(orders.size), d.sourceRef);
      },
    },
    {
      id: 'per_cover_spend',
      label: { tr: 'Kişi Başı Harcama', en: 'Per-Cover Spend' },
      unit: 'currency',
      formula: { tr: 'net satış ÷ toplam kişi', en: 'net sales ÷ covers' },
      requiredFields: ['covers'],
      direction: 'higher-better',
      interpretation: { tr: 'Misafir başına ortalama harcama.', en: 'Average spend per guest.' },
      compute: (d) => {
        const s = nonVoid(d);
        const covers = sum(s, (r) => r.covers ?? 0);
        if (covers.isZero()) return na('per_cover_spend', 'Kişi (covers) verisi yok.');
        return ok('per_cover_spend', sum(s, (r) => r.revenue).div(covers), d.sourceRef);
      },
    },
    {
      id: 'table_turnover',
      label: { tr: 'Masa Devir Hızı', en: 'Table Turnover' },
      unit: 'ratio',
      formula: { tr: 'kişi ÷ koltuk ÷ servis saati', en: 'covers ÷ seats ÷ service hours' },
      requiredFields: ['covers'],
      direction: 'higher-better',
      interpretation: { tr: 'Koltuk sayısı ve servis saati gerektirir.', en: 'Needs seats + service hours.' },
      compute: () => na('table_turnover', 'Koltuk sayısı / servis saati verisi yok.'),
    },
    {
      id: 'void_rate',
      label: { tr: 'Void / İkram Oranı %', en: 'Void/Comp Rate %' },
      unit: 'percent',
      formula: { tr: 'iptal tutarı ÷ brüt satış × 100', en: 'voided ÷ gross sales × 100' },
      requiredFields: ['voidFlag'],
      direction: 'lower-better',
      interpretation: { tr: 'Hedef < 2%. Yüksek oran kayıp/suistimal sinyali.', en: 'Target < 2%.' },
      compute: (d) => {
        if (d.rows.every((r) => r.voidFlag === undefined)) return na('void_rate', 'İptal (void) verisi yok.');
        const gross = sum(d.rows, (r) => r.revenue);
        const voided = sum(d.rows.filter((r) => r.voidFlag), (r) => r.revenue);
        const v = pct(voided, gross);
        return v ? ok('void_rate', v, d.sourceRef) : na('void_rate', 'Brüt satış sıfır.');
      },
    },
    {
      id: 'daypart_top_share',
      label: { tr: 'Öğün Yoğunlaşması %', en: 'Top Daypart Share %' },
      unit: 'percent',
      formula: { tr: 'en yüksek öğünün ciro payı', en: 'top daypart revenue share' },
      requiredFields: ['daypart'],
      direction: 'target-band',
      interpretation: { tr: 'Tek öğüne aşırı bağımlılık riski.', en: 'Over-reliance on one daypart.' },
      compute: (d) => {
        const s = nonVoid(d);
        const byPart = new Map<string, Decimal>();
        for (const r of s) {
          if (!r.daypart) continue;
          byPart.set(r.daypart, (byPart.get(r.daypart) ?? D(0)).plus(r.revenue));
        }
        if (byPart.size === 0) return na('daypart_top_share', 'Öğün (daypart) verisi yok.');
        const total = sum(s, (r) => r.revenue);
        const breakdown = [...byPart.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value.comparedTo(a.value));
        const v = pct(breakdown[0]!.value, total);
        return v ? ok('daypart_top_share', v, d.sourceRef, breakdown) : na('daypart_top_share', 'Satış yok.');
      },
    },
    {
      id: 'contribution_margin_avg',
      label: { tr: 'Ort. Katkı Payı (adet)', en: 'Avg Contribution Margin' },
      unit: 'currency',
      formula: { tr: '(satış − yemek maliyeti) ÷ adet', en: '(sales − food cost) ÷ units' },
      requiredFields: ['foodCost'],
      direction: 'higher-better',
      interpretation: { tr: 'Adet başına menü katkı payı.', en: 'Menu contribution per unit.' },
      compute: (d) => {
        const m = menuEngineering(d);
        if (!m) return na('contribution_margin_avg', 'Yemek maliyeti verisi yok.');
        return ok('contribution_margin_avg', D(m.avgCmPerUnit), d.sourceRef);
      },
    },
    {
      id: 'menu_dogs',
      label: { tr: 'Menü — Köpek (Dog) Sayısı', en: 'Menu Dogs' },
      unit: 'count',
      formula: { tr: 'düşük popülerlik & düşük katkı payı kalem sayısı', en: 'low popularity & low margin items' },
      requiredFields: ['foodCost'],
      direction: 'lower-better',
      interpretation: { tr: 'Dog kalemler menüden çıkarılmaya adaydır (menü mühendisliği).', en: 'Dogs are removal candidates.' },
      compute: (d) => {
        const m = menuEngineering(d);
        if (!m) return na('menu_dogs', 'Yemek maliyeti verisi yok.');
        const breakdown = (Object.entries(m.counts) as [string, number][]).map(([label, value]) => ({ label, value: D(value) }));
        return ok('menu_dogs', D(m.counts.dog), d.sourceRef, breakdown);
      },
    },
  ];
}
