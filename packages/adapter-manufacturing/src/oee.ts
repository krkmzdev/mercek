import type { MfgCanonical, MfgRow } from './canonical';

/**
 * OEE engine (spec §10.4 — the signature). Always decompose OEE into
 * Availability × Performance × Quality and name the *binding constraint*: a
 * plant at 62% OEE with A=71%, P=94%, Q=93% has a downtime problem, not a
 * quality problem. The downtime Pareto then says which reason to attack.
 */
export interface Oee {
  availability: number; // 0–1
  performance: number;
  quality: number;
  oee: number;
}

const sum = (rows: MfgRow[], f: (r: MfgRow) => number): number => rows.reduce((s, r) => s + f(r), 0);

export function computeOee(rows: MfgRow[]): Oee | null {
  const planned = sum(rows, (r) => r.plannedTime);
  const runtime = sum(rows, (r) => r.runtime);
  const total = sum(rows, (r) => r.totalCount);
  const good = sum(rows, (r) => r.goodCount);
  const idealRuntime = sum(rows, (r) => r.idealCycleTime * r.totalCount);
  if (planned === 0 || runtime === 0 || total === 0) return null;

  const availability = runtime / planned;
  const performance = idealRuntime / runtime;
  const quality = good / total;
  return { availability, performance, quality, oee: availability * performance * quality };
}

export interface MachineOee extends Oee {
  machineId: string;
}

export function oeeByMachine(rows: MfgRow[]): MachineOee[] {
  const byMachine = new Map<string, MfgRow[]>();
  for (const r of rows) byMachine.set(r.machineId, [...(byMachine.get(r.machineId) ?? []), r]);
  const out: MachineOee[] = [];
  for (const [machineId, mrows] of byMachine) {
    const o = computeOee(mrows);
    if (o) out.push({ machineId, ...o });
  }
  return out.sort((a, b) => a.oee - b.oee);
}

export type Factor = 'availability' | 'performance' | 'quality';

/** The lowest of A/P/Q — the factor dragging OEE down. */
export function bindingConstraint(o: Oee): Factor {
  const entries: [Factor, number][] = [
    ['availability', o.availability],
    ['performance', o.performance],
    ['quality', o.quality],
  ];
  return entries.sort((a, b) => a[1] - b[1])[0]![0];
}

export interface DowntimeReason {
  reason: string;
  downtimeMin: number;
  sharePct: number;
}

/** Downtime (planned − runtime) grouped by reason, Pareto-ranked. */
export function downtimePareto(rows: MfgRow[]): DowntimeReason[] {
  const byReason = new Map<string, number>();
  let totalDowntime = 0;
  for (const r of rows) {
    const dt = Math.max(0, r.plannedTime - r.runtime);
    if (dt === 0) continue;
    const reason = r.downtimeReason ?? 'Bilinmeyen';
    byReason.set(reason, (byReason.get(reason) ?? 0) + dt);
    totalDowntime += dt;
  }
  return [...byReason.entries()]
    .map(([reason, downtimeMin]) => ({
      reason,
      downtimeMin: Math.round(downtimeMin),
      sharePct: totalDowntime === 0 ? 0 : Math.round((downtimeMin / totalDowntime) * 1000) / 10,
    }))
    .sort((a, b) => b.downtimeMin - a.downtimeMin);
}

export function computeCanonicalOee(d: MfgCanonical): Oee | null {
  return computeOee(d.rows);
}
