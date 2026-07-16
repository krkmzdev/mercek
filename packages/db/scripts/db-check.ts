import 'dotenv/config';
import { prisma } from '../src/index';

/** Connectivity + round-trip check: verifies Postgres, pgvector, and CRUD. */
async function main(): Promise<void> {
  const versionRows = await prisma.$queryRaw<{ version: string }[]>`SELECT version()`;
  const version = versionRows[0]?.version ?? 'unknown';
  const ext = await prisma.$queryRaw<
    { extname: string }[]
  >`SELECT extname FROM pg_extension WHERE extname = 'vector'`;

  const created = await prisma.sectorKnowledge.create({
    data: {
      sector: 'RETAIL',
      title: 'db-check',
      content: 'round-trip probe',
      source: 'Synthetic — verification only',
    },
  });
  const readBack = await prisma.sectorKnowledge.findUnique({ where: { id: created.id } });
  await prisma.sectorKnowledge.delete({ where: { id: created.id } });

  console.log(
    JSON.stringify(
      {
        postgres: version.split(' ').slice(0, 2).join(' '),
        pgvectorEnabled: ext.length > 0,
        writeReadDelete: readBack?.title === 'db-check',
        userCount: await prisma.user.count(),
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
