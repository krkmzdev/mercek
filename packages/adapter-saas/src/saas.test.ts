import { describe, expect, it } from 'vitest';
import type { KpiResult, SourceRef } from '@mercek/sdk';
import type { SaasCanonical, SaasRow } from './canonical';
import { saasKpis } from './kpis';
import { latestMovement } from './saas';

const ref: SourceRef = { fileId: 'f', filename: 'saas.csv' };
const row = (month: string, customerId: string, mrr: number): SaasRow => ({ month, customerId, mrr });

const data: SaasCanonical = {
  sourceRef: ref,
  rows: [
    row('2024-01', 'C1', 100), row('2024-01', 'C2', 200), row('2024-01', 'C3', 50),
    row('2024-02', 'C1', 100), row('2024-02', 'C2', 150), row('2024-02', 'C4', 80),
    // C3 absent in 2024-02 → churn
  ],
};

const r = new Map<string, KpiResult>(saasKpis().map((k) => [k.id, k.compute(data)]));
const val = (id: string): number => {
  const x = r.get(id);
  if (!x || x.status !== 'ok' || !x.value) throw new Error(`${id} not ok`);
  return x.value.toNumber();
};

describe('SaaS MRR movement — hand-computed (2024-01 → 2024-02)', () => {
  it('decomposes new/expansion/contraction/churn', () => {
    const m = latestMovement(data.rows)!;
    expect(m.newMrr).toBe(80); // C4
    expect(m.expansion).toBe(0);
    expect(m.contraction).toBe(50); // C2 200→150
    expect(m.churn).toBe(50); // C3
    expect(m.churnedCustomers).toBe(1);
    expect(m.startMrr).toBe(350);
  });
});

describe('SaaS KPIs — hand-computed', () => {
  it('mrr (latest) = 330', () => expect(val('mrr')).toBe(330));
  it('arr = 3960', () => expect(val('arr')).toBe(3960));
  it('active_customers = 3', () => expect(val('active_customers')).toBe(3));
  it('arpa = 110', () => expect(val('arpa')).toBeCloseTo(110, 3));
  it('quick_ratio = 80/100 = 0.8 (leaky bucket)', () => expect(val('quick_ratio')).toBeCloseTo(0.8, 3));
  it('nrr = 250/350×100 ≈ 71.4%', () => expect(val('nrr')).toBeCloseTo(71.43, 1));
  it('grr ≈ 71.4%', () => expect(val('grr')).toBeCloseTo(71.43, 1));
  it('logo_churn = 1/3×100 ≈ 33.3%', () => expect(val('logo_churn')).toBeCloseTo(33.33, 1));
  it('revenue_churn = 50/350×100 ≈ 14.3%', () => expect(val('revenue_churn')).toBeCloseTo(14.29, 1));
  it('mrr_growth = (330−350)/350×100 ≈ −5.7%', () => expect(val('mrr_growth')).toBeCloseTo(-5.71, 1));
  it('net_new_mrr = −20', () => expect(val('net_new_mrr')).toBe(-20));

  it('every ok KPI carries evidence', () => {
    for (const k of r.values()) if (k.status === 'ok') expect(k.evidence.length).toBeGreaterThan(0);
  });
});
