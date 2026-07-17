import { describe, expect, it } from 'vitest';
import type { KpiResult, SourceRef } from '@mercek/sdk';
import type { RetailCanonical, RetailRow } from './canonical';
import { retailKpis } from './kpis';

const ref: SourceRef = { fileId: 'f', filename: 'sales.csv' };
const d = (o: Partial<RetailRow>): RetailRow => ({
  date: new Date('2026-01-01'),
  quantity: 1,
  revenue: 0,
  ...o,
});

// Hand-computed dataset (see assertions):
const data: RetailCanonical = {
  sourceRef: ref,
  rows: [
    d({ revenue: 100, quantity: 2, cost: 60, discount: 10, category: 'A', sku: 'S1', customerId: 'C1' }),
    d({ revenue: 200, quantity: 1, cost: 100, discount: 0, category: 'A', sku: 'S2', customerId: 'C1' }),
    d({ revenue: 300, quantity: 3, cost: 150, discount: 30, category: 'B', sku: 'S3', customerId: 'C2' }),
    d({ revenue: 50, quantity: 1, category: 'A', sku: 'S1', customerId: 'C3', returnFlag: true }),
  ],
};

const results = new Map<string, KpiResult>(retailKpis().map((k) => [k.id, k.compute(data)]));
const val = (id: string): number => {
  const r = results.get(id);
  if (!r || r.status !== 'ok' || !r.value) throw new Error(`${id} not ok`);
  return r.value.toNumber();
};

describe('retail KPIs — hand-computed', () => {
  it('total_revenue = gross − returns = 600 − 50', () => expect(val('total_revenue')).toBe(550));
  it('aov = 600 / 3 orders', () => expect(val('aov')).toBe(200));
  it('units_per_order = 6 / 3', () => expect(val('units_per_order')).toBe(2));
  it('gross_margin = (600 − 310) / 600 × 100', () => expect(val('gross_margin')).toBeCloseTo(48.333, 3));
  it('return_rate = 1 / 4 × 100', () => expect(val('return_rate')).toBe(25));
  it('return_value_rate = 50 / 600 × 100', () => expect(val('return_value_rate')).toBeCloseTo(8.333, 3));
  it('pareto = top-1 SKU (S3=300) share of 600', () => expect(val('pareto')).toBe(50));
  it('repeat_rate = 1 repeat / 3 customers × 100', () => expect(val('repeat_rate')).toBeCloseTo(33.333, 3));
  it('discount_depth = 40 / 600 × 100', () => expect(val('discount_depth')).toBeCloseTo(6.667, 3));
  it('category_concentration HHI = (0.5² + 0.5²) × 10000', () => expect(val('category_concentration')).toBe(5000));

  it('inventory_turnover degrades cleanly (no inventory data)', () => {
    const r = results.get('inventory_turnover');
    expect(r?.status).toBe('unavailable');
    expect(r?.unavailableReason).toContain('Envanter');
  });

  it('every ok KPI carries evidence', () => {
    for (const r of results.values()) {
      if (r.status === 'ok') expect(r.evidence.length).toBeGreaterThan(0);
    }
  });
});

describe('retail KPIs — graceful degradation', () => {
  it('marks cost/return/category/discount KPIs unavailable when fields absent', () => {
    const bare: RetailCanonical = {
      sourceRef: ref,
      rows: [d({ revenue: 100, quantity: 1 }), d({ revenue: 200, quantity: 2 })],
    };
    const r = new Map(retailKpis().map((k) => [k.id, k.compute(bare)]));
    expect(r.get('gross_margin')?.status).toBe('unavailable');
    expect(r.get('return_rate')?.status).toBe('unavailable');
    expect(r.get('discount_depth')?.status).toBe('unavailable');
    expect(r.get('category_concentration')?.status).toBe('unavailable');
    // revenue/quantity KPIs still compute
    expect(r.get('total_revenue')?.status).toBe('ok');
    expect(r.get('aov')?.status).toBe('ok');
  });
});
