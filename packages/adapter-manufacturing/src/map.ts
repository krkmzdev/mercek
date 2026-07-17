import {
  matchHeaders,
  parseLocaleNumber,
  type CellValue,
  type ColumnMapping,
  type ExtractedTable,
  type MapContext,
  type MapResult,
  type MissingField,
} from '@mercek/sdk';
import { MFG_ALIASES } from './aliases';
import type { MfgCanonical, MfgField, MfgRow } from './canonical';

const REQUIRED: MfgField[] = ['machineId', 'plannedTime', 'runtime', 'idealCycleTime', 'totalCount', 'goodCount'];

const FIELD_IMPACT: Partial<Record<MfgField, { impact: string; affectedKpis: string[] }>> = {
  downtimeReason: { impact: 'Duruş Pareto, MTBF/MTTR hesaplanamaz', affectedKpis: ['downtime_top_share', 'mtbf', 'mttr'] },
  machineId: { impact: 'Makine bazlı OEE hesaplanamaz', affectedKpis: ['worst_machine_oee'] },
};

const toNum = (v: CellValue | undefined): number | undefined =>
  parseLocaleNumber(typeof v === 'number' ? v : String(v ?? '')).value ?? undefined;
const toDate = (v: CellValue | undefined): Date => (v instanceof Date ? v : new Date(String(v ?? '')));

export async function mapManufacturing(tables: ExtractedTable[], ctx: MapContext): Promise<MapResult<MfgCanonical>> {
  const table = [...tables].sort((a, b) => b.rows.length - a.rows.length)[0]!;
  const { matches } = matchHeaders(table.headers, MFG_ALIASES);

  const colOf = new Map<MfgField, number>();
  const mapping: ColumnMapping[] = [];
  for (const [header, m] of matches) {
    const f = m.canonicalField as MfgField;
    if (colOf.has(f)) continue;
    colOf.set(f, table.headers.indexOf(header));
    mapping.push({ sourceHeader: header, sourceRef: table.sourceRef, canonicalField: f, confidence: m.confidence, method: m.method });
  }

  const get = (r: CellValue[], f: MfgField): CellValue | undefined => {
    const i = colOf.get(f);
    return i === undefined ? undefined : r[i];
  };
  const rows: MfgRow[] = [];
  if (REQUIRED.every((f) => colOf.has(f))) {
    for (const r of table.rows) {
      const machineId = String(get(r, 'machineId') ?? '').trim();
      const plannedTime = toNum(get(r, 'plannedTime'));
      const runtime = toNum(get(r, 'runtime'));
      const idealCycleTime = toNum(get(r, 'idealCycleTime'));
      const totalCount = toNum(get(r, 'totalCount'));
      const goodCount = toNum(get(r, 'goodCount'));
      if (machineId === '' || plannedTime === undefined || runtime === undefined || idealCycleTime === undefined || totalCount === undefined || goodCount === undefined) continue;
      const row: MfgRow = { timestamp: toDate(get(r, 'timestamp')), machineId, plannedTime, runtime, idealCycleTime, totalCount, goodCount };
      const wo = get(r, 'workOrderId');
      if (wo !== undefined) row.workOrderId = String(wo);
      const dr = get(r, 'downtimeReason');
      if (dr !== undefined && String(dr).trim() !== '') row.downtimeReason = String(dr);
      const sh = get(r, 'shift');
      if (sh !== undefined) row.shift = String(sh);
      const op = get(r, 'operatorId');
      if (op !== undefined) row.operatorId = String(op);
      rows.push(row);
    }
  }

  const missingFields: MissingField[] = [];
  for (const [field, impact] of Object.entries(FIELD_IMPACT)) {
    if (!colOf.has(field as MfgField)) missingFields.push({ field, impact: impact.impact, affectedKpis: impact.affectedKpis });
  }

  const confs = mapping.map((m) => m.confidence);
  const missingRequired = REQUIRED.filter((f) => !colOf.has(f));
  const confidence = missingRequired.length > 0 || confs.length === 0 ? 0.3 : confs.reduce((a, b) => a + b, 0) / confs.length;

  void ctx;
  return {
    data: { rows, sourceRef: table.sourceRef },
    mapping,
    unmappedColumns: table.headers.filter((h) => !mapping.some((m) => m.sourceHeader === h)),
    missingFields,
    confidence,
  };
}
