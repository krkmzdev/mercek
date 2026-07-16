/**
 * Live verification of the deferred external integrations (run manually):
 *   pnpm --filter @mercek/core verify:live
 * Closes: S4 router+cost (live), S1 vision (live), S4 Upstash rate limiter.
 * Makes real (tiny, free-tier) Gemini calls and one Upstash round-trip.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Redis } from '@upstash/redis';
import { z } from 'zod';
import { createVisionExtractor } from '../src/extract/vision';
import { resolveGoogleApiKeyFromProcess } from '../src/llm/env';
import { createLlmRouter, googleModelResolver } from '../src/llm/router';
import { UpstashRateLimiter } from '../src/llm/rate-limit';
import type { UsageRecord } from '../src/llm/router';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`  ok: ${msg}`);
}

/** Retry transient free-tier 503 "high demand" responses. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const transient = /503|overloaded|high demand|UNAVAILABLE/i.test(msg);
      if (!transient || i === attempts - 1) throw err;
      console.log(`  …retry ${i + 1} after transient error`);
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw new Error('unreachable');
}

const here = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const apiKey = resolveGoogleApiKeyFromProcess();

  // 1) Router: structured output + real cost accounting.
  console.log('\n[1] LLM router — structured output + cost');
  const usage: UsageRecord[] = [];
  const router = createLlmRouter({
    resolveModel: googleModelResolver(apiKey),
    onUsage: (r) => usage.push(r),
  });
  const res = await withRetry(() =>
    router.complete('analyze', {
      prompt: 'Return a JSON greeting in Turkish for the word "merhaba".',
      schema: z.object({ greeting: z.string() }),
    }),
  );
  assert(typeof res.data.greeting === 'string' && res.data.greeting.length > 0, 'structured output parsed');
  assert(res.usage.costUsd > 0, `cost recorded (${res.usage.costUsd.toFixed(6)} USD)`);
  assert(usage.length === 1 && usage[0]!.task === 'analyze', 'onUsage telemetry fired');

  // 2) Vision extractor (S1 was deferred) — read the PDF fixture via Gemini.
  console.log('\n[2] Vision extractor — live (PDF fixture)');
  const pdfPath = resolve(here, '../../../fixtures/extract/retail-sample.pdf');
  const vision = createVisionExtractor({ model: 'gemini-flash-lite-latest', apiKey });
  const tables = await withRetry(() =>
    vision({
      fileId: 'live',
      filename: 'retail-sample.pdf',
      bytes: new Uint8Array(readFileSync(pdfPath)),
      mimeType: 'application/pdf',
    }),
  );
  assert(tables.length >= 1, `vision returned ${tables.length} table(s)`);
  assert(tables[0]!.headers.length >= 3, `vision read headers: [${tables[0]!.headers.join(', ')}]`);
  assert(tables[0]!.rows.length >= 1, `vision read ${tables[0]!.rows.length} row(s)`);

  // 3) Upstash rate limiter — live round-trip.
  console.log('\n[3] Upstash rate limiter — live');
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  const rl = new UpstashRateLimiter(redis);
  const id = `verify-${Date.now()}`;
  const first = await rl.limit(id, 'deep'); // deep = 1/day
  const second = await rl.limit(id, 'deep');
  assert(first.success && !second.success, 'deep limit (1/day) enforced live');

  console.log('\nLIVE VERIFY: all passed ✅');
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
