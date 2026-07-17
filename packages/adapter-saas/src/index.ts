import {
  matchHeaders,
  SourceRefSchema,
  type DetectionResult,
  type ExtractedTable,
  type SectorAdapter,
} from '@mercek/sdk';
import { SAAS_ALIASES } from './aliases';
import { SaasCanonicalSchema, type SaasCanonical } from './canonical';
import { saasBenchmarks } from './benchmarks';
import { saasKpis } from './kpis';
import { mapSaas } from './map';
import { saasPrompts } from './prompts';

const canonicalSchema = SaasCanonicalSchema.extend({
  sourceRef: SourceRefSchema,
}) as unknown as SectorAdapter<SaasCanonical>['canonicalSchema'];

function detect(tables: ExtractedTable[]): Promise<DetectionResult> {
  const table = [...tables].sort((a, b) => b.rows.length - a.rows.length)[0];
  if (!table) return Promise.resolve({ confidence: 0, matchedSignals: [] });
  const { matches } = matchHeaders(table.headers, SAAS_ALIASES);
  const fields = new Set([...matches.values()].map((m) => m.canonicalField));
  const signals: string[] = [];
  if (fields.has('mrr')) signals.push('MRR sütunu');
  if (fields.has('customerId')) signals.push('müşteri sütunu');
  if (fields.has('month')) signals.push('ay sütunu');
  const core = ['mrr', 'customerId', 'month'].filter((f) => fields.has(f)).length;
  return Promise.resolve({ confidence: core / 3, matchedSignals: signals });
}

export const saasAdapter: SectorAdapter<SaasCanonical> = {
  id: 'SAAS',
  meta: {
    name: { tr: 'SaaS Metrikleri', en: 'SaaS Metrics' },
    description: {
      tr: 'Abonelik verisini NRR, Quick Ratio ve kohort retention gözüyle okur.',
      en: 'Reads subscription data through NRR, Quick Ratio, and cohort retention.',
    },
    expectedInputs: [
      {
        label: { tr: 'Aylık abonelik hareketleri', en: 'Monthly subscription snapshots' },
        fields: ['ay', 'müşteri', 'plan', 'mrr', 'kayıt tarihi?', 'edinme maliyeti?'],
        example: 'abonelikler.csv (ay, müşteri, plan, mrr, kayıt tarihi)',
      },
    ],
    fixtureIds: ['saas-18mo'],
  },
  canonicalSchema,
  detect,
  map: mapSaas,
  kpis: saasKpis(),
  benchmarks: saasBenchmarks,
  prompts: saasPrompts,
  report: { charts: ['mrr-trend', 'cohort-retention', 'mrr-movement'] },
};

export type { SaasCanonical } from './canonical';
export { computeSaasSignals } from './signals';
