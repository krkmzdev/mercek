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
import { SAAS_ALIASES } from './aliases';
import type { SaasCanonical, SaasField, SaasRow } from './canonical';

const REQUIRED: SaasField[] = ['month', 'customerId', 'mrr'];

const FIELD_IMPACT: Partial<Record<SaasField, { impact: string; affectedKpis: string[] }>> = {
  signupDate: { impact: 'Kohort retention hesaplanamaz', affectedKpis: [] },
  acquisitionCost: { impact: 'CAC/LTV hesaplanamaz', affectedKpis: [] },
};

const toNum = (v: CellValue | undefined): number | undefined =>
  parseLocaleNumber(typeof v === 'number' ? v : String(v ?? '')).value ?? undefined;
const toDate = (v: CellValue | undefined): Date | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? undefined : d;
};

export async function mapSaas(tables: ExtractedTable[], ctx: MapContext): Promise<MapResult<SaasCanonical>> {
  const table = [...tables].sort((a, b) => b.rows.length - a.rows.length)[0]!;
  const { matches } = matchHeaders(table.headers, SAAS_ALIASES);

  const colOf = new Map<SaasField, number>();
  const mapping: ColumnMapping[] = [];
  for (const [header, m] of matches) {
    const f = m.canonicalField as SaasField;
    if (colOf.has(f)) continue;
    colOf.set(f, table.headers.indexOf(header));
    mapping.push({ sourceHeader: header, sourceRef: table.sourceRef, canonicalField: f, confidence: m.confidence, method: m.method });
  }

  const get = (r: CellValue[], f: SaasField): CellValue | undefined => {
    const i = colOf.get(f);
    return i === undefined ? undefined : r[i];
  };
  const rows: SaasRow[] = [];
  if (REQUIRED.every((f) => colOf.has(f))) {
    for (const r of table.rows) {
      const month = String(get(r, 'month') ?? '').trim();
      const customerId = String(get(r, 'customerId') ?? '').trim();
      const mrr = toNum(get(r, 'mrr'));
      if (month === '' || customerId === '' || mrr === undefined) continue;
      const row: SaasRow = { month, customerId, mrr };
      const plan = get(r, 'plan');
      if (plan !== undefined) row.plan = String(plan);
      const status = get(r, 'status');
      if (status !== undefined) row.status = String(status);
      const seats = get(r, 'seats');
      if (seats !== undefined) row.seats = toNum(seats);
      const ac = get(r, 'acquisitionCost');
      if (ac !== undefined) row.acquisitionCost = toNum(ac);
      const sd = toDate(get(r, 'signupDate'));
      if (sd) row.signupDate = sd;
      const cd = toDate(get(r, 'churnDate'));
      if (cd) row.churnDate = cd;
      rows.push(row);
    }
  }

  const missingFields: MissingField[] = [];
  for (const [field, impact] of Object.entries(FIELD_IMPACT)) {
    if (!colOf.has(field as SaasField)) missingFields.push({ field, impact: impact.impact, affectedKpis: impact.affectedKpis });
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
