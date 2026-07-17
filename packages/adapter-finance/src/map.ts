import {
  matchHeader,
  matchHeaders,
  parseLocaleNumber,
  type ColumnMapping,
  type ExtractedTable,
  type MapContext,
  type MapResult,
  type MissingField,
} from '@mercek/sdk';
import { COLUMN_ALIASES, LINE_ITEM_ALIASES } from './aliases';
import { PERIOD_FIELDS, type FinanceCanonical, type FinancePeriod, type PeriodField } from './canonical';

const FIELD_LABEL: Record<PeriodField, string> = {
  netSales: 'net satışlar', cogs: 'SMM', grossProfit: 'brüt kar', operatingProfit: 'faaliyet karı',
  netProfit: 'net kar', depreciation: 'amortisman', currentAssets: 'dönen varlıklar', inventory: 'stoklar',
  receivables: 'ticari alacaklar', currentLiabilities: 'kısa vadeli borçlar', payables: 'ticari borçlar',
  totalDebt: 'toplam borç', equity: 'özkaynaklar', cpiIndex: 'TÜFE endeksi',
};

/**
 * Two-level map: columns (period · line item · value), then each line-item name
 * to a canonical period field. Pivots the long-format statement into one record
 * per period (§10.3).
 */
export async function mapFinance(tables: ExtractedTable[], ctx: MapContext): Promise<MapResult<FinanceCanonical>> {
  const table = [...tables].sort((a, b) => b.rows.length - a.rows.length)[0]!;
  const { matches } = matchHeaders(table.headers, COLUMN_ALIASES);

  const colOf = new Map<string, number>();
  const mapping: ColumnMapping[] = [];
  for (const [header, m] of matches) {
    if (colOf.has(m.canonicalField)) continue;
    colOf.set(m.canonicalField, table.headers.indexOf(header));
    mapping.push({ sourceHeader: header, sourceRef: table.sourceRef, canonicalField: m.canonicalField, confidence: m.confidence, method: m.method });
  }

  const iPeriod = colOf.get('period');
  const iLine = colOf.get('lineItem');
  const iValue = colOf.get('value');

  const periodsMap = new Map<string, FinancePeriod>();
  const matchedFields = new Set<PeriodField>();
  if (iPeriod !== undefined && iLine !== undefined && iValue !== undefined) {
    for (const r of table.rows) {
      const period = String(r[iPeriod] ?? '').trim();
      const lineName = String(r[iLine] ?? '').trim();
      const value = parseLocaleNumber(typeof r[iValue] === 'number' ? r[iValue] : String(r[iValue] ?? '')).value;
      if (period === '' || lineName === '' || value === null) continue;
      const fieldMatch = matchHeader(lineName, LINE_ITEM_ALIASES, { fuzzyThreshold: 0.86 });
      if (!fieldMatch) continue;
      const field = fieldMatch.canonicalField as PeriodField;
      matchedFields.add(field);
      const rec = periodsMap.get(period) ?? { period };
      rec[field] = value;
      periodsMap.set(period, rec);
    }
  }

  const periods = [...periodsMap.values()].sort((a, b) => a.period.localeCompare(b.period));

  const latest = periods[periods.length - 1];
  const missingFields: MissingField[] = [];
  for (const f of PERIOD_FIELDS) {
    if (latest && latest[f] === undefined) {
      missingFields.push({ field: f, impact: `${FIELD_LABEL[f]} eksik`, affectedKpis: [] });
    }
  }

  const columnsOk = iPeriod !== undefined && iLine !== undefined && iValue !== undefined;
  const lineItemCoverage = matchedFields.size / PERIOD_FIELDS.length;
  const confidence = !columnsOk ? 0.3 : Math.min(1, 0.6 + lineItemCoverage * 0.4);

  void ctx;
  return {
    data: { periods, sourceRef: table.sourceRef },
    mapping,
    unmappedColumns: table.headers.filter((h) => !mapping.some((m) => m.sourceHeader === h)),
    missingFields,
    confidence,
  };
}
