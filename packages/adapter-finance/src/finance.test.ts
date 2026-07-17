import { describe, expect, it } from 'vitest';
import type { KpiResult, SourceRef } from '@mercek/sdk';
import type { FinanceCanonical, FinancePeriod } from './canonical';
import { financeKpis } from './kpis';
import { computeRealReturn } from './realreturn';

const ref: SourceRef = { fileId: 'f', filename: 'mizan.csv' };

const periods: FinancePeriod[] = [
  { period: '2024-Q1', netSales: 1000, cpiIndex: 100 },
  { period: '2024-Q2', netSales: 1080, cpiIndex: 110 },
  { period: '2024-Q3', netSales: 1180, cpiIndex: 122 },
  { period: '2024-Q4', netSales: 1280, cpiIndex: 133 },
  {
    period: '2025-Q1',
    netSales: 1384, cogs: 900, operatingProfit: 150, netProfit: 80, depreciation: 50,
    currentAssets: 800, inventory: 300, receivables: 400, currentLiabilities: 500,
    payables: 250, totalDebt: 700, equity: 600, cpiIndex: 144.1,
  },
];
const data: FinanceCanonical = { periods, sourceRef: ref };

const r = new Map<string, KpiResult>(financeKpis().map((k) => [k.id, k.compute(data)]));
const val = (id: string): number => {
  const x = r.get(id);
  if (!x || x.status !== 'ok' || !x.value) throw new Error(`${id} not ok`);
  return x.value.toNumber();
};

describe('TÜFE real-return engine — verified against the brief example', () => {
  it('nominal +38.4%, CPI +44.1% → real −4.0%', () => {
    const rr = computeRealReturn(periods)!;
    expect(rr.nominalGrowthPct).toBeCloseTo(38.4, 1);
    expect(rr.inflationPct).toBeCloseTo(44.1, 1);
    expect(rr.realGrowthPct).toBeCloseTo(-4.0, 1); // (1.384/1.441)-1
  });
  it('real_growth KPI surfaces the contraction', () => {
    expect(val('real_growth')).toBeCloseTo(-4.0, 1);
  });
});

describe('Finance KPIs — hand-computed (latest period)', () => {
  it('current_ratio = 800/500', () => expect(val('current_ratio')).toBeCloseTo(1.6, 3));
  it('acid_test = (800−300)/500', () => expect(val('acid_test')).toBeCloseTo(1.0, 3));
  it('gross_margin = (1384−900)/1384×100', () => expect(val('gross_margin')).toBeCloseTo(34.97, 1));
  it('ebitda = 150 + 50', () => expect(val('ebitda')).toBe(200));
  it('dso = 400/1384×91', () => expect(val('dso')).toBeCloseTo(26.3, 1));
  it('dio = 300/900×91', () => expect(val('dio')).toBeCloseTo(30.33, 1));
  it('dpo = 250/900×91', () => expect(val('dpo')).toBeCloseTo(25.28, 1));
  it('ccc = dso + dio − dpo', () => expect(val('ccc')).toBeCloseTo(31.36, 1));
  it('debt_to_equity = 700/600', () => expect(val('debt_to_equity')).toBeCloseTo(1.167, 2));
  it('working_capital = 800 − 500', () => expect(val('working_capital')).toBe(300));

  it('degrades when a required line item is missing', () => {
    const bare: FinanceCanonical = { periods: [{ period: '2025-Q1', netSales: 1000 }], sourceRef: ref };
    const rr = new Map(financeKpis().map((k) => [k.id, k.compute(bare)]));
    expect(rr.get('current_ratio')?.status).toBe('unavailable');
    expect(rr.get('ccc')?.status).toBe('unavailable');
  });
});
