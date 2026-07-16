import type { PrismaClient } from '@mercek/db';
import type { SpendTracker } from './cost';

/** Sums today's persisted `Analysis.costUsd` for the daily ceiling (§9.4). */
export function createDbSpendTracker(db: PrismaClient): SpendTracker {
  return {
    async todayUsd(): Promise<number> {
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      const agg = await db.analysis.aggregate({
        _sum: { costUsd: true },
        where: { createdAt: { gte: start } },
      });
      return agg._sum.costUsd ? agg._sum.costUsd.toNumber() : 0;
    },
  };
}
