import { Cron } from 'croner';
import type { PrismaClient } from '@mercek/db';
import type { ObjectStorage } from '../ingest/storage';

export interface PurgeResult {
  deletedAnalyses: number;
  deletedObjects: number;
}

/**
 * Delete analyses past their 24h TTL plus their stored objects (§6). Fixtures
 * (`isFixture = true`) are exempt. `SourceFile` rows cascade with the analysis.
 */
export async function purgeExpiredAnalyses(
  db: PrismaClient,
  opts: { storage?: ObjectStorage; now?: Date } = {},
): Promise<PurgeResult> {
  const now = opts.now ?? new Date();

  const expired = await db.analysis.findMany({
    where: { purgeAt: { lt: now }, isFixture: false },
    select: { id: true, sourceFiles: { select: { r2Key: true } } },
  });

  const keys = expired.flatMap((a) => a.sourceFiles.map((f) => f.r2Key));
  if (opts.storage && keys.length > 0) {
    await opts.storage.delete(keys);
  }

  const ids = expired.map((a) => a.id);
  if (ids.length > 0) {
    await db.analysis.deleteMany({ where: { id: { in: ids } } });
  }

  return { deletedAnalyses: ids.length, deletedObjects: keys.length };
}

/**
 * Schedule the purge job (default: hourly). Runs in the app container. Returns
 * the {@link Cron} handle so the caller can stop it on shutdown.
 */
export function schedulePurge(
  db: PrismaClient,
  opts: { storage?: ObjectStorage; pattern?: string; onRun?: (r: PurgeResult) => void } = {},
): Cron {
  const pattern = opts.pattern ?? '0 * * * *'; // top of every hour
  return new Cron(pattern, async () => {
    const result = await purgeExpiredAnalyses(db, { storage: opts.storage });
    opts.onRun?.(result);
  });
}
