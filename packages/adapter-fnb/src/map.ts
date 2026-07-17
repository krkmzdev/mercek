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
import { FNB_ALIASES } from './aliases';
import type { FnbCanonical, FnbField, FnbRow } from './canonical';

const REQUIRED: FnbField[] = ['datetime', 'itemName', 'quantity', 'revenue'];

const FIELD_IMPACT: Partial<Record<FnbField, { impact: string; affectedKpis: string[] }>> = {
  foodCost: { impact: 'Food cost, katkı payı ve menü mühendisliği hesaplanamaz', affectedKpis: ['food_cost_pct', 'menu_dogs', 'contribution_margin_avg'] },
  covers: { impact: 'Kişi başı harcama hesaplanamaz', affectedKpis: ['per_cover_spend'] },
  voidFlag: { impact: 'Void/ikram oranı hesaplanamaz', affectedKpis: ['void_rate'] },
  daypart: { impact: 'Öğün dağılımı hesaplanamaz', affectedKpis: ['daypart_top_share'] },
  orderId: { impact: 'Ortalama adisyon hesaplanamaz', affectedKpis: ['avg_check'] },
};

const toNum = (v: CellValue | undefined): number | undefined =>
  parseLocaleNumber(typeof v === 'number' ? v : String(v ?? '')).value ?? undefined;
const toBool = (v: CellValue | undefined): boolean => {
  if (typeof v === 'boolean') return v;
  return ['1', 'true', 'evet', 'iptal', 'void', 'ikram', 'yes', 'x', 'e'].includes(String(v ?? '').trim().toLowerCase());
};
const toDate = (v: CellValue | undefined): Date => (v instanceof Date ? v : new Date(String(v ?? '')));

export async function mapFnb(tables: ExtractedTable[], ctx: MapContext): Promise<MapResult<FnbCanonical>> {
  const table = [...tables].sort((a, b) => b.rows.length - a.rows.length)[0]!;
  const { matches } = matchHeaders(table.headers, FNB_ALIASES);

  const colOf = new Map<FnbField, number>();
  const mapping: ColumnMapping[] = [];
  const claim = (f: FnbField, header: string, confidence: number, method: ColumnMapping['method']): void => {
    if (colOf.has(f)) return;
    colOf.set(f, table.headers.indexOf(header));
    mapping.push({ sourceHeader: header, sourceRef: table.sourceRef, canonicalField: f, confidence, method });
  };
  for (const [header, m] of matches) claim(m.canonicalField as FnbField, header, m.confidence, m.method);

  const iRev = colOf.get('revenue');
  const iQty = colOf.get('quantity');
  const iItem = colOf.get('itemName');
  const rows: FnbRow[] = [];
  if (iRev !== undefined && iQty !== undefined && iItem !== undefined) {
    for (const r of table.rows) {
      const revenue = toNum(r[iRev]);
      const quantity = toNum(r[iQty]);
      const itemName = String(r[iItem] ?? '').trim();
      if (revenue === undefined || quantity === undefined || itemName === '') continue;
      const get = (f: FnbField): CellValue | undefined => {
        const i = colOf.get(f);
        return i === undefined ? undefined : r[i];
      };
      const row: FnbRow = { datetime: toDate(get('datetime')), itemName, quantity, revenue };
      const cat = get('category');
      if (cat !== undefined) row.category = String(cat);
      const up = get('unitPrice');
      if (up !== undefined) row.unitPrice = toNum(up);
      const fc = get('foodCost');
      if (fc !== undefined) row.foodCost = toNum(fc);
      const oid = get('orderId');
      if (oid !== undefined) row.orderId = String(oid);
      const cov = get('covers');
      if (cov !== undefined) row.covers = toNum(cov);
      const tid = get('tableId');
      if (tid !== undefined) row.tableId = String(tid);
      const vf = get('voidFlag');
      if (vf !== undefined) row.voidFlag = toBool(vf);
      const dp = get('daypart');
      if (dp !== undefined) row.daypart = String(dp);
      rows.push(row);
    }
  }

  const missingFields: MissingField[] = [];
  for (const [field, impact] of Object.entries(FIELD_IMPACT)) {
    if (!colOf.has(field as FnbField)) missingFields.push({ field, impact: impact.impact, affectedKpis: impact.affectedKpis });
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
