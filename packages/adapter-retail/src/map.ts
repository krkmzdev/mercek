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
import { z } from 'zod';
import { RETAIL_ALIASES } from './aliases';
import { RETAIL_FIELDS, type RetailCanonical, type RetailField, type RetailRow } from './canonical';

const REQUIRED: RetailField[] = ['date', 'quantity', 'revenue'];

/** KPI impact of each optional field, surfaced in MapResult.missingFields. */
const FIELD_IMPACT: Partial<Record<RetailField, { impact: string; affectedKpis: string[] }>> = {
  cost: { impact: 'Brüt marj hesaplanamaz', affectedKpis: ['gross_margin'] },
  returnFlag: { impact: 'İade oranları hesaplanamaz', affectedKpis: ['return_rate', 'return_value_rate'] },
  discount: { impact: 'İskonto derinliği hesaplanamaz', affectedKpis: ['discount_depth'] },
  category: { impact: 'Kategori konsantrasyonu hesaplanamaz', affectedKpis: ['category_concentration'] },
  sku: { impact: 'Pareto analizi hesaplanamaz', affectedKpis: ['pareto'] },
  customerId: { impact: 'Tekrar alım oranı hesaplanamaz', affectedKpis: ['repeat_rate'] },
};

function pickPrimary(tables: ExtractedTable[]): ExtractedTable {
  return [...tables].sort((a, b) => b.rows.length - a.rows.length)[0]!;
}

function toBool(v: CellValue | undefined): boolean {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toLowerCase();
  return ['1', 'true', 'evet', 'iade', 'yes', 'x', 'e'].includes(s);
}

function toNum(v: CellValue | undefined): number | undefined {
  const p = parseLocaleNumber(typeof v === 'number' ? v : String(v ?? ''));
  return p.value ?? undefined;
}

function toDate(v: CellValue | undefined): Date {
  if (v instanceof Date) return v;
  return new Date(String(v ?? ''));
}

/** Deterministic map (exact→alias→fuzzy), LLM fallback only for leftovers (§10). */
export async function mapRetail(
  tables: ExtractedTable[],
  ctx: MapContext,
): Promise<MapResult<RetailCanonical>> {
  const table = pickPrimary(tables);
  const { matches } = matchHeaders(table.headers, RETAIL_ALIASES);

  const colOf = new Map<RetailField, number>();
  const mapping: ColumnMapping[] = [];
  const claim = (field: RetailField, header: string, confidence: number, method: ColumnMapping['method']): void => {
    if (colOf.has(field)) return;
    colOf.set(field, table.headers.indexOf(header));
    mapping.push({ sourceHeader: header, sourceRef: table.sourceRef, canonicalField: field, confidence, method });
  };

  for (const [header, m] of matches) claim(m.canonicalField as RetailField, header, m.confidence, m.method);

  // LLM fallback: only if a REQUIRED field is still unmapped and headers remain.
  let stillUnmapped = table.headers.filter((h) => !mapping.some((mm) => mm.sourceHeader === h));
  const missingRequired = REQUIRED.filter((f) => !colOf.has(f));
  if (missingRequired.length > 0 && stillUnmapped.length > 0) {
    try {
      const res = await ctx.llm.complete('schema-map', {
        system:
          'Bir e-tablonun başlıklarını kanonik perakende alanlarına eşle. Emin değilsen null döndür.',
        prompt: `Başlıklar: ${stillUnmapped.join(', ')}\nKanonik alanlar: ${RETAIL_FIELDS.join(', ')}\nJSON döndür: { "<başlık>": "<alan|null>" }`,
        schema: z.record(z.string(), z.string().nullable()),
      });
      for (const [header, field] of Object.entries(res.data)) {
        if (field && (RETAIL_FIELDS as readonly string[]).includes(field)) {
          claim(field as RetailField, header, 0.7, 'llm');
        }
      }
      stillUnmapped = table.headers.filter((h) => !mapping.some((mm) => mm.sourceHeader === h));
    } catch {
      // LLM unavailable → leave unmapped; KPIs degrade gracefully.
    }
  }

  // Parse rows (require revenue + quantity to be present & numeric).
  const iRev = colOf.get('revenue');
  const iQty = colOf.get('quantity');
  const rows: RetailRow[] = [];
  if (iRev !== undefined && iQty !== undefined) {
    for (const r of table.rows) {
      const revenue = toNum(r[iRev]);
      const quantity = toNum(r[iQty]);
      if (revenue === undefined || quantity === undefined) continue;
      const get = (f: RetailField): CellValue | undefined => {
        const i = colOf.get(f);
        return i === undefined ? undefined : r[i];
      };
      const row: RetailRow = { date: toDate(get('date')), quantity, revenue };
      const s = get('sku');
      if (s !== undefined) row.sku = String(s);
      const pn = get('productName');
      if (pn !== undefined) row.productName = String(pn);
      const c = get('category');
      if (c !== undefined) row.category = String(c);
      const up = get('unitPrice');
      if (up !== undefined) row.unitPrice = toNum(up);
      const co = get('cost');
      if (co !== undefined) row.cost = toNum(co);
      const di = get('discount');
      if (di !== undefined) row.discount = toNum(di);
      const rf = get('returnFlag');
      if (rf !== undefined) row.returnFlag = toBool(rf);
      const ch = get('channel');
      if (ch !== undefined) row.channel = String(ch);
      const cu = get('customerId');
      if (cu !== undefined) row.customerId = String(cu);
      rows.push(row);
    }
  }

  const missingFields: MissingField[] = [];
  for (const [field, impact] of Object.entries(FIELD_IMPACT)) {
    if (!colOf.has(field as RetailField)) {
      missingFields.push({ field, impact: impact.impact, affectedKpis: impact.affectedKpis });
    }
  }

  const mappedConfidences = mapping.map((m) => m.confidence);
  const confidence =
    missingRequired.length > 0 || mappedConfidences.length === 0
      ? 0.3
      : mappedConfidences.reduce((a, b) => a + b, 0) / mappedConfidences.length;

  return {
    data: { rows, sourceRef: table.sourceRef },
    mapping,
    unmappedColumns: stillUnmapped,
    missingFields,
    confidence,
  };
}
