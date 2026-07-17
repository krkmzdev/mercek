import type { FnbCanonical, FnbRow } from './canonical';

/** Menu-engineering quadrant (spec §10.2 — the signature deliverable). */
export type Quadrant = 'star' | 'plowhorse' | 'puzzle' | 'dog';

export interface MenuItem {
  item: string;
  units: number;
  revenue: number;
  cmPerUnit: number;
  popularityPct: number;
  quadrant: Quadrant;
}

export interface MenuAnalysis {
  items: MenuItem[];
  avgCmPerUnit: number;
  popularityThresholdPct: number;
  counts: Record<Quadrant, number>;
}

/**
 * Classify every menu item into a quadrant by popularity × contribution margin.
 * Popularity threshold is the classic 70% of average item share; margin
 * threshold is the menu-wide average contribution margin per unit.
 */
export function menuEngineering(data: FnbCanonical): MenuAnalysis | null {
  const sales = data.rows.filter((r) => !r.voidFlag && r.foodCost !== undefined);
  if (sales.length === 0) return null;

  const byItem = new Map<string, { units: number; revenue: number; foodCost: number }>();
  for (const r of sales) {
    const a = byItem.get(r.itemName) ?? { units: 0, revenue: 0, foodCost: 0 };
    a.units += r.quantity;
    a.revenue += r.revenue;
    a.foodCost += r.foodCost ?? 0;
    byItem.set(r.itemName, a);
  }

  const totalUnits = [...byItem.values()].reduce((s, a) => s + a.units, 0);
  const totalCm = [...byItem.values()].reduce((s, a) => s + (a.revenue - a.foodCost), 0);
  const avgCmPerUnit = totalUnits === 0 ? 0 : totalCm / totalUnits;
  const popularityThresholdPct = (100 / byItem.size) * 0.7;

  const items: MenuItem[] = [...byItem.entries()].map(([item, a]) => {
    const cmPerUnit = a.units === 0 ? 0 : (a.revenue - a.foodCost) / a.units;
    const popularityPct = totalUnits === 0 ? 0 : (a.units / totalUnits) * 100;
    const highPop = popularityPct >= popularityThresholdPct;
    const highCm = cmPerUnit >= avgCmPerUnit;
    const quadrant: Quadrant = highPop
      ? highCm
        ? 'star'
        : 'plowhorse'
      : highCm
        ? 'puzzle'
        : 'dog';
    return {
      item,
      units: a.units,
      revenue: Math.round(a.revenue * 100) / 100,
      cmPerUnit: Math.round(cmPerUnit * 100) / 100,
      popularityPct: Math.round(popularityPct * 10) / 10,
      quadrant,
    };
  });

  const counts: Record<Quadrant, number> = { star: 0, plowhorse: 0, puzzle: 0, dog: 0 };
  for (const it of items) counts[it.quadrant]++;

  return { items, avgCmPerUnit: Math.round(avgCmPerUnit * 100) / 100, popularityThresholdPct, counts };
}

/** Rows that are actual (non-void) sales. */
export function sales(rows: FnbRow[]): FnbRow[] {
  return rows.filter((r) => !r.voidFlag);
}
