import { describe, expect, it } from 'vitest';
import {
  Decimal,
  matchHeaders,
  type ExtractedTable,
  type LlmRouter,
  type MapContext,
  type SectorAdapter,
} from '@mercek/sdk';
import { z } from 'zod';
import { enrich } from './enrich';
import { clearAdapters, getAdapter, registerAdapter } from '../registry';

// ── A deliberately trivial throwaway adapter: one canonical field, one KPI ──
interface TinyCanonical {
  revenue: number[];
}

const aliases = { revenue: ['ciro', 'net satış', 'sales'] };

const tinyAdapter: SectorAdapter<TinyCanonical> = {
  id: 'RETAIL',
  meta: {
    name: { tr: 'Deneme', en: 'Tiny' },
    description: { tr: '-', en: '-' },
    expectedInputs: [],
    fixtureIds: [],
  },
  canonicalSchema: z.object({ revenue: z.array(z.number()) }),
  detect: () => Promise.resolve({ confidence: 1, matchedSignals: ['revenue'] }),
  map: (tables) => {
    const table = tables[0]!;
    const { matches } = matchHeaders(table.headers, aliases);
    const revenueHeader = [...matches.entries()].find(
      ([, m]) => m.canonicalField === 'revenue',
    )?.[0];
    if (!revenueHeader) {
      return Promise.resolve({
        data: { revenue: [] },
        mapping: [],
        unmappedColumns: table.headers,
        missingFields: [
          { field: 'revenue', impact: 'Toplam ciro hesaplanamaz', affectedKpis: ['total_revenue'] },
        ],
        confidence: 0,
      });
    }
    const col = table.headers.indexOf(revenueHeader);
    const revenue = table.rows.map((r) => Number(r[col])).filter((n) => Number.isFinite(n));
    return Promise.resolve({
      data: { revenue },
      mapping: [
        {
          sourceHeader: revenueHeader,
          sourceRef: table.sourceRef,
          canonicalField: 'revenue',
          confidence: 1,
          method: 'alias' as const,
        },
      ],
      unmappedColumns: [],
      missingFields: [],
      confidence: 1,
    });
  },
  kpis: [
    {
      id: 'total_revenue',
      label: { tr: 'Toplam Ciro', en: 'Total Revenue' },
      unit: 'currency',
      formula: { tr: 'Σ ciro', en: 'Σ revenue' },
      requiredFields: ['revenue'],
      direction: 'higher-better',
      benchmarkKey: 'revenue',
      interpretation: { tr: '-', en: '-' },
      compute: (data) => ({
        kpiId: 'total_revenue',
        status: 'ok',
        value: data.revenue.reduce((acc, n) => acc.plus(n), new Decimal(0)),
        evidence: [{ fileId: 'f', filename: 'x.csv' }],
      }),
    },
  ],
  benchmarks: {
    entries: {
      revenue: {
        key: 'revenue',
        label: { tr: 'Ciro', en: 'Revenue' },
        source: 'Synthetic — illustrative only',
        isSynthetic: true,
        p25: 2000,
        median: 5000,
        p75: 8000,
      },
    },
  },
  prompts: {
    persona: '',
    domainKnowledge: '',
    method: '',
    insightSchema: z.any(),
    buildUserPrompt: () => '',
  },
  report: { charts: [] },
};

const ctx: MapContext = {
  locale: 'tr',
  llm: {
    complete: () => Promise.reject(new Error('llm should not be called')),
    stream: () => {
      throw new Error('llm should not be called');
    },
  } as LlmRouter,
};

function tableWith(headers: string[], rows: (string | number)[][]): ExtractedTable {
  return {
    id: 't',
    sourceRef: { fileId: 'f', filename: 'x.csv' },
    headers,
    rows,
    meta: { confidence: 1, extractionMethod: 'papaparse' },
  };
}

describe('enrich — end-to-end through the engine', () => {
  it('maps, computes KPIs, and compares to benchmark (happy path)', async () => {
    const tables = [tableWith(['Tarih', 'Ciro'], [['2026-01-01', 3000], ['2026-01-02', 4500]])];
    const result = await enrich(tinyAdapter, tables, ctx);

    expect(result.mapConfidence).toBe(1);
    expect(result.missingFields).toHaveLength(0);

    const kpi = result.kpis[0]!;
    expect(kpi.status).toBe('ok');
    expect(kpi.value?.toNumber()).toBe(7500);

    const cmp = result.benchmarks[0]!;
    expect(cmp.position).toBe('within'); // 7500 is between p25 2000 and p75 8000
    expect(cmp.verdict).toBe('neutral'); // higher-better, within band
    expect(cmp.deltaFromMedian?.toNumber()).toBe(2500);
  });

  it('degrades a missing column to unavailable without crashing', async () => {
    const tables = [tableWith(['Tarih', 'Notlar'], [['2026-01-01', 'x']])];
    const result = await enrich(tinyAdapter, tables, ctx);

    expect(result.missingFields.map((m) => m.field)).toContain('revenue');
    const kpi = result.kpis[0]!;
    expect(kpi.status).toBe('unavailable');
    expect(kpi.unavailableReason).toContain('revenue');
    expect(result.benchmarks).toHaveLength(0); // nothing to compare
  });
});

describe('registry', () => {
  it('registers and retrieves an adapter by sector id', () => {
    clearAdapters();
    registerAdapter(tinyAdapter);
    expect(getAdapter('RETAIL')).toBe(tinyAdapter);
    expect(getAdapter('SAAS')).toBeUndefined();
    clearAdapters();
  });
});
