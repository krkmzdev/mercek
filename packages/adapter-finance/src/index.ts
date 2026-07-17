import {
  matchHeaders,
  SourceRefSchema,
  type DetectionResult,
  type ExtractedTable,
  type SectorAdapter,
} from '@mercek/sdk';
import { COLUMN_ALIASES } from './aliases';
import { FinanceCanonicalSchema, type FinanceCanonical } from './canonical';
import { financeBenchmarks } from './benchmarks';
import { financeKpis } from './kpis';
import { mapFinance } from './map';
import { financePrompts } from './prompts';

const canonicalSchema = FinanceCanonicalSchema.extend({
  sourceRef: SourceRefSchema,
}) as unknown as SectorAdapter<FinanceCanonical>['canonicalSchema'];

function detect(tables: ExtractedTable[]): Promise<DetectionResult> {
  const table = [...tables].sort((a, b) => b.rows.length - a.rows.length)[0];
  if (!table) return Promise.resolve({ confidence: 0, matchedSignals: [] });
  const { matches } = matchHeaders(table.headers, COLUMN_ALIASES);
  const fields = new Set([...matches.values()].map((m) => m.canonicalField));
  const signals: string[] = [];
  if (fields.has('period')) signals.push("'dönem' sütunu");
  if (fields.has('lineItem')) signals.push("'kalem/hesap' sütunu");
  if (fields.has('value')) signals.push("'değer/bakiye' sütunu");
  const core = ['period', 'lineItem', 'value'].filter((f) => fields.has(f)).length;
  return Promise.resolve({ confidence: core / 3, matchedSignals: signals });
}

export const financeAdapter: SectorAdapter<FinanceCanonical> = {
  id: 'FINANCE',
  meta: {
    name: { tr: 'KOBİ Finans', en: 'SME Finance' },
    description: {
      tr: 'Mizan/finansal tabloyu likidite, nakit döngüsü ve TÜFE-reel büyüme gözüyle okur.',
      en: 'Reads financials through liquidity, cash-cycle, and CPI-real-growth lenses.',
    },
    expectedInputs: [
      {
        label: { tr: 'Dönem · Kalem · Değer', en: 'Period · Line item · Value' },
        fields: ['dönem', 'kalem (net satış, SMM, dönen varlıklar…)', 'değer', 'TÜFE endeksi'],
        example: 'finansal-tablo.csv (Dönem; Kalem; Değer)',
      },
    ],
    fixtureIds: ['finance-8q'],
  },
  canonicalSchema,
  detect,
  map: mapFinance,
  kpis: financeKpis(),
  benchmarks: financeBenchmarks,
  prompts: financePrompts,
  report: { charts: ['real-return', 'ccc-trend', 'margin-trend'] },
};

export type { FinanceCanonical } from './canonical';
export { computeFinanceSignals } from './signals';
export { computeRealReturn } from './realreturn';
