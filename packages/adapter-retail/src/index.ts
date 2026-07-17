import {
  matchHeaders,
  SourceRefSchema,
  type DetectionResult,
  type ExtractedTable,
  type SectorAdapter,
} from '@mercek/sdk';
import { RETAIL_ALIASES } from './aliases';
import { RetailCanonicalSchema, type RetailCanonical } from './canonical';
import { retailBenchmarks } from './benchmarks';
import { retailKpis } from './kpis';
import { mapRetail } from './map';
import { retailPrompts } from './prompts';

const canonicalSchema = RetailCanonicalSchema.extend({
  sourceRef: SourceRefSchema,
}) as unknown as SectorAdapter<RetailCanonical>['canonicalSchema'];

function detect(tables: ExtractedTable[]): Promise<DetectionResult> {
  const table = [...tables].sort((a, b) => b.rows.length - a.rows.length)[0];
  if (!table) return Promise.resolve({ confidence: 0, matchedSignals: [] });
  const { matches } = matchHeaders(table.headers, RETAIL_ALIASES);
  const fields = new Set([...matches.values()].map((m) => m.canonicalField));
  const signals: string[] = [];
  if (fields.has('revenue')) signals.push("'ciro/tutar' sütunu");
  if (fields.has('quantity')) signals.push("'adet' sütunu");
  if (fields.has('date')) signals.push("'tarih' sütunu");
  if (fields.has('sku') || fields.has('productName')) signals.push('ürün tanımı');
  // Core retail shape = date + quantity + revenue.
  const core = ['revenue', 'quantity', 'date'].filter((f) => fields.has(f)).length;
  return Promise.resolve({ confidence: core / 3, matchedSignals: signals });
}

export const retailAdapter: SectorAdapter<RetailCanonical> = {
  id: 'RETAIL',
  meta: {
    name: { tr: 'Perakende / E-Ticaret', en: 'Retail / E-Commerce' },
    description: {
      tr: 'Satış, iade ve sepet verisini perakende uzmanı gözüyle okur.',
      en: 'Reads sales, returns, and basket data like a retail analyst.',
    },
    expectedInputs: [
      {
        label: { tr: 'İşlem bazlı satış', en: 'Transaction-level sales' },
        fields: ['tarih', 'ürün', 'kategori', 'adet', 'birim fiyat', 'ciro', 'maliyet?', 'iade?'],
        example: 'satis-raporu.xlsx (tarih, ürün, kategori, adet, ciro, maliyet, iade)',
      },
    ],
    fixtureIds: ['retail-90d'],
  },
  canonicalSchema,
  detect,
  map: mapRetail,
  kpis: retailKpis(),
  benchmarks: retailBenchmarks,
  prompts: retailPrompts,
  report: { charts: ['pareto', 'category-trend', 'return-by-sku', 'weekly-discount-margin'] },
};

export type { RetailCanonical } from './canonical';
export { computeSignals } from './signals';
