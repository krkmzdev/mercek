import type { MfgCanonical } from './canonical';
import { bindingConstraint, computeOee, downtimePareto, oeeByMachine, type MachineOee, type Oee } from './oee';

export interface MfgSignals {
  rowCount: number;
  overall: Oee | null;
  binding: 'availability' | 'performance' | 'quality' | null;
  byMachine: MachineOee[];
  downtime: { reason: string; downtimeMin: number; sharePct: number }[];
}

export function computeMfgSignals(data: MfgCanonical): MfgSignals {
  const overall = computeOee(data.rows);
  return {
    rowCount: data.rows.length,
    overall,
    binding: overall ? bindingConstraint(overall) : null,
    byMachine: oeeByMachine(data.rows),
    downtime: downtimePareto(data.rows),
  };
}
