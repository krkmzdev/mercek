/**
 * DoD verification for S1 ingest + purge against the live (Neon) DB.
 * Not part of the CI test suite (needs DATABASE_URL). Run:
 *   pnpm --filter @mercek/core verify:purge
 */
import 'dotenv/config';
import { prisma } from '@mercek/db';
import { persistSourceFile } from '../src/ingest/ingest';
import type { ObjectStorage } from '../src/ingest/storage';
import { purgeExpiredAnalyses } from '../src/purge/purge';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main(): Promise<void> {
  const past = new Date(Date.now() - 60_000);
  const deletedKeys: string[] = [];
  const storage: ObjectStorage = {
    put: () => Promise.resolve(),
    delete: (keys) => {
      deletedKeys.push(...keys);
      return Promise.resolve();
    },
    presignedPutUrl: () => Promise.resolve('x'),
    presignedGetUrl: () => Promise.resolve('x'),
  };

  // Expired guest analysis with a source file.
  const expired = await prisma.analysis.create({
    data: { sector: 'RETAIL', guestIp: 'test', purgeAt: past },
  });
  const sf = await persistSourceFile(prisma, {
    analysisId: expired.id,
    r2Key: `uploads/${expired.id}/probe.xlsx`,
    filename: 'probe.xlsx',
    mimeType: 'application/vnd.ms-excel',
    sizeBytes: 123,
    kind: 'spreadsheet',
  });
  assert(sf.analysisId === expired.id, 'SourceFile persisted against analysis');

  // Fixture analysis, also expired, must survive.
  const fixture = await prisma.analysis.create({
    data: { sector: 'RETAIL', purgeAt: past, isFixture: true },
  });

  const result = await purgeExpiredAnalyses(prisma, { storage });
  assert(result.deletedAnalyses >= 1, `purge deleted analyses (${result.deletedAnalyses})`);
  assert(deletedKeys.includes(sf.r2Key), 'purge asked storage to delete the R2 object');

  assert((await prisma.analysis.findUnique({ where: { id: expired.id } })) === null, 'expired analysis gone');
  assert((await prisma.sourceFile.findUnique({ where: { id: sf.id } })) === null, 'source file cascaded');
  assert(
    (await prisma.analysis.findUnique({ where: { id: fixture.id } })) !== null,
    'fixture analysis exempt from purge',
  );

  await prisma.analysis.delete({ where: { id: fixture.id } });
  console.log('\nS1 ingest + purge: VERIFIED');
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
