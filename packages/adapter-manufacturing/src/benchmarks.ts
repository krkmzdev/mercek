import type { BenchmarkSet } from '@mercek/sdk';

export const manufacturingBenchmarks: BenchmarkSet = {
  entries: {
    oee: {
      key: 'oee',
      label: { tr: 'OEE', en: 'OEE' },
      source: 'Synthetic — illustrative only (world-class OEE ≈ 85%)',
      isSynthetic: true,
      p25: 55,
      median: 65,
      p75: 85,
      targetBand: { min: 60, max: 85 },
      region: 'GLOBAL',
      asOf: '2026',
    },
  },
};
