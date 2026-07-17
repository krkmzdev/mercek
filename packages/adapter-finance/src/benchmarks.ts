import type { BenchmarkSet } from '@mercek/sdk';

export const financeBenchmarks: BenchmarkSet = {
  entries: {
    current_ratio: {
      key: 'current_ratio',
      label: { tr: 'Cari Oran', en: 'Current Ratio' },
      source: 'Synthetic — illustrative only',
      isSynthetic: true,
      targetBand: { min: 1.5, max: 2.0 },
      region: 'TR',
      asOf: '2026',
    },
  },
};
