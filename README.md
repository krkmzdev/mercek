# Mercek

> Sector-aware AI analyst — **five domain experts, one framework.**
> Raw operational data (Excel / CSV / PDF / screenshot) read the way a
> domain specialist would read it: insight, benchmark comparison, action.

_"Ham veri, uzman gözü."_

## Status

**S0 — Foundation.** Monorepo scaffold up. See `MERCEK-BUILD-SPEC.md` for the
full plan (sprints S0→S8) and `mercek-brief-v0.1.md` for positioning.

## Stack

Next.js 16 · tRPC v11 · Tailwind v4 · Prisma 7 + Postgres/pgvector · Better Auth
(magic link) · Turborepo + pnpm · TypeScript 5.9 (strict). See spec §3.

## Layout

```
apps/web            Next.js 16 App Router (landing + demo + case studies)
packages/sdk        PUBLIC adapter contract (§8) + helpers — zero core deps
packages/core       Engine: ingest, extract, KPI runner, benchmarks, registry
packages/db         Prisma schema + client (§6 data model)
packages/ui         Shared UI components + cn() helper
packages/eslint-config  Shared flat ESLint config
fixtures/           Synthetic sample datasets
docs/               Adapter guide, v2 ideas
docker-compose.yml  Prod DB (Postgres 16 + pgvector) — VDS deploy only
```

The five `adapter-*` packages land in S3+. See `docs/adapter-guide.md`.

## Develop

```bash
pnpm install
pnpm --filter @mercek/db db:generate   # generate Prisma client
pnpm dev                               # http://localhost:3000
```

Local dev uses a **hosted Postgres (Neon)** — no local Docker required. Copy
`.env.example`, fill `DATABASE_URL`, then `pnpm --filter @mercek/db db:migrate`.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
```
