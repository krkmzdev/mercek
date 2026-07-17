import { Decimal } from '@mercek/sdk';
import type { RetailCanonical } from './canonical';

/**
 * Sector-specific breakdowns handed to the analysis prompt. These surface the
 * signals a retail analyst would look for — per-SKU return anomalies, quietly
 * declining categories, discount-driven margin erosion — without pre-labelling
 * the answer, so the model does the reasoning (spec §10.1).
 */
export interface RetailSignals {
  rowCount: number;
  dateRange: { start: string; end: string };
  returnBySku: { sku: string; sales: number; returns: number; returnRatePct: number }[];
  categoryTrend: { category: string; firstRev: number; lastRev: number; changePct: number }[];
  weeklyDiscountMargin: { week: string; discountDepthPct: number; grossMarginPct: number | null }[];
}

const iso = (d: Date): string => d.toISOString().slice(0, 10);
const month = (d: Date): string => d.toISOString().slice(0, 7);
function weekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const num = (d: Decimal): number => Math.round(d.toNumber() * 100) / 100;

export function computeSignals(data: RetailCanonical): RetailSignals {
  const rows = data.rows;
  const sales = rows.filter((r) => !r.returnFlag);
  const returns = rows.filter((r) => r.returnFlag);
  const dates = rows.map((r) => r.date.getTime()).filter((t) => !Number.isNaN(t));

  // Return rate per SKU (only SKUs with enough volume to be meaningful).
  const salesBySku = new Map<string, number>();
  const retBySku = new Map<string, number>();
  for (const r of sales) if (r.sku) salesBySku.set(r.sku, (salesBySku.get(r.sku) ?? 0) + 1);
  for (const r of returns) if (r.sku) retBySku.set(r.sku, (retBySku.get(r.sku) ?? 0) + 1);
  const returnBySku = [...salesBySku.entries()]
    .filter(([, s]) => s >= 10)
    .map(([sku, s]) => {
      const ret = retBySku.get(sku) ?? 0;
      return { sku, sales: s, returns: ret, returnRatePct: Math.round((ret / s) * 1000) / 10 };
    })
    .sort((a, b) => b.returnRatePct - a.returnRatePct)
    .slice(0, 8);

  // Category revenue: first vs last active month.
  const catMonth = new Map<string, Map<string, Decimal>>();
  for (const r of sales) {
    if (!r.category) continue;
    const m = catMonth.get(r.category) ?? new Map<string, Decimal>();
    m.set(month(r.date), (m.get(month(r.date)) ?? new Decimal(0)).plus(r.revenue));
    catMonth.set(r.category, m);
  }
  const categoryTrend = [...catMonth.entries()].map(([category, m]) => {
    const months = [...m.keys()].sort();
    const firstRev = num(m.get(months[0]!) ?? new Decimal(0));
    const lastRev = num(m.get(months[months.length - 1]!) ?? new Decimal(0));
    const changePct = firstRev === 0 ? 0 : Math.round(((lastRev - firstRev) / firstRev) * 1000) / 10;
    return { category, firstRev, lastRev, changePct };
  });

  // Weekly discount depth vs gross margin.
  const weekAgg = new Map<string, { rev: Decimal; disc: Decimal; cost: Decimal; hasCost: boolean }>();
  for (const r of sales) {
    const k = weekKey(r.date);
    const a = weekAgg.get(k) ?? { rev: new Decimal(0), disc: new Decimal(0), cost: new Decimal(0), hasCost: false };
    a.rev = a.rev.plus(r.revenue);
    a.disc = a.disc.plus(r.discount ?? 0);
    if (r.cost !== undefined) {
      a.cost = a.cost.plus(r.cost);
      a.hasCost = true;
    }
    weekAgg.set(k, a);
  }
  const weeklyDiscountMargin = [...weekAgg.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, a]) => ({
      week,
      discountDepthPct: a.rev.isZero() ? 0 : num(a.disc.div(a.rev).times(100)),
      grossMarginPct: a.hasCost && !a.rev.isZero() ? num(a.rev.minus(a.cost).div(a.rev).times(100)) : null,
    }));

  return {
    rowCount: rows.length,
    dateRange: {
      start: dates.length ? iso(new Date(Math.min(...dates))) : '',
      end: dates.length ? iso(new Date(Math.max(...dates))) : '',
    },
    returnBySku,
    categoryTrend,
    weeklyDiscountMargin,
  };
}
