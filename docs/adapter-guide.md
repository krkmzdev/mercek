# Write your own sector adapter

Mercek's engine is sector-agnostic. All the domain knowledge — the KPIs, the
benchmarks, the analyst's voice — lives in a **sector adapter**. Adding a sector
is _one adapter file + one registry line_. This guide shows the whole contract
with a minimal, working example.

You only need `@mercek/sdk` — types and pure helpers, **zero dependency on the
engine**. `npm i @mercek/sdk`, implement `SectorAdapter<TCanonical>`, done.

## The shape

```ts
import type { SectorAdapter } from '@mercek/sdk';

export const myAdapter: SectorAdapter<MyCanonical> = {
  id,               // one of the five SectorId values
  meta,             // names, expected inputs, fixtures (bilingual)
  canonicalSchema,  // Zod schema — the single source of truth for your shape
  detect,           // "does this data look like my sector?" (cheap heuristic)
  map,              // messy headers → canonical fields (deterministic first)
  kpis,             // the metrics, each with a formula + evidence
  benchmarks,       // reference values, every one with a cited source
  prompts,          // persona + domain knowledge + method + insight schema
  report,           // which charts the report renders
};
```

## 1. Canonical shape

Define the clean shape your KPIs consume, and a Zod schema for it. The schema is
the single source of truth.

```ts
import { z } from 'zod';

interface MyCanonical {
  revenue: number[];
}

const canonicalSchema = z.object({ revenue: z.array(z.number()) });
```

## 2. `map` — messy headers → canonical fields

Run the deterministic matcher first (exact → alias → fuzzy). Only fall back to
the LLM (`ctx.llm`) for what's left — most real files resolve without a model
call, which is cheaper, faster, and more impressive to explain.

```ts
import { matchHeaders } from '@mercek/sdk';

const aliases = { revenue: ['ciro', 'net satış', 'sales', 'amount'] };

async function map(tables, ctx) {
  const table = tables[0];
  const { matches, unmapped } = matchHeaders(table.headers, aliases);
  const header = [...matches].find(([, m]) => m.canonicalField === 'revenue')?.[0];

  if (!header) {
    // A missing column must never crash — degrade it (spec §5).
    return {
      data: { revenue: [] },
      mapping: [],
      unmappedColumns: unmapped,
      missingFields: [
        { field: 'revenue', impact: 'Total revenue cannot be computed', affectedKpis: ['total_revenue'] },
      ],
      confidence: 0,
    };
  }

  const col = table.headers.indexOf(header);
  const revenue = table.rows.map((r) => Number(r[col])).filter(Number.isFinite);
  return {
    data: { revenue },
    mapping: [{ sourceHeader: header, sourceRef: table.sourceRef, canonicalField: 'revenue', confidence: 1, method: 'alias' }],
    unmappedColumns: [],
    missingFields: [],
    confidence: 1,
  };
}
```

Keep the `sourceRef` on every mapping — it is the provenance trail the UI shows.

## 3. KPIs — a number is nothing without its formula and evidence

Every KPI carries a bilingual `formula` string and, when computed, its
`evidence` refs. Use the SDK's `Decimal` so your math matches what the engine
persists.

```ts
import { Decimal } from '@mercek/sdk';

const kpis = [
  {
    id: 'total_revenue',
    label: { tr: 'Toplam Ciro', en: 'Total Revenue' },
    unit: 'currency',
    formula: { tr: 'Σ ciro', en: 'Σ revenue' },
    requiredFields: ['revenue'],
    direction: 'higher-better',
    benchmarkKey: 'revenue',
    interpretation: { tr: '…', en: '…' },
    compute: (data) => ({
      kpiId: 'total_revenue',
      status: 'ok',
      value: data.revenue.reduce((acc, n) => acc.plus(n), new Decimal(0)),
      evidence: [{ fileId: 'f', filename: 'sales.csv' }],
    }),
  },
];
```

If a `requiredField` is missing, the engine marks the KPI `unavailable` with a
reason — you don't have to guard for it. If `compute` throws, the engine catches
it and degrades the same way. Never fabricate a value to fill a gap.

## 4. Benchmarks — cite every source

```ts
const benchmarks = {
  entries: {
    revenue: {
      key: 'revenue',
      label: { tr: 'Ciro', en: 'Revenue' },
      source: 'Synthetic — illustrative only', // MANDATORY. If synthetic, say so.
      isSynthetic: true,
      p25: 2000, median: 5000, p75: 8000,
    },
  },
};
```

`isSynthetic: true` renders a visible badge in the UI. The type system won't let
you present invented numbers as industry data — that's deliberate.

## 5. Prompt pack — a cacheable prefix

`persona + domainKnowledge + method` is static per sector and forms a cached
prefix (Gemini context caching bills it at ~10% of the standard rate). Only
`buildUserPrompt` varies per request. Bump your pack version whenever the static
text changes.

```ts
const prompts = {
  persona: 'You are a retail analyst…',
  domainKnowledge: 'Pareto/ABC classification, markdown vs promo discount…',
  method: 'First read the trend, then the mix, then the margins…',
  insightSchema: InsightSchema, // from @mercek/sdk
  buildUserPrompt: (ctx) => `KPIs: ${JSON.stringify(ctx.kpis)}…`,
};
```

## 6. Register it

```ts
import { registerAdapter } from '@mercek/core';
registerAdapter(myAdapter);
```

That's the whole contract. If adding a sector costs more than one file and one
registry line, the abstraction leaked — open an issue.

## Test it like a fixture with an answer key

Ship a synthetic fixture whose planted problems you know, and assert the engine
finds them. Prompt engineering without evals is guessing.
