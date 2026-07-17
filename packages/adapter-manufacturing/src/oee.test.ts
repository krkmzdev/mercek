import { describe, expect, it } from 'vitest';
import type { KpiResult, SourceRef } from '@mercek/sdk';
import type { MfgCanonical, MfgRow } from './canonical';
import { manufacturingKpis } from './kpis';
import { bindingConstraint, computeOee } from './oee';

const ref: SourceRef = { fileId: 'f', filename: 'uretim.csv' };
const row = (o: Partial<MfgRow>): MfgRow => ({
  timestamp: new Date('2026-01-01'), machineId: 'M1', plannedTime: 0, runtime: 0, idealCycleTime: 1, totalCount: 0, goodCount: 0, ...o,
});

const data: MfgCanonical = {
  sourceRef: ref,
  rows: [
    row({ machineId: 'M1', plannedTime: 100, runtime: 90, idealCycleTime: 1, totalCount: 80, goodCount: 79 }),
    row({ machineId: 'M2', plannedTime: 100, runtime: 60, idealCycleTime: 1, totalCount: 55, goodCount: 54, downtimeReason: 'Arıza' }),
  ],
};

const r = new Map<string, KpiResult>(manufacturingKpis().map((k) => [k.id, k.compute(data)]));
const val = (id: string): number => {
  const x = r.get(id);
  if (!x || x.status !== 'ok' || !x.value) throw new Error(`${id} not ok`);
  return x.value.toNumber();
};

describe('OEE engine — hand-computed', () => {
  it('overall OEE = A×P×Q ≈ 66.5%', () => {
    const o = computeOee(data.rows)!;
    expect(o.availability).toBeCloseTo(0.75, 3);
    expect(o.performance).toBeCloseTo(0.9, 3);
    expect(o.quality).toBeCloseTo(0.98519, 4);
    expect(o.oee * 100).toBeCloseTo(66.5, 1);
  });
  it('names availability as the binding constraint', () => {
    expect(bindingConstraint(computeOee(data.rows)!)).toBe('availability');
  });
});

describe('Manufacturing KPIs — hand-computed', () => {
  it('oee ≈ 66.5', () => expect(val('oee')).toBeCloseTo(66.5, 1));
  it('availability = 75', () => expect(val('availability')).toBeCloseTo(75, 1));
  it('performance = 90', () => expect(val('performance')).toBeCloseTo(90, 1));
  it('quality ≈ 98.5', () => expect(val('quality')).toBeCloseTo(98.52, 1));
  it('scrap_rate ≈ 1.48', () => expect(val('scrap_rate')).toBeCloseTo(1.48, 1));
  it('capacity_utilization = 67.5', () => expect(val('capacity_utilization')).toBeCloseTo(67.5, 1));
  it('worst_machine_oee ≈ 54 (M2 hidden by composite)', () => expect(val('worst_machine_oee')).toBeCloseTo(54.0, 0));
  it('downtime_top_share = 80 (Arıza)', () => expect(val('downtime_top_share')).toBeCloseTo(80, 0));
  it('mtbf = 2.5 h', () => expect(val('mtbf')).toBeCloseTo(2.5, 2));
  it('mttr = 40 min', () => expect(val('mttr')).toBeCloseTo(40, 0));

  it('every ok KPI carries evidence', () => {
    for (const k of r.values()) if (k.status === 'ok') expect(k.evidence.length).toBeGreaterThan(0);
  });
});
