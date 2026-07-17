import { Decimal, type KpiDefinition, type KpiResult, type SourceRef } from '@mercek/sdk';
import type { RetailCanonical, RetailRow } from './canonical';

// ── helpers ────────────────────────────────────────────────────────────────
const D = (n: number | Decimal): Decimal => new Decimal(n);
const sum = (rows: RetailRow[], f: (r: RetailRow) => number): Decimal =>
  rows.reduce((acc, r) => acc.plus(f(r)), D(0));

const isReturn = (r: RetailRow): boolean => r.returnFlag === true;

interface Parts {
  sales: RetailRow[];
  returns: RetailRow[];
  grossRevenue: Decimal;
  returnedValue: Decimal;
  orderCount: number;
}
function parts(data: RetailCanonical): Parts {
  const sales = data.rows.filter((r) => !isReturn(r));
  const returns = data.rows.filter(isReturn);
  return {
    sales,
    returns,
    grossRevenue: sum(sales, (r) => r.revenue),
    returnedValue: sum(returns, (r) => r.revenue),
    orderCount: sales.length,
  };
}

function ok(kpiId: string, value: Decimal, ref: SourceRef, breakdown?: KpiResult['breakdown']): KpiResult {
  return { kpiId, status: 'ok', value, evidence: [ref], breakdown };
}
function na(kpiId: string, reason: string): KpiResult {
  return { kpiId, status: 'unavailable', unavailableReason: reason, evidence: [] };
}
/** Safe percentage num/den × 100, or null when the denominator is zero. */
function pct(num: Decimal, den: Decimal): Decimal | null {
  return den.isZero() ? null : num.div(den).times(100);
}

// ── the 11 KPIs (spec §10.1) ─────────────────────────────────────────────────
export function retailKpis(): KpiDefinition<RetailCanonical>[] {
  return [
    {
      id: 'total_revenue',
      label: { tr: 'Toplam Ciro', en: 'Total Revenue' },
      unit: 'currency',
      formula: { tr: 'Σ satış − Σ iade', en: 'Σ sales − Σ returns' },
      requiredFields: ['revenue'],
      direction: 'higher-better',
      interpretation: {
        tr: 'İadeler düşülmüş net ciro. Büyüme trendini burada oku.',
        en: 'Net revenue after returns.',
      },
      compute: (d) => {
        const p = parts(d);
        return ok('total_revenue', p.grossRevenue.minus(p.returnedValue), d.sourceRef);
      },
    },
    {
      id: 'aov',
      label: { tr: 'Ortalama Sepet (AOV)', en: 'Average Order Value' },
      unit: 'currency',
      formula: { tr: 'brüt ciro ÷ sipariş sayısı', en: 'gross revenue ÷ order count' },
      requiredFields: ['revenue'],
      direction: 'higher-better',
      benchmarkKey: 'aov',
      interpretation: { tr: 'Sipariş başına ortalama harcama.', en: 'Average spend per order.' },
      compute: (d) => {
        const p = parts(d);
        const v = p.orderCount === 0 ? null : p.grossRevenue.div(p.orderCount);
        return v ? ok('aov', v, d.sourceRef) : na('aov', 'Sipariş yok.');
      },
    },
    {
      id: 'units_per_order',
      label: { tr: 'Birim / İşlem', en: 'Units per Order' },
      unit: 'ratio',
      formula: { tr: 'Σ adet ÷ sipariş sayısı', en: 'Σ quantity ÷ order count' },
      requiredFields: ['quantity'],
      direction: 'higher-better',
      interpretation: { tr: 'Sepet derinliği — çapraz satış göstergesi.', en: 'Basket depth.' },
      compute: (d) => {
        const p = parts(d);
        const units = sum(p.sales, (r) => r.quantity);
        const v = p.orderCount === 0 ? null : units.div(p.orderCount);
        return v ? ok('units_per_order', v, d.sourceRef) : na('units_per_order', 'Sipariş yok.');
      },
    },
    {
      id: 'gross_margin',
      label: { tr: 'Brüt Marj %', en: 'Gross Margin %' },
      unit: 'percent',
      formula: { tr: '(brüt ciro − maliyet) ÷ brüt ciro × 100', en: '(rev − cost) ÷ rev × 100' },
      requiredFields: ['cost'],
      direction: 'higher-better',
      benchmarkKey: 'gross_margin',
      interpretation: {
        tr: 'İndirimle şişen ciro marjı yer: bu ikisini birlikte oku.',
        en: 'Discount-driven revenue can hide margin erosion.',
      },
      compute: (d) => {
        const p = parts(d);
        if (p.sales.every((r) => r.cost === undefined)) return na('gross_margin', 'Maliyet verisi yok.');
        const cost = sum(p.sales, (r) => r.cost ?? 0);
        const v = pct(p.grossRevenue.minus(cost), p.grossRevenue);
        return v ? ok('gross_margin', v, d.sourceRef) : na('gross_margin', 'Brüt ciro sıfır.');
      },
    },
    {
      id: 'return_rate',
      label: { tr: 'İade Oranı %', en: 'Return Rate %' },
      unit: 'percent',
      formula: { tr: 'iade adedi ÷ toplam sipariş × 100', en: 'returns ÷ orders × 100' },
      requiredFields: ['returnFlag'],
      direction: 'lower-better',
      benchmarkKey: 'return_rate',
      interpretation: { tr: 'Kategoriye göre değişir (tekstil ≫ elektronik).', en: 'Varies by category.' },
      compute: (d) => {
        if (d.rows.every((r) => r.returnFlag === undefined)) return na('return_rate', 'İade verisi yok.');
        const v = pct(D(d.rows.filter(isReturn).length), D(d.rows.length));
        return v ? ok('return_rate', v, d.sourceRef) : na('return_rate', 'Kayıt yok.');
      },
    },
    {
      id: 'return_value_rate',
      label: { tr: 'İade Tutar Oranı %', en: 'Return Value Rate %' },
      unit: 'percent',
      formula: { tr: 'iade tutarı ÷ brüt ciro × 100', en: 'returned value ÷ gross revenue × 100' },
      requiredFields: ['returnFlag'],
      direction: 'lower-better',
      interpretation: { tr: 'Adet değil değer bazlı iade yükü.', en: 'Return burden by value.' },
      compute: (d) => {
        if (d.rows.every((r) => r.returnFlag === undefined)) return na('return_value_rate', 'İade verisi yok.');
        const p = parts(d);
        const v = pct(p.returnedValue, p.grossRevenue);
        return v ? ok('return_value_rate', v, d.sourceRef) : na('return_value_rate', 'Brüt ciro sıfır.');
      },
    },
    {
      id: 'inventory_turnover',
      label: { tr: 'Stok Devir Hızı', en: 'Inventory Turnover' },
      unit: 'ratio',
      formula: { tr: 'SMM ÷ ort. stok', en: 'COGS ÷ avg inventory' },
      requiredFields: ['cost'],
      direction: 'higher-better',
      interpretation: { tr: 'Stok verisi gerektirir; yalnız satışla hesaplanamaz.', en: 'Needs inventory levels.' },
      // Transaction data alone lacks inventory levels → always degrades cleanly.
      compute: () => na('inventory_turnover', 'Envanter (stok seviyesi) verisi yok.'),
    },
    {
      id: 'pareto',
      label: { tr: 'Pareto (80/20)', en: 'Pareto (80/20)' },
      unit: 'percent',
      formula: {
        tr: 'en çok ciro yapan %20 SKU’nun ciro payı',
        en: 'revenue share of the top 20% of SKUs',
      },
      requiredFields: ['sku', 'revenue'],
      direction: 'target-band',
      interpretation: { tr: 'Aşırı yoğunlaşma kırılganlık yaratır.', en: 'High concentration = fragility.' },
      compute: (d) => {
        const p = parts(d);
        const bySku = new Map<string, Decimal>();
        for (const r of p.sales) {
          if (!r.sku) continue;
          bySku.set(r.sku, (bySku.get(r.sku) ?? D(0)).plus(r.revenue));
        }
        if (bySku.size === 0) return na('pareto', 'SKU verisi yok.');
        const sorted = [...bySku.entries()].sort((a, b) => b[1].comparedTo(a[1]));
        const topN = Math.max(1, Math.ceil(sorted.length * 0.2));
        const topRevenue = sorted.slice(0, topN).reduce((a, [, v]) => a.plus(v), D(0));
        const share = pct(topRevenue, p.grossRevenue);
        if (!share) return na('pareto', 'Brüt ciro sıfır.');
        const breakdown = sorted.slice(0, 5).map(([label, value]) => ({ label, value }));
        return ok('pareto', share, d.sourceRef, breakdown);
      },
    },
    {
      id: 'repeat_rate',
      label: { tr: 'Tekrar Alım Oranı %', en: 'Repeat Purchase Rate %' },
      unit: 'percent',
      formula: { tr: 'tekrar eden müşteri ÷ toplam müşteri × 100', en: 'repeat ÷ total customers × 100' },
      requiredFields: ['customerId'],
      direction: 'higher-better',
      interpretation: { tr: 'Sadakat ve elde tutma göstergesi.', en: 'Loyalty / retention signal.' },
      compute: (d) => {
        const counts = new Map<string, number>();
        for (const r of d.rows) {
          if (!r.customerId) continue;
          counts.set(r.customerId, (counts.get(r.customerId) ?? 0) + 1);
        }
        if (counts.size === 0) return na('repeat_rate', 'Müşteri verisi yok.');
        const repeat = [...counts.values()].filter((c) => c > 1).length;
        const v = pct(D(repeat), D(counts.size));
        return v ? ok('repeat_rate', v, d.sourceRef) : na('repeat_rate', 'Müşteri yok.');
      },
    },
    {
      id: 'discount_depth',
      label: { tr: 'İskonto Derinliği %', en: 'Discount Depth %' },
      unit: 'percent',
      formula: { tr: 'Σ indirim ÷ brüt ciro × 100', en: 'Σ discount ÷ gross revenue × 100' },
      requiredFields: ['discount'],
      direction: 'target-band',
      interpretation: { tr: 'Derin indirim marjı yer; marjla birlikte oku.', en: 'Deep discounts erode margin.' },
      compute: (d) => {
        const p = parts(d);
        if (p.sales.every((r) => r.discount === undefined)) return na('discount_depth', 'İndirim verisi yok.');
        const disc = sum(p.sales, (r) => r.discount ?? 0);
        const v = pct(disc, p.grossRevenue);
        return v ? ok('discount_depth', v, d.sourceRef) : na('discount_depth', 'Brüt ciro sıfır.');
      },
    },
    {
      id: 'category_concentration',
      label: { tr: 'Kategori Konsantrasyonu (HHI)', en: 'Category Concentration (HHI)' },
      unit: 'score',
      formula: { tr: 'Σ (kategori ciro payı)² × 10000', en: 'Σ (category revenue share)² × 10000' },
      requiredFields: ['category', 'revenue'],
      direction: 'target-band',
      interpretation: { tr: '0–10000; yüksek = tek kategoriye bağımlılık.', en: '0–10000; higher = concentrated.' },
      compute: (d) => {
        const p = parts(d);
        const byCat = new Map<string, Decimal>();
        for (const r of p.sales) {
          if (!r.category) continue;
          byCat.set(r.category, (byCat.get(r.category) ?? D(0)).plus(r.revenue));
        }
        if (byCat.size === 0 || p.grossRevenue.isZero()) return na('category_concentration', 'Kategori verisi yok.');
        let hhi = D(0);
        const breakdown: { label: string; value: Decimal }[] = [];
        for (const [label, rev] of byCat) {
          const share = rev.div(p.grossRevenue);
          hhi = hhi.plus(share.times(share));
          breakdown.push({ label, value: rev });
        }
        breakdown.sort((a, b) => b.value.comparedTo(a.value));
        return ok('category_concentration', hhi.times(10000), d.sourceRef, breakdown.slice(0, 6));
      },
    },
  ];
}
