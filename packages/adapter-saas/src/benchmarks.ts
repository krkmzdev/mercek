import type { BenchmarkSet } from '@mercek/sdk';

export const saasBenchmarks: BenchmarkSet = {
  entries: {
    nrr: {
      key: 'nrr',
      label: { tr: 'Net Gelir Tutundurma', en: 'NRR' },
      source: 'Synthetic — illustrative only',
      isSynthetic: true,
      p25: 95,
      median: 105,
      p75: 120,
      targetBand: { min: 100, max: 130 },
      region: 'GLOBAL',
      asOf: '2026',
    },
  },
};
