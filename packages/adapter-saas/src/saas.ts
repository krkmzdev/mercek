import type { SaasCanonical, SaasRow } from './canonical';

/**
 * SaaS metric engine (spec §10.5). The Quick Ratio — (new + expansion) ÷
 * (contraction + churn) — exposes the leaky bucket: MRR can grow while a
 * quick ratio near 1 says almost every new dollar is offset by a lost one.
 */
export function months(rows: SaasRow[]): string[] {
  return [...new Set(rows.map((r) => r.month))].sort();
}

/** customerId → MRR for a month (active = mrr > 0). */
export function mrrByCustomer(rows: SaasRow[], month: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) if (r.month === month && r.mrr > 0) m.set(r.customerId, r.mrr);
  return m;
}

export interface Movement {
  fromMonth: string;
  toMonth: string;
  startMrr: number;
  endMrr: number;
  newMrr: number;
  expansion: number;
  contraction: number;
  churn: number;
  startCustomers: number;
  activeCustomers: number;
  churnedCustomers: number;
}

export function movement(rows: SaasRow[], fromMonth: string, toMonth: string): Movement {
  const prev = mrrByCustomer(rows, fromMonth);
  const curr = mrrByCustomer(rows, toMonth);
  let newMrr = 0, expansion = 0, contraction = 0, churn = 0, churnedCustomers = 0;
  const ids = new Set([...prev.keys(), ...curr.keys()]);
  for (const id of ids) {
    const p = prev.get(id) ?? 0;
    const c = curr.get(id) ?? 0;
    if (p === 0 && c > 0) newMrr += c;
    else if (p > 0 && c === 0) { churn += p; churnedCustomers++; }
    else if (c > p) expansion += c - p;
    else if (c < p) contraction += p - c;
  }
  const startMrr = [...prev.values()].reduce((a, b) => a + b, 0);
  const endMrr = [...curr.values()].reduce((a, b) => a + b, 0);
  return { fromMonth, toMonth, startMrr, endMrr, newMrr, expansion, contraction, churn, startCustomers: prev.size, activeCustomers: curr.size, churnedCustomers };
}

/** The most recent month-over-month movement. */
export function latestMovement(rows: SaasRow[]): Movement | null {
  const ms = months(rows);
  if (ms.length < 2) return null;
  return movement(rows, ms[ms.length - 2]!, ms[ms.length - 1]!);
}

function signupMonthOf(rows: SaasRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of rows) {
    const m = r.signupDate ? r.signupDate.toISOString().slice(0, 7) : r.month;
    const existing = map.get(r.customerId);
    if (!existing || m < existing) map.set(r.customerId, m);
  }
  return map;
}

export interface CohortRow {
  cohort: string;
  size: number;
  retentionPct: number[];
}

/** Retention curve per signup-month cohort. */
export function cohortRetention(rows: SaasRow[]): CohortRow[] {
  const ms = months(rows);
  const idx = new Map(ms.map((m, i) => [m, i]));
  const signup = signupMonthOf(rows);
  const activeByMonth = new Map(ms.map((m) => [m, mrrByCustomer(rows, m)]));

  const cohorts = new Map<string, string[]>();
  for (const [id, c] of signup) cohorts.set(c, [...(cohorts.get(c) ?? []), id]);

  const out: CohortRow[] = [];
  for (const cohort of [...cohorts.keys()].sort()) {
    const members = cohorts.get(cohort)!;
    const start = idx.get(cohort);
    if (start === undefined) continue;
    const retentionPct: number[] = [];
    for (let k = 0; start + k < ms.length; k++) {
      const monthMap = activeByMonth.get(ms[start + k]!)!;
      const active = members.filter((id) => monthMap.has(id)).length;
      retentionPct.push(Math.round((active / members.length) * 1000) / 10);
    }
    out.push({ cohort, size: members.length, retentionPct });
  }
  return out;
}

export function currentMrr(data: SaasCanonical): number {
  const ms = months(data.rows);
  if (ms.length === 0) return 0;
  return [...mrrByCustomer(data.rows, ms[ms.length - 1]!).values()].reduce((a, b) => a + b, 0);
}
