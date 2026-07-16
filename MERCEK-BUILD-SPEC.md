# Mercek — Build Specification

> **Audience:** Claude Agent (VS Code)
> **Companion doc:** `mercek-brief-v0.1.md` (positioning, scope, non-goals)
> **Version:** `v1.0` · **Date:** 2026-07-16 · **Owner:** Grimset

---

## 0. How To Use This Document

You are building **Mercek**, a sector-aware AI analysis system, as a portfolio demo project.

**Rules of engagement:**

1. Work **sprint by sprint**. Do not jump ahead. Each sprint has a Definition of Done (§12).
2. **Stop and ask** before: adding a dependency not listed in §3, changing the Adapter contract (§8), altering the data model (§6), or expanding scope beyond §2.
3. After each sprint, output a short report: what was built, what was skipped, what needs a decision.
4. **Do not write code before reading the whole document once.** The Adapter contract (§8) is the spine — everything else serves it.
5. When something in this spec conflicts with reality (a library API changed, a model was deprecated), **flag it, propose the fix, wait**. Do not silently improvise.
6. Verify SDK/model names against current docs before writing integration code. This spec was written 2026-07-16; model IDs and SDK surfaces drift.

**Non-negotiables:** TypeScript strict mode. No `any` (use `unknown` + narrowing). No placeholder/TODO code in a completed sprint. No fake data presented as real.

---

## 1. Mission

Ham işletme verisi (Excel / CSV / PDF / ekran görüntüsü) yüklenir → o sektörün diline hâkim bir AI analist gibi okunur → içgörü, benchmark karşılaştırması ve aksiyon önerisi üretilir.

**The core claim:** Not "AI reads your spreadsheet." Rather — **five different domain experts, one framework.** A retail analyst and a manufacturing engineer do not think alike. Mercek encodes that difference as code.

**Why it's portfolio-worthy:** it demonstrates four things simultaneously —
- **Domain thinking** — real sector KPIs, not generic charts
- **Data engineering** — schema mapping, messy input, edge cases
- **AI orchestration** — model routing, caching, RAG, structured output, guardrails
- **Product craft** — speed, explainability, restraint

---

## 2. Scope Guardrails

### In
Multi-format ingest · vision-based screenshot→table · Sector Adapter architecture + SDK · KPI engine · benchmark layer · streaming analysis · explainable output · report UI + PDF export · landing site · 5 case studies · provider benchmark page.

### Out — do not build these
- ❌ Multi-tenant SaaS, billing, plans, teams
- ❌ Real-time / streaming ingest
- ❌ ETL / data warehouse
- ❌ Custom-trained ML models
- ❌ Native mobile
- ❌ Collaboration, sharing, comments
- ❌ Chat interface (upload → analyze → report is the flow, period)
- ❌ External API integrations (Shopify, Trendyol, etc.) — v2
- ❌ Persistent user data (24h auto-purge)
- ❌ More than 5 sectors

If you have a good idea that falls outside this list, write it to `docs/v2-ideas.md` and move on.

---

## 3. Stack (Locked)

> **Version update — 2026-07-16 (S0):** Spec-pinned majors had drifted by build time. Decision: use current stable majors. **Next.js 16** (was 15), **Prisma 7**, **Zod 4**. tRPC v11 and Tailwind v4 unchanged. **TypeScript pinned to 5.9.3, NOT 7** — TS 7 is the native (Go) compiler and `typescript-eslint@8` caps its peer at `<6.1.0`, so TS 7 breaks the lint/typecheck toolchain. **ESLint pinned to 9.x, NOT 10** — same reason: keep the `eslint 9 + typescript-eslint 8` combo that is fully supported. Revisit both when the lint toolchain officially supports TS 7 / ESLint 10. Recorded here per §0 rule #5 / §15.

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | RSC where sensible, client only where needed |
| API | tRPC v11 | end-to-end types |
| Styling | Tailwind CSS v4 | |
| Animation | Motion v12 | strict discipline — see §11 |
| Auth | Better Auth | magic link only |
| DB | PostgreSQL 16 + `pgvector` | |
| ORM | Prisma | |
| Validation | Zod | shared between tRPC + LLM structured output |
| LLM abstraction | Vercel AI SDK (`ai`) + `@ai-sdk/google` | primary; `@ai-sdk/anthropic` + `@ai-sdk/openai` for benchmark page |
| LLM provider | Google Gemini | see §9 for routing |
| Embeddings | Gemini embedding model | for pgvector RAG |
| Storage | Cloudflare R2 (S3 API) | via `@aws-sdk/client-s3` |
| Excel parse | `exceljs` | |
| CSV parse | `papaparse` | |
| PDF parse | `unpdf` or `pdf-parse` | text-layer first; scanned → vision |
| Charts | Recharts | |
| PDF export | `@react-pdf/renderer` | |
| Rate limit | Upstash Redis | IP-based, guest mode |
| Testing | Vitest + Playwright | |
| Monorepo | Turborepo + pnpm | |
| Deploy | Docker Compose, single VDS | |

**Deferred:** BullMQ/Redis queue. Demo analyses complete in <30s; synchronous + streaming is enough. Revisit only if a real bottleneck appears.

**Do not add** without asking: any UI kit beyond Tailwind, any state manager (React state + tRPC cache suffice), any ORM alternative, any additional AI SDK.

---

## 4. Monorepo Layout

```
mercek/
├─ apps/
│  └─ web/
│     ├─ app/
│     │  ├─ (marketing)/          # landing, case studies, provider benchmark
│     │  ├─ (app)/
│     │  │  ├─ analyze/           # upload → sector select → run
│     │  │  └─ r/[reportId]/      # report view
│     │  └─ api/
│     │     ├─ trpc/[trpc]/
│     │     └─ auth/[...all]/
│     ├─ components/
│     └─ server/                  # tRPC routers
├─ packages/
│  ├─ core/                       # engine: ingest, extract, normalize, enrich, analyze
│  │  ├─ src/
│  │  │  ├─ ingest/
│  │  │  ├─ extract/              # parsers + vision extractor
│  │  │  ├─ normalize/
│  │  │  ├─ kpi/                  # KPI engine (adapter-agnostic runner)
│  │  │  ├─ analyze/              # LLM orchestration
│  │  │  ├─ llm/                  # provider router, caching, telemetry
│  │  │  └─ registry.ts           # adapter registry
│  ├─ sdk/                        # PUBLIC: types + helpers for writing adapters
│  ├─ adapter-retail/
│  ├─ adapter-fnb/
│  ├─ adapter-finance/
│  ├─ adapter-manufacturing/
│  ├─ adapter-saas/
│  ├─ db/                         # prisma schema + client
│  └─ ui/                         # shared components
├─ fixtures/                      # synthetic sample datasets per sector
├─ docs/
│  ├─ adapter-guide.md            # "write your own sector in ~200 lines"
│  └─ v2-ideas.md
├─ docker-compose.yml
├─ turbo.json
└─ pnpm-workspace.yaml
```

**Package boundary rule:** `packages/sdk` must have **zero** dependency on `packages/core`. It is types + pure helpers only. An external contributor should be able to `npm i @mercek/sdk` and write an adapter without pulling the engine. Enforce this in CI.

---

## 5. Pipeline

```
  Upload            Extract           Normalize          Enrich            Analyze           Report
 ┌────────┐       ┌──────────┐      ┌───────────┐     ┌──────────┐     ┌───────────┐     ┌────────┐
 │ file + │──────▶│ parser   │─────▶│ adapter   │────▶│ KPI      │────▶│ prompt    │────▶│ UI +   │
 │ sector │       │ or       │      │ .map()    │     │ engine + │     │ pack +    │     │ PDF    │
 └────────┘       │ vision   │      │           │     │ benchmark│     │ LLM       │     └────────┘
                  └──────────┘      └───────────┘     └──────────┘     └───────────┘
                       │                  │                                   │
                  ExtractedTable[]   Canonical<T>                      Insight (structured)
```

**Stage contracts:**

| Stage | Input | Output | Fails how |
|---|---|---|---|
| Ingest | `File` + `SectorId` | `StoredFile` (R2 key) | size/type rejection |
| Extract | `StoredFile` | `ExtractedTable[]` | unreadable → user-facing error |
| Normalize | `ExtractedTable[]` | `MapResult<T>` | low confidence → show mapping UI |
| Enrich | `T` | `KpiResult[]` + `BenchmarkComparison[]` | missing fields → KPI marked `unavailable`, never crash |
| Analyze | KPIs + `T` summary | `Insight` | LLM error → retry once, then degrade |
| Report | `Insight` | UI + PDF | — |

**Critical rule:** a missing column must never crash the pipeline. It degrades a KPI to `unavailable` with a reason string, and the analysis prompt is told what's missing so the AI does not hallucinate around the gap.

---

## 6. Data Model (Prisma)

```prisma
enum SectorId {
  RETAIL
  FNB
  FINANCE
  MANUFACTURING
  SAAS
}

enum AnalysisStatus {
  PENDING
  EXTRACTING
  NORMALIZING
  ANALYZING
  COMPLETE
  FAILED
}

model User {
  id        String     @id @default(cuid())
  email     String     @unique
  createdAt DateTime   @default(now())
  analyses  Analysis[]
  // Better Auth relations added by its schema
}

model Analysis {
  id          String         @id @default(cuid())
  userId      String?        // null = guest
  user        User?          @relation(fields: [userId], references: [id])
  guestIp     String?        // hashed, for rate limiting
  sector      SectorId
  status      AnalysisStatus @default(PENDING)

  sourceFiles SourceFile[]

  canonical   Json?          // adapter output, validated against canonicalSchema
  mapping     Json?          // ColumnMapping[] — the audit trail of how we got here
  kpis        Json?          // KpiResult[]
  benchmarks  Json?          // BenchmarkComparison[]
  insight     Json?          // Insight (structured LLM output)

  provider    String?        // "google" | "anthropic" | "openai"
  modelUsed   String?
  tokensIn    Int?
  tokensOut   Int?
  costUsd     Decimal?       @db.Decimal(10, 6)
  durationMs  Int?

  error       String?
  isFixture   Boolean        @default(false)  // demo/sample runs, exempt from purge

  createdAt   DateTime       @default(now())
  purgeAt     DateTime       // createdAt + 24h; cron deletes

  @@index([userId])
  @@index([purgeAt])
  @@index([sector, isFixture])
}

model SourceFile {
  id         String   @id @default(cuid())
  analysisId String
  analysis   Analysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  r2Key      String
  filename   String
  mimeType   String
  sizeBytes  Int
  kind       String   // "spreadsheet" | "pdf" | "image"
  createdAt  DateTime @default(now())

  @@index([analysisId])
}

/// Sector knowledge base chunks for RAG. Seeded, not user-generated.
model SectorKnowledge {
  id        String                     @id @default(cuid())
  sector    SectorId
  title     String
  content   String                     @db.Text
  source    String                     // citation — never leave empty
  embedding Unsupported("vector(768)")?

  @@index([sector])
}
```

**Decimal discipline:** every monetary or ratio value that gets persisted uses `Decimal`, never `Float`. In-memory computation may use `number` for speed, but anything stored or compared uses `Decimal`. (Same rule as KELD Wallet.)

**Purge job:** Vercel Cron or node-cron in the container, hourly: `DELETE FROM "Analysis" WHERE "purgeAt" < now() AND "isFixture" = false` + cascade R2 objects. Write this in Sprint 1, not later — data hygiene is part of the demo's credibility.

---

## 7. Extract Layer

### 7.1 Canonical intermediate

Every parser, regardless of source, produces the same thing:

```ts
export interface ExtractedTable {
  id: string;
  sourceRef: SourceRef;          // provenance — carried all the way to the UI
  headers: string[];
  rows: CellValue[][];
  meta: {
    sheetName?: string;
    pageNumber?: number;
    confidence: number;          // 0–1; vision < 1, deterministic parse = 1
    extractionMethod: 'exceljs' | 'papaparse' | 'pdf-text' | 'vision';
  };
}

export type CellValue = string | number | boolean | Date | null;

export interface SourceRef {
  fileId: string;
  filename: string;
  sheet?: string;
  page?: number;
  range?: string;                // "B2:F40"
  cell?: string;                 // "D17"
}
```

`SourceRef` is the explainability backbone. Every KPI, every finding, every number in the final report traces back to a `SourceRef`. **Never drop it.** This is the feature that separates Mercek from "paste CSV into a chatbot."

### 7.2 Router

| Input | Path |
|---|---|
| `.xlsx`, `.xls` | `exceljs` → one `ExtractedTable` per sheet |
| `.csv`, `.tsv` | `papaparse` |
| `.pdf` with text layer | `unpdf` → table detection → if weak, rasterize → vision |
| `.pdf` scanned | rasterize pages → vision |
| `.png`, `.jpg`, `.webp` | vision |

### 7.3 Vision extractor

**Model:** Gemini 3 Flash. **`media_resolution: HIGH`** — this is an OCR-class task; do not economize here, a misread digit poisons the whole analysis.

Structured output (Zod → `generateObject`):

```ts
const VisionExtractSchema = z.object({
  tables: z.array(z.object({
    title: z.string().nullable(),
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string())),
    confidence: z.number().min(0).max(1),
    notes: z.string().nullable(),   // "column 3 partially cut off at right edge"
  })),
  unreadableRegions: z.array(z.string()),
});
```

**Vision prompt requirements:**
- Preserve original header text verbatim — do **not** translate or normalize (Turkish headers stay Turkish; mapping happens later, in the adapter)
- Empty cell → `""`, never invent a value
- Merged cells → repeat the value across the span, note it
- If a number is ambiguous (blurry, cut off) → report it in `notes`, do not guess
- Turkish number format awareness: `1.234,56` is one thousand two hundred thirty-four point five six. `1,234.56` is the same value in US format. Detect which convention the document uses from context and normalize to a plain decimal. State the detected convention in `notes`.
- Currency symbols (`₺`, `TL`, `$`, `€`) → strip to a number, record the currency in `notes`

**Post-processing:** cast strings → typed `CellValue` with an explicit Turkish/US locale-aware number parser in `packages/core/src/extract/parse-number.ts`. Unit-test this file hard — it is the single highest-risk piece of the extract layer.

---

## 8. The Adapter Contract

**This is the spine of the project. Read it twice.**

```ts
// packages/sdk/src/types.ts

export interface SectorAdapter<TCanonical> {
  id: SectorId;
  meta: AdapterMeta;

  /** Zod schema for this sector's canonical shape. Single source of truth. */
  canonicalSchema: z.ZodType<TCanonical>;

  /** Cheap heuristic: does this data look like our sector? Used for suggestions. */
  detect(tables: ExtractedTable[]): Promise<DetectionResult>;

  /** Messy headers → canonical fields. Deterministic first, LLM fallback. */
  map(tables: ExtractedTable[], ctx: MapContext): Promise<MapResult<TCanonical>>;

  kpis: KpiDefinition<TCanonical>[];
  benchmarks: BenchmarkSet;
  prompts: PromptPack<TCanonical>;
  report: ReportSpec;
}

export interface AdapterMeta {
  name:        { tr: string; en: string };
  description: { tr: string; en: string };
  /** Shown in the upload UI: what a good input looks like. */
  expectedInputs: Array<{
    label:  { tr: string; en: string };
    fields: string[];
    example: string;
  }>;
  fixtureIds: string[];    // sample datasets in /fixtures
}

export interface DetectionResult {
  confidence: number;               // 0–1
  matchedSignals: string[];         // ["found 'ürün adı' column", "found date column"]
}

export interface MapContext {
  llm: LlmRouter;                   // adapters may call the LLM for fuzzy mapping
  locale: 'tr' | 'en';
}

export interface MapResult<T> {
  data: T;
  mapping: ColumnMapping[];         // audit trail — shown in the UI
  unmappedColumns: string[];
  missingFields: MissingField[];    // canonical fields we could not fill
  confidence: number;
}

export interface ColumnMapping {
  sourceHeader: string;
  sourceRef: SourceRef;
  canonicalField: string;
  confidence: number;
  method: 'exact' | 'alias' | 'fuzzy' | 'llm' | 'manual';
}

export interface MissingField {
  field: string;
  impact: string;                   // "Gross margin cannot be computed"
  affectedKpis: string[];
}
```

### 8.1 KPI definitions

```ts
export interface KpiDefinition<T> {
  id: string;
  label:  { tr: string; en: string };
  unit: 'currency' | 'percent' | 'ratio' | 'count' | 'days' | 'score';
  /** Human-readable formula. Rendered in the UI under the number. Mandatory. */
  formula: { tr: string; en: string };
  requiredFields: (keyof T | string)[];
  compute(data: T): KpiResult;
  direction: 'higher-better' | 'lower-better' | 'target-band';
  benchmarkKey?: string;
  /** Explainer shown on hover. Teach the user their own domain. */
  interpretation: { tr: string; en: string };
}

export interface KpiResult {
  kpiId: string;
  status: 'ok' | 'unavailable';
  value?: Decimal;
  unavailableReason?: string;
  /** Which cells produced this number. Mandatory when status === 'ok'. */
  evidence: SourceRef[];
  breakdown?: Array<{ label: string; value: Decimal }>;   // for drill-down charts
}
```

**Every KPI carries its own formula string and evidence refs.** The UI renders:

```
Food Cost Oranı        34.2%   ⚠ hedef bandın üstünde (28–32%)
└ formül: Gıda Maliyeti ÷ Net Satış × 100
└ kaynak: satis.xlsx · Sheet1 · C2:C450, F2:F450
```

That footer is the entire product thesis in three lines. Build the KPI card component to require these props — make it impossible to render a number without its provenance.

### 8.2 Benchmarks

```ts
export interface BenchmarkSet {
  entries: Record<string, BenchmarkEntry>;
}

export interface BenchmarkEntry {
  key: string;
  label: { tr: string; en: string };
  /** MANDATORY. If synthetic, say so explicitly. Never fabricate a source. */
  source: string;         // "TÜİK 2025 Perakende Endeksi" | "Synthetic — illustrative only"
  isSynthetic: boolean;
  sourceUrl?: string;
  p25?: number; median?: number; p75?: number;
  targetBand?: { min: number; max: number };
  region?: 'TR' | 'GLOBAL';
  asOf?: string;          // "2025-Q4"
}
```

**Hard rule:** `isSynthetic: true` renders a visible badge in the UI. Never present invented numbers as industry data. The brief's honesty constraint is enforced here, in the type system.

### 8.3 Prompt pack — the cacheable-prefix design

```ts
export interface PromptPack<T> {
  /** STATIC. Cached prefix. Who the analyst is. */
  persona: string;
  /** STATIC. Cached prefix. The sector's domain knowledge — this is "master-level". */
  domainKnowledge: string;
  /** STATIC. Cached prefix. Analytical method for this sector. */
  method: string;
  /** Structured output contract. */
  insightSchema: z.ZodType<Insight>;
  /** DYNAMIC. Only this changes per request. */
  buildUserPrompt(ctx: AnalysisContext<T>): string;
}
```

**Why the split matters:** `persona + domainKnowledge + method` is identical for every analysis in a sector. Gemini context caching bills cached input at ~10% of the standard rate. Structure the message array so these three are a stable prefix and only the user data varies. This is a real cost lever *and* it forces clean separation between domain knowledge and instance data.

**Cache key:** `mercek:promptpack:${sectorId}:${packVersion}`. Bump `packVersion` whenever pack text changes — stale caches silently serving old domain knowledge is a nasty bug class.

### 8.4 Insight — structured output

```ts
export const InsightSchema = z.object({
  headline: z.string(),                          // one sentence, the single most important thing
  healthScore: z.number().min(0).max(100),
  summary: z.string(),                           // 2–3 sentences

  findings: z.array(z.object({
    severity: z.enum(['critical', 'warning', 'opportunity', 'positive']),
    title: z.string(),
    body: z.string(),
    evidence: z.array(z.object({
      kpiId: z.string().nullable(),
      sourceRef: SourceRefSchema.nullable(),
      claim: z.string(),                         // the specific number being asserted
    })).min(1),                                  // ← at least one. no evidence, no finding.
    confidence: z.enum(['high', 'medium', 'low']),
  })).min(3).max(8),

  actions: z.array(z.object({
    priority: z.number().int().min(1),
    title: z.string(),
    rationale: z.string(),
    expectedImpact: z.string(),
    effort: z.enum(['low', 'medium', 'high']),
    relatedFindings: z.array(z.string()),
  })).min(2).max(5),

  dataGaps: z.array(z.string()),                 // "no cost column → margin analysis unavailable"
});
```

**Validation gate:** post-process every `Insight`. Any finding whose `evidence[].claim` references a number that does not appear in the computed KPI set gets **flagged**, not silently shipped. Log the flag rate as a quality metric. This is your hallucination guard and it's worth a paragraph in the README.

### 8.5 Registry

```ts
// packages/core/src/registry.ts
export const adapters = {
  RETAIL:        retailAdapter,
  FNB:           fnbAdapter,
  FINANCE:       financeAdapter,
  MANUFACTURING: manufacturingAdapter,
  SAAS:          saasAdapter,
} satisfies Record<SectorId, SectorAdapter<unknown>>;
```

Adding a sector = one file + one registry line. If it costs more than that, the abstraction leaked — fix the abstraction.

---

## 9. LLM Layer

### 9.1 Router

`packages/core/src/llm/router.ts` — a thin domain layer over Vercel AI SDK. AI SDK handles provider mechanics (streaming, tool calls, structured output); your router handles **routing, caching, telemetry, cost accounting**.

```ts
export type Task =
  | 'vision-extract'
  | 'schema-map'
  | 'analyze'
  | 'analyze-deep';

export interface LlmRouter {
  complete<T>(task: Task, opts: CompleteOpts<T>): Promise<LlmResult<T>>;
  stream<T>(task: Task, opts: CompleteOpts<T>): AsyncIterable<StreamChunk<T>>;
}
```

### 9.2 Model routing table

| Task | Model | Why |
|---|---|---|
| `vision-extract` | `gemini-3-flash`, `media_resolution: HIGH` | accuracy matters; cheap enough |
| `schema-map` | `gemini-3.1-flash-lite` | classification-shaped, high volume, $0.25/$1.50 |
| `analyze` | `gemini-3-flash` | **default.** $0.50/$3 |
| `analyze-deep` | `gemini-3.1-pro` | escalation only. $2/$12 |

**Escalation triggers** (`analyze` → `analyze-deep`), any one:
- `MapResult.confidence < 0.7`
- `>3` KPIs marked `unavailable`
- structured-output validation failed once on Flash
- user explicitly requested deep mode (UI toggle, rate-limited harder)

Log every escalation. "What fraction of runs needed Pro?" is a real engineering finding and belongs in the case study.

**Config, not constants:** put the routing table in `packages/core/src/llm/config.ts` as data. Model IDs drift (Gemini 2.0 Flash was shut down June 1, 2026; Pro left the free tier April 1, 2026). Swapping a model must be a one-line data edit, never a code hunt.

### 9.3 Environment tiers

| Env | Tier | Note |
|---|---|---|
| local / CI | **free tier** | ~1500 RPD, 10–15 RPM. Flash + Flash-Lite only — Pro is paid-only since April 2026. Free-tier prompts may be used by Google for training → **fixtures are synthetic, so this is acceptable.** |
| production | **paid tier** | Required. Google's terms mandate paid services for API clients exposed to users in the EEA/Switzerland/UK, and the demo is public. Also removes the training-data clause. |

`.env` carries separate keys: `GOOGLE_API_KEY_DEV` / `GOOGLE_API_KEY_PROD`. Never let a prod build boot on the dev key — fail loudly at startup if `NODE_ENV === 'production'` and the prod key is absent.

### 9.4 Cost guard

Every call passes through a cost accountant:
- Estimate before call, record actual after (from provider usage metadata)
- Persist to `Analysis.costUsd`
- Daily spend ceiling in env (`MAX_DAILY_SPEND_USD`, default `2.00`). Ceiling hit → new analyses return a friendly "demo kotası doldu, yarın tekrar deneyin" and fixtures still work.
- Fixture/demo runs are **pre-computed and cached** — a visitor clicking "örnek veriyi dene" costs $0.

**Budget model** (per analysis, Flash path, ~15k in / 3k out with 60% prefix cached):

| Step | Cost |
|---|---|
| vision-extract | ~$0.007 |
| schema-map | ~$0.002 |
| analyze | ~$0.015 |
| **total** | **~$0.024** |

Escalated to Pro: ~$0.09. Claude Opus 4.8 equivalent for the analyze step alone: ~$0.15. At $50/month → ~2000 Flash-path analyses. Guest limit 3/IP/day makes that comfortable.

### 9.5 Rate limiting (Upstash)

- Guest: 3 analyses / IP / day
- Authed (magic link): 10 / day
- Deep mode: 1 / IP / day
- Fixture runs: unlimited (pre-computed, no LLM call)

### 9.6 Provider benchmark (Sprint 8)

The router already abstracts providers — exploit it. A page (`/benchmark`) runs one fixture through Gemini / Claude / GPT and tabulates: cost, latency, structured-output compliance rate, evidence-validation pass rate, and a short qualitative read. This costs a handful of dollars to produce once, gets baked into a static JSON, and becomes the most linkable page on the site.

Do not fabricate these numbers. Run it, store the real output, timestamp it.

---

## 10. Sector Adapters

Each adapter ships: canonical schema · alias dictionary (TR + EN) · KPI set · benchmark set · prompt pack · 1 synthetic fixture.

**Alias dictionary example** — the unglamorous work that makes the demo feel magic:

```ts
const aliases: Record<string, string[]> = {
  revenue:  ['ciro', 'satış tutarı', 'toplam satış', 'net satış', 'tutar',
             'revenue', 'sales', 'amount', 'total'],
  quantity: ['adet', 'miktar', 'satış adedi', 'qty', 'quantity', 'units'],
  cost:     ['maliyet', 'alış fiyatı', 'birim maliyet', 'cogs', 'cost', 'unit cost'],
  // ...
};
```

Deterministic pass first (exact → alias → fuzzy/Levenshtein). LLM fallback only for what's left. Most real files resolve without an LLM call — cheaper, faster, and more impressive when you explain it.

---

### 10.1 Retail / E-Ticaret `RETAIL` — reference implementation

Build this one first and build it well. The other four copy its shape.

**Canonical:** transaction-level or daily-aggregate sales.
`date · sku · productName · category · quantity · unitPrice · revenue · cost? · discount? · returnFlag? · channel? · customerId?`

| KPI | Formula | Direction |
|---|---|---|
| Toplam Ciro | Σ revenue | higher |
| AOV | revenue ÷ order count | higher |
| Birim/İşlem | Σ quantity ÷ order count | higher |
| Brüt Marj % | (revenue − cost) ÷ revenue × 100 | higher |
| İade Oranı | returned orders ÷ total orders × 100 | lower |
| İade Tutar Oranı | returned value ÷ gross revenue × 100 | lower |
| Stok Devir Hızı | COGS ÷ avg inventory | higher |
| Pareto (80/20) | cumulative revenue share by SKU | band |
| Tekrar Alım Oranı | repeat customers ÷ total customers × 100 | higher |
| İskonto Derinliği | Σ discount ÷ gross revenue × 100 | band |
| Kategori Konsantrasyonu | HHI over category revenue | band |

**Prompt pack — domain knowledge should cover:** Pareto/ABC classification, the difference between markdown and promotional discount, why return rate varies by category (apparel ≫ electronics), channel margin asymmetry, seasonality vs trend separation, cannibalization.

**Fixture:** 90 days of synthetic e-commerce data, ~2000 rows, deliberately containing: one SKU with an anomalous return rate, one category quietly declining, one discount-driven revenue spike that destroys margin. **The AI should find these.** Design fixtures as tests with a known answer key — this is how you evaluate prompt quality.

---

### 10.2 Restoran / F&B `FNB`

**Canonical:** POS transaction lines.
`datetime · itemName · category · quantity · unitPrice · revenue · foodCost? · orderId · covers? · tableId? · voidFlag? · daypart?`

| KPI | Formula | Target |
|---|---|---|
| Food Cost % | food cost ÷ net sales × 100 | 28–32% |
| Prime Cost % | (food + labor) ÷ net sales × 100 | < 60–65% |
| Ortalama Adisyon | net sales ÷ order count | higher |
| Kişi Başı Harcama | net sales ÷ covers | higher |
| Masa Devir Hızı | covers ÷ seats ÷ service hours | higher |
| Contribution Margin (item) | price − food cost | higher |
| Void/Comp Oranı | voided ÷ gross sales × 100 | < 2% |
| Daypart Dağılımı | revenue share by daypart | — |
| Menü Mühendisliği | popularity × contribution margin | 4-quadrant |

**Menu engineering is the signature deliverable here.** Every item lands in one quadrant:

| | High margin | Low margin |
|---|---|---|
| **High popularity** | ⭐ Stars — protect, never discount | 🐴 Plowhorses — reprice or re-cost |
| **Low popularity** | 🧩 Puzzles — reposition on menu | 🐕 Dogs — remove |

Render this as a scatter plot with quadrant labels. It's the visual that sells the sector.

**Fixture:** 60 days of POS data with a clear Dog, an obvious Plowhorse, a lunch daypart that is quietly unprofitable.

---

### 10.3 KOBİ Finans `FINANCE`

**Canonical:** trial balance (mizan) and/or income statement + balance sheet lines.
`period · accountCode · accountName · debit · credit · balance · accountType`

| KPI | Formula |
|---|---|
| Cari Oran | dönen varlıklar ÷ kısa vadeli borçlar |
| Asit-Test | (dönen varlıklar − stok) ÷ kısa vadeli borçlar |
| Brüt/Faaliyet/Net Marj | ilgili kar ÷ net satış × 100 |
| EBITDA | faaliyet karı + amortisman |
| Alacak Devir Hızı / DSO | net satış ÷ ort. alacak · 365 ÷ devir |
| Stok Devir Hızı / DIO | SMM ÷ ort. stok · 365 ÷ devir |
| Borç Devir Hızı / DPO | alışlar ÷ ort. borç · 365 ÷ devir |
| **Nakit Dönüşüm Süresi** | DSO + DIO − DPO |
| Borç/Özkaynak | toplam borç ÷ özkaynak |
| İşletme Sermayesi | dönen varlıklar − kısa vadeli borçlar |
| **TÜFE-Düzeltilmiş Reel Büyüme** | nominal büyüme deflated by TÜİK TÜFE |

**The real-return engine is the signature move.** Turkish SMEs read 40% nominal revenue growth as success while inflation ran higher — real contraction dressed as a win. Mercek says it plainly:

```
Ciro Büyümesi (nominal)    +38.4%
TÜFE (aynı dönem)          +44.1%
Reel Büyüme                 −3.9%   ⚠
```

This is direct lineage from the KELD Wallet real-return engine. Reuse the math, cite TÜİK as the source, and make this the hero visual of the Finance case study. No other AI analysis tool in the Turkish market does this.

**Fixture:** 8-quarter mizan with nominal growth and real contraction, plus a lengthening cash conversion cycle.

---

### 10.4 Üretim / İmalat `MANUFACTURING`

**Canonical:** work-order / machine-event records.
`timestamp · machineId · workOrderId · plannedTime · runtime · idealCycleTime · totalCount · goodCount · downtimeReason? · shift? · operatorId?`

| KPI | Formula | Target |
|---|---|---|
| **OEE** | Availability × Performance × Quality | World-class 85% |
| — Availability | runtime ÷ planned production time | ~90% |
| — Performance | (ideal cycle × total count) ÷ runtime | ~95% |
| — Quality | good count ÷ total count | ~99% |
| First Pass Yield | first-pass good ÷ total | higher |
| Fire (Scrap) Oranı | scrap ÷ total × 100 | lower |
| MTBF | operating time ÷ failure count | higher |
| MTTR | total repair time ÷ repair count | lower |
| Duruş Pareto | downtime by reason code, ranked | — |
| Çevrim / Takt | actual cycle vs takt time | ≤ 1 |
| Kapasite Kullanımı | actual output ÷ theoretical capacity | higher |

**The insight the domain expert gives you:** most factories report a single OEE number and optimize the wrong factor. Mercek always decomposes A × P × Q and names the binding constraint. A plant at 62% OEE with A=71%, P=94%, Q=93% has a *downtime* problem, not a quality problem — and the downtime Pareto tells them which reason code to attack first. That chain of reasoning is what "master-level" means.

**Fixture:** 30 days, 4 machines, one with an availability problem hidden behind a middling composite OEE.

---

### 10.5 SaaS Metrikleri `SAAS`

**Canonical:** subscription events / MRR movement.
`month · customerId · plan · mrr · status · signupDate · churnDate? · seats? · acquisitionCost?`

| KPI | Formula |
|---|---|
| MRR / ARR | Σ active mrr · ×12 |
| MRR Hareketi | new + expansion − contraction − churned |
| NRR | (start + expansion − contraction − churn) ÷ start × 100 |
| GRR | (start − contraction − churn) ÷ start × 100 |
| Logo Churn | churned customers ÷ start customers × 100 |
| Revenue Churn | churned MRR ÷ start MRR × 100 |
| **Quick Ratio** | (new + expansion) ÷ (contraction + churn) |
| LTV | ARPA × gross margin ÷ churn rate |
| CAC / LTV:CAC | acquisition cost ÷ new customers · ratio |
| CAC Payback | CAC ÷ (ARPA × gross margin), months |
| ARPA | MRR ÷ active customers |
| Rule of 40 | growth % + profit margin % |
| Kohort Retention | retention curve by signup cohort |

**Why this sector is in the set:** the people evaluating your portfolio *are* SaaS people. They will click this one first and they will know instantly whether the numbers are right. Treat it as the credibility test.

**Fixture:** 18 months, ~500 customers, NRR just under 100% masked by healthy new-logo growth — the classic leaky-bucket that a Quick Ratio exposes immediately.

---

## 11. UI / UX Spec

### Anti-Slop Rule (cross-brand, non-negotiable)

**Forbidden:**
- Purple/indigo gradients. Glassmorphism. Neon-on-dark.
- Generic AI iconography — sparkles, orbs, glowing brains, "✨"
- Repetitive fade-in-on-scroll on every element
- Stock-photo-grade illustrations
- Copy: "revolutionizing", "AI-powered", "unleash", "supercharge", "game-changing"

**Required:**
- Dark-first, high contrast, real hierarchy
- Typography: Inter or Geist. One display face maximum.
- Color: one restrained accent, semantic status colors (critical / warning / opportunity / positive) that stay legible in both themes
- Density: this is an analyst tool. Numbers are the design. Don't pad it into a landing page.
- Motion (v12): enters ≤200ms, transitions ≤300ms. Animate only what communicates state change. **Never animate the numbers themselves** — count-up animations on financial figures are a trust bug, not a delight.
- `prefers-reduced-motion` respected everywhere.

### Screens

**`/analyze`** — sector picker (5 cards, each showing expected inputs + "örnek veriyi dene") → dropzone → live pipeline status (Extracting → Mapping → Analyzing) → redirect to report.

**Mapping review** — appears only when `MapResult.confidence < 0.85`. Two columns: source header → canonical field, with per-row confidence and a manual override. Do not hide this behind a toggle; showing your work *is* the product.

**`/r/[reportId]`** —
1. Headline + health score (single number, no gauge animation)
2. KPI grid — each card: value · formula footer · benchmark delta · evidence link
3. Findings, sorted by severity, each expandable to its evidence trail
4. Actions, prioritized, with effort/impact
5. Charts (sector-specific: menu matrix, OEE decomposition, cohort curve, Pareto)
6. Data gaps — stated plainly, never hidden
7. PDF export

**Fixture badge:** any report from a synthetic dataset carries a persistent, unmissable label: `Örnek veri — sentetik, yalnızca gösterim amaçlı`. Same for synthetic benchmarks.

### Language
UI: Turkish primary, English toggle. All `label`/`description` fields in adapters are `{ tr, en }` — enforced by types. README + `docs/` in English. Case studies in both.

---

## 12. Sprint Plan

Each sprint ends with: green typecheck, green tests, a working demo of that slice, and a written report. **Do not start the next sprint until the DoD is met.**

### S0 — Foundation
Turborepo + pnpm workspace · Next.js 15 app · Tailwind v4 · tRPC v11 · Prisma + Postgres/pgvector via Docker Compose · Better Auth magic link · ESLint/Prettier · Vitest · CI (typecheck + test + the sdk-independence check from §4).

**DoD:** `pnpm dev` boots. `docker compose up` gives Postgres+pgvector. A tRPC hello query round-trips typed. CI green.

### S1 — Ingest + Extract
R2 upload (presigned) · `SourceFile` persistence · exceljs / papaparse / pdf parsers · vision extractor (Gemini 3 Flash) · locale-aware number parser · `ExtractedTable` + `SourceRef` throughout · **24h purge cron**.

**DoD:** upload an `.xlsx`, a `.csv`, a `.pdf`, and a screenshot of a spreadsheet → all four produce correct `ExtractedTable[]` with intact `SourceRef`. Number parser has ≥20 unit tests covering both TR and US conventions, currency symbols, negatives, parentheses-negatives, and blanks. Purge job verified deleting rows + R2 objects.

### S2 — Adapter contract + SDK + KPI engine
`packages/sdk` (types + helpers, zero core deps) · registry · KPI runner with graceful `unavailable` degradation · benchmark comparator · `docs/adapter-guide.md`.

**DoD:** a deliberately trivial throwaway adapter (5 lines, one KPI) runs end-to-end through the engine. Missing-column case degrades cleanly with a reason string, no crash. SDK builds standalone.

### S3 — Retail adapter (reference)
Canonical schema · alias dictionary · deterministic + LLM-fallback mapper · 11 KPIs · benchmarks · prompt pack · fixture with a known answer key.

**DoD:** fixture → report. **The AI finds all three planted problems.** Every KPI renders with formula + evidence. Mapping confidence surfaces correctly.

### S4 — LLM layer + analysis pipeline
Router over AI SDK · routing table as config · context caching for prompt-pack prefixes · streaming · structured output + Zod validation · evidence validation gate · escalation logic · cost accountant + daily ceiling · Upstash rate limits.

**DoD:** analysis streams to the UI. Cost recorded accurately per run and matches the provider's reported usage within ~5%. Cache hit rate measurably >0 on repeat runs in the same sector. Evidence-validation flag rate logged. Ceiling enforcement tested.

### S5 — Report UI + explainability + PDF
KPI card (props *require* formula + evidence) · findings + evidence trail · action list · sector charts · mapping review UI · fixture badge · PDF export.

**DoD:** report is readable and honest on desktop and mobile. Clicking any number reaches its source cell. PDF matches the web report. Anti-slop rule audited by eye against §11.

### S6 — F&B + Finance
Both adapters full-stack, including the menu-engineering matrix and the TÜFE real-return engine.

**DoD:** both fixtures produce reports whose findings a domain practitioner would sign off on. Real-return calculation independently verified against TÜİK figures.

### S7 — Manufacturing + SaaS
Both adapters. OEE decomposition (A×P×Q) with the binding-constraint call. Cohort retention curves.

**DoD:** OEE fixture → the report names *availability* as the constraint, not the composite. SaaS fixture → Quick Ratio exposes the leaky bucket.

### S8 — Site, case studies, launch
Landing · 5 case study pages (input → adapter → prompt design → output, blog-post quality) · **provider benchmark page with real measured numbers** · README with architecture diagram · adapter guide polish · 5 video walkthroughs (2–3 min each) · Show HN / LinkedIn / dev.to.

**DoD:** landing LCP < 2.0s. Every case study readable standalone by someone who has never heard of Mercek. Benchmark page numbers are real, dated, reproducible. README makes an outsider want to write an adapter.

---

## 13. Environment

```bash
# Database
DATABASE_URL="postgresql://mercek:mercek@localhost:5432/mercek"

# LLM — separate keys per tier, prod must never boot on dev key
GOOGLE_API_KEY_DEV="..."         # free tier: Flash/Flash-Lite only, ~1500 RPD
GOOGLE_API_KEY_PROD="..."        # paid tier: REQUIRED in production (EEA/UK terms + data privacy)
ANTHROPIC_API_KEY="..."          # benchmark page only
OPENAI_API_KEY="..."             # benchmark page only

# Storage
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET="mercek-uploads"

# Auth
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="http://localhost:3000"
RESEND_API_KEY="..."

# Rate limiting
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

# Cost guard
MAX_DAILY_SPEND_USD="2.00"
GUEST_ANALYSES_PER_DAY="3"
AUTHED_ANALYSES_PER_DAY="10"
DEEP_ANALYSES_PER_DAY="1"

# Purge
ANALYSIS_TTL_HOURS="24"
```

---

## 14. Testing

| Layer | What | Where |
|---|---|---|
| Unit | number parser (TR/US locales) — **highest risk file in the repo** | `core/extract` |
| Unit | every KPI formula, against hand-computed expected values | each adapter |
| Unit | alias matcher | each adapter |
| Contract | every adapter satisfies `SectorAdapter` and round-trips its fixture | `core` |
| Integration | full pipeline per sector, LLM mocked | `core` |
| **Eval** | fixture → real LLM → **does it find the planted problems?** | `evals/` |
| E2E | upload → report, Playwright | `apps/web` |

**The eval suite is the most valuable test asset.** Each fixture ships an answer key (`fixtures/retail/answer-key.json`) listing the problems deliberately planted. The eval scores whether the analysis surfaced them. Run it whenever a prompt pack changes. Prompt engineering without evals is guessing — and "we built an eval harness" is a stronger portfolio line than any feature.

Keep evals out of CI (they cost money and are nondeterministic). Run them on demand: `pnpm eval --sector retail`.

---

## 15. Agent Working Rules

- **Conventional commits**, scoped: `feat(adapter-retail): add menu engineering matrix`
- One sprint = one branch = one PR
- No dependency outside §3 without asking
- No `any`. `unknown` + narrowing.
- Every exported function in `packages/sdk` gets a TSDoc comment — it's the public surface
- Financial values: `Decimal` at every persistence and comparison boundary
- No secret in code. No exception.
- When a prompt pack changes, **bump `packVersion`** — stale cache serving old domain knowledge is a silent, expensive bug
- Never present synthetic data as real. Type system enforces it; don't route around the type system.
- If a sprint reveals the spec is wrong, **say so**. This document is a plan, not scripture. But change it deliberately and in writing, not by drifting.

---

## 16. Open Decisions (blockers flagged)

- [ ] **Domain**: `mercek.dev` / `mercek.app` / `mercek.grimsetstudio.com` — needed before S8, not before S0
- [ ] **License**: SDK MIT + core source-available (BSL), or all-MIT? — needed before S2 (it sets package headers)
- [ ] **Name lock**: Mercek confirmed, or fallback (Nazır / Basiret / Kavrayış)? — needed before S0
- [ ] Video: screen recording only, or voiceover? — S8
- [ ] Benchmark page: which competitor providers, and do we publish the raw outputs? — S8

---

*"Ham veri, uzman gözü." — Mercek*
