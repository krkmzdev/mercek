import type { BenchmarkSet } from '@mercek/sdk';

export const fnbBenchmarks: BenchmarkSet = {
  entries: {
    food_cost: {
      key: 'food_cost',
      label: { tr: 'Food Cost %', en: 'Food Cost %' },
      source: 'Synthetic — illustrative only',
      isSynthetic: true,
      targetBand: { min: 28, max: 32 },
      region: 'TR',
      asOf: '2026',
    },
    avg_check: {
      key: 'avg_check',
      label: { tr: 'Ortalama Adisyon', en: 'Average Check' },
      source: 'Synthetic — illustrative only',
      isSynthetic: true,
      p25: 250,
      median: 450,
      p75: 750,
      region: 'TR',
      asOf: '2026',
    },
  },
};
