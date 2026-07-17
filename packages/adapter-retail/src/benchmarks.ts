import type { BenchmarkSet } from '@mercek/sdk';

/**
 * Retail benchmarks (spec §8.2). Every entry cites a source; these are marked
 * synthetic and illustrative — the UI renders a visible badge, and the type
 * system forbids presenting invented numbers as industry data.
 */
export const retailBenchmarks: BenchmarkSet = {
  entries: {
    aov: {
      key: 'aov',
      label: { tr: 'Ortalama Sepet', en: 'Average Order Value' },
      source: 'Synthetic — illustrative only',
      isSynthetic: true,
      p25: 150,
      median: 320,
      p75: 600,
      region: 'TR',
      asOf: '2026',
    },
    gross_margin: {
      key: 'gross_margin',
      label: { tr: 'Brüt Marj %', en: 'Gross Margin %' },
      source: 'Synthetic — illustrative only',
      isSynthetic: true,
      targetBand: { min: 35, max: 55 },
      region: 'TR',
      asOf: '2026',
    },
    return_rate: {
      key: 'return_rate',
      label: { tr: 'İade Oranı %', en: 'Return Rate %' },
      source: 'Synthetic — illustrative only',
      isSynthetic: true,
      p25: 4,
      median: 8,
      p75: 15,
      region: 'TR',
      asOf: '2026',
    },
  },
};
