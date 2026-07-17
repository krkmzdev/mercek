import { describe, expect, it } from 'vitest';
import type { KpiResult, SourceRef } from '@mercek/sdk';
import type { FnbCanonical, FnbRow } from './canonical';
import { fnbKpis } from './kpis';

const ref: SourceRef = { fileId: 'f', filename: 'pos.csv' };
const row = (o: Partial<FnbRow>): FnbRow => ({ datetime: new Date('2026-01-01T20:00:00Z'), itemName: 'X', quantity: 1, revenue: 0, ...o });

const data: FnbCanonical = {
  sourceRef: ref,
  rows: [
    row({ itemName: 'Köfte', quantity: 2, revenue: 200, foodCost: 60, orderId: 'O1', covers: 2, daypart: 'Akşam' }),
    row({ itemName: 'Köfte', quantity: 1, revenue: 100, foodCost: 30, orderId: 'O2', covers: 1, daypart: 'Öğle' }),
    row({ itemName: 'Salata', quantity: 3, revenue: 150, foodCost: 90, orderId: 'O1', covers: 2, daypart: 'Akşam' }),
    row({ itemName: 'Tatlı', quantity: 1, revenue: 80, foodCost: 20, orderId: 'O3', covers: 1, daypart: 'Öğle' }),
    row({ itemName: 'Köfte', quantity: 1, revenue: 100, foodCost: 0, orderId: 'O4', daypart: 'Akşam', voidFlag: true }),
  ],
};

const r = new Map<string, KpiResult>(fnbKpis().map((k) => [k.id, k.compute(data)]));
const val = (id: string): number => {
  const x = r.get(id);
  if (!x || x.status !== 'ok' || !x.value) throw new Error(`${id} not ok`);
  return x.value.toNumber();
};

describe('F&B KPIs — hand-computed', () => {
  it('food_cost_pct = 200/530×100', () => expect(val('food_cost_pct')).toBeCloseTo(37.736, 2));
  it('avg_check = 530 / 3 orders', () => expect(val('avg_check')).toBeCloseTo(176.667, 2));
  it('per_cover_spend = 530 / 6 covers', () => expect(val('per_cover_spend')).toBeCloseTo(88.333, 2));
  it('void_rate = 100/630×100', () => expect(val('void_rate')).toBeCloseTo(15.873, 2));
  it('daypart_top_share = Akşam 350/530×100', () => expect(val('daypart_top_share')).toBeCloseTo(66.038, 2));
  it('contribution_margin_avg = 330/7', () => expect(val('contribution_margin_avg')).toBeCloseTo(47.14, 1));
  it('menu_dogs = 0 (Köfte star, Salata plowhorse, Tatlı puzzle)', () => expect(val('menu_dogs')).toBe(0));

  it('prime_cost and table_turnover degrade (no labor / seats)', () => {
    expect(r.get('prime_cost_pct')?.status).toBe('unavailable');
    expect(r.get('table_turnover')?.status).toBe('unavailable');
  });

  it('every ok KPI carries evidence', () => {
    for (const k of r.values()) if (k.status === 'ok') expect(k.evidence.length).toBeGreaterThan(0);
  });
});
