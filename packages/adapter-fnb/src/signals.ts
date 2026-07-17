import { Decimal } from '@mercek/sdk';
import type { FnbCanonical } from './canonical';
import { menuEngineering, type MenuAnalysis } from './menu';

export interface FnbSignals {
  rowCount: number;
  menu: MenuAnalysis | null;
  daypartMargin: { daypart: string; revenuePct: number; foodCostPct: number | null }[];
}

const num = (d: Decimal): number => Math.round(d.toNumber() * 10) / 10;

export function computeFnbSignals(data: FnbCanonical): FnbSignals {
  const sales = data.rows.filter((r) => !r.voidFlag);
  const total = sales.reduce((a, r) => a.plus(r.revenue), new Decimal(0));

  const byPart = new Map<string, { rev: Decimal; food: Decimal; hasFood: boolean }>();
  for (const r of sales) {
    if (!r.daypart) continue;
    const a = byPart.get(r.daypart) ?? { rev: new Decimal(0), food: new Decimal(0), hasFood: false };
    a.rev = a.rev.plus(r.revenue);
    if (r.foodCost !== undefined) {
      a.food = a.food.plus(r.foodCost);
      a.hasFood = true;
    }
    byPart.set(r.daypart, a);
  }

  const daypartMargin = [...byPart.entries()]
    .map(([daypart, a]) => ({
      daypart,
      revenuePct: total.isZero() ? 0 : num(a.rev.div(total).times(100)),
      foodCostPct: a.hasFood && !a.rev.isZero() ? num(a.food.div(a.rev).times(100)) : null,
    }))
    .sort((a, b) => b.revenuePct - a.revenuePct);

  return { rowCount: data.rows.length, menu: menuEngineering(data), daypartMargin };
}
