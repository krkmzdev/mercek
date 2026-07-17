import {
  matchHeaders,
  SourceRefSchema,
  type DetectionResult,
  type ExtractedTable,
  type SectorAdapter,
} from '@mercek/sdk';
import { FNB_ALIASES } from './aliases';
import { FnbCanonicalSchema, type FnbCanonical } from './canonical';
import { fnbBenchmarks } from './benchmarks';
import { fnbKpis } from './kpis';
import { mapFnb } from './map';
import { fnbPrompts } from './prompts';

const canonicalSchema = FnbCanonicalSchema.extend({
  sourceRef: SourceRefSchema,
}) as unknown as SectorAdapter<FnbCanonical>['canonicalSchema'];

function detect(tables: ExtractedTable[]): Promise<DetectionResult> {
  const table = [...tables].sort((a, b) => b.rows.length - a.rows.length)[0];
  if (!table) return Promise.resolve({ confidence: 0, matchedSignals: [] });
  const { matches } = matchHeaders(table.headers, FNB_ALIASES);
  const fields = new Set([...matches.values()].map((m) => m.canonicalField));
  const signals: string[] = [];
  if (fields.has('itemName')) signals.push('menü/ürün sütunu');
  if (fields.has('orderId')) signals.push('adisyon sütunu');
  if (fields.has('foodCost')) signals.push('yemek maliyeti sütunu');
  if (fields.has('daypart') || fields.has('covers')) signals.push('restoran işletme verisi');
  const core = ['itemName', 'quantity', 'revenue'].filter((f) => fields.has(f)).length;
  const bonus = fields.has('orderId') || fields.has('foodCost') || fields.has('covers') ? 0.1 : 0;
  return Promise.resolve({ confidence: Math.min(1, core / 3 + bonus), matchedSignals: signals });
}

export const fnbAdapter: SectorAdapter<FnbCanonical> = {
  id: 'FNB',
  meta: {
    name: { tr: 'Restoran / F&B', en: 'Restaurant / F&B' },
    description: {
      tr: 'POS verisini food cost ve menü mühendisliği gözüyle okur.',
      en: 'Reads POS data through food-cost and menu-engineering lenses.',
    },
    expectedInputs: [
      {
        label: { tr: 'POS satır verisi', en: 'POS transaction lines' },
        fields: ['tarih/saat', 'ürün', 'kategori', 'adet', 'tutar', 'yemek maliyeti?', 'adisyon?', 'öğün?'],
        example: 'pos-satislar.xlsx (tarih, ürün, adet, tutar, maliyet, adisyon, öğün)',
      },
    ],
    fixtureIds: ['fnb-60d'],
  },
  canonicalSchema,
  detect,
  map: mapFnb,
  kpis: fnbKpis(),
  benchmarks: fnbBenchmarks,
  prompts: fnbPrompts,
  report: { charts: ['menu-matrix', 'daypart-margin'] },
};

export type { FnbCanonical } from './canonical';
export { computeFnbSignals } from './signals';
export { menuEngineering } from './menu';
