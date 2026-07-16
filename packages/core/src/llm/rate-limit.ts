import { Ratelimit } from '@upstash/ratelimit';
import type { Redis } from '@upstash/redis';

/** Rate-limit buckets (spec §9.5). Fixture runs are unlimited (no LLM call). */
export type RateAction = 'guest' | 'authed' | 'deep';

export interface RateLimitConfig {
  guestPerDay: number;
  authedPerDay: number;
  deepPerDay: number;
}

export const defaultRateLimits: RateLimitConfig = {
  guestPerDay: 3,
  authedPerDay: 10,
  deepPerDay: 1,
};

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
}

export interface RateLimiter {
  limit(identifier: string, action: RateAction): Promise<RateLimitResult>;
}

function limitFor(config: RateLimitConfig, action: RateAction): number {
  return action === 'guest'
    ? config.guestPerDay
    : action === 'authed'
      ? config.authedPerDay
      : config.deepPerDay;
}

function dayStamp(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/**
 * In-memory fixed-window limiter for dev/CI. Not durable — production uses
 * {@link UpstashRateLimiter}.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly counts = new Map<string, number>();

  constructor(
    private readonly config: RateLimitConfig = defaultRateLimits,
    private readonly now: () => number = Date.now,
  ) {}

  limit(identifier: string, action: RateAction): Promise<RateLimitResult> {
    const limit = limitFor(this.config, action);
    const key = `${action}:${identifier}:${dayStamp(this.now())}`;
    const used = this.counts.get(key) ?? 0;
    if (used >= limit) {
      return Promise.resolve({ success: false, remaining: 0, limit });
    }
    this.counts.set(key, used + 1);
    return Promise.resolve({ success: true, remaining: limit - used - 1, limit });
  }
}

/**
 * Durable limiter backed by Upstash Redis (production, §9.5). Live-tested when
 * Upstash credentials are wired; the interface is exercised via
 * {@link InMemoryRateLimiter} in CI.
 */
export class UpstashRateLimiter implements RateLimiter {
  private readonly limiters: Record<RateAction, Ratelimit>;

  constructor(redis: Redis, config: RateLimitConfig = defaultRateLimits) {
    const make = (limit: number, prefix: string): Ratelimit =>
      new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(limit, '1 d'),
        prefix: `mercek:rl:${prefix}`,
      });
    this.limiters = {
      guest: make(config.guestPerDay, 'guest'),
      authed: make(config.authedPerDay, 'authed'),
      deep: make(config.deepPerDay, 'deep'),
    };
  }

  async limit(identifier: string, action: RateAction): Promise<RateLimitResult> {
    const res = await this.limiters[action].limit(identifier);
    return { success: res.success, remaining: res.remaining, limit: res.limit };
  }
}
