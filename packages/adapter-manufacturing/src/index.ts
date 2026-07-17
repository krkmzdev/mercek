import {
  matchHeaders,
  SourceRefSchema,
  type DetectionResult,
  type ExtractedTable,
  type SectorAdapter,
} from '@mercek/sdk';
import { MFG_ALIASES } from './aliases';
import { MfgCanonicalSchema, type MfgCanonical } from './canonical';
import { manufacturingBenchmarks } from './benchmarks';
import { manufacturingKpis } from './kpis';
import { mapManufacturing } from './map';
import { manufacturingPrompts } from './prompts';

const canonicalSchema = MfgCanonicalSchema.extend({
  sourceRef: SourceRefSchema,
}) as unknown as SectorAdapter<MfgCanonical>['canonicalSchema'];

function detect(tables: ExtractedTable[]): Promise<DetectionResult> {
  const table = [...tables].sort((a, b) => b.rows.length - a.rows.length)[0];
  if (!table) return Promise.resolve({ confidence: 0, matchedSignals: [] });
  const { matches } = matchHeaders(table.headers, MFG_ALIASES);
  const fields = new Set([...matches.values()].map((m) => m.canonicalField));
  const signals: string[] = [];
  if (fields.has('machineId')) signals.push('makine sütunu');
  if (fields.has('runtime') || fields.has('plannedTime')) signals.push('çalışma/planlı süre');
  if (fields.has('downtimeReason')) signals.push('duruş nedeni');
  const core = ['machineId', 'runtime', 'totalCount'].filter((f) => fields.has(f)).length;
  return Promise.resolve({ confidence: core / 3, matchedSignals: signals });
}

export const manufacturingAdapter: SectorAdapter<MfgCanonical> = {
  id: 'MANUFACTURING',
  meta: {
    name: { tr: 'Üretim / İmalat', en: 'Manufacturing' },
    description: {
      tr: 'Makine/iş emri verisini OEE (A×P×Q) ve duruş Pareto gözüyle okur.',
      en: 'Reads machine data through OEE decomposition and downtime Pareto.',
    },
    expectedInputs: [
      {
        label: { tr: 'Makine olay kayıtları', en: 'Machine event records' },
        fields: ['tarih', 'makine', 'planlı süre', 'çalışma süresi', 'ideal çevrim', 'toplam adet', 'sağlam adet', 'duruş nedeni?'],
        example: 'uretim-kayitlari.csv (tarih, makine, planlı süre, çalışma, ideal çevrim, toplam, sağlam, duruş nedeni)',
      },
    ],
    fixtureIds: ['mfg-30d'],
  },
  canonicalSchema,
  detect,
  map: mapManufacturing,
  kpis: manufacturingKpis(),
  benchmarks: manufacturingBenchmarks,
  prompts: manufacturingPrompts,
  report: { charts: ['oee-decomposition', 'machine-oee', 'downtime-pareto'] },
};

export type { MfgCanonical } from './canonical';
export { computeMfgSignals } from './signals';
