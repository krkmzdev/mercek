import 'server-only';
import {
  analyze,
  createLlmRouter,
  enrich,
  extract,
  getAdapter,
  googleModelResolver,
  resolveGoogleApiKeyFromProcess,
} from '@mercek/core';
import type { SectorId } from '@mercek/sdk';
import { prisma } from '@mercek/db';
import { ensureAdaptersRegistered } from './adapters';
import { buildChartsFor } from './build-charts';
import { buildReportView } from './report';

export interface AnalyzeFileArgs {
  bytes: Uint8Array;
  filename: string;
  mimeType?: string;
  sector: SectorId;
  guestIp?: string;
}

/**
 * Run a live analysis on an uploaded file and persist it as a report.
 * The raw file is processed in memory (no object storage) and only the
 * structured result is stored; the row auto-purges after its TTL (§6).
 */
export async function analyzeFile(args: AnalyzeFileArgs): Promise<{ reportId: string }> {
  ensureAdaptersRegistered();
  const adapter = getAdapter(args.sector);
  if (!adapter) throw new Error(`Bilinmeyen sektör: ${args.sector}`);

  const router = createLlmRouter({ resolveModel: googleModelResolver(resolveGoogleApiKeyFromProcess()) });

  const tables = await extract({ fileId: 'upload', filename: args.filename, bytes: args.bytes, mimeType: args.mimeType });
  if (tables.length === 0) throw new Error('Dosyadan tablo çıkarılamadı.');

  const enriched = await enrich(adapter, tables, { llm: router, locale: 'tr' });

  const data = enriched.data as { rows?: unknown[]; periods?: unknown[] };
  const rowCount = data.rows?.length ?? data.periods?.length ?? 0;

  // Fail fast (no LLM call) when the file doesn't fit the chosen sector.
  if (rowCount === 0) {
    const expected = adapter.meta.expectedInputs[0]?.fields.join(' · ') ?? '';
    throw new Error(
      `Bu dosya "${adapter.meta.name.tr}" formatına uymadı. Beklenen sütunlar: ${expected}. Doğru sektörü seçtiğinizden emin olun.`,
    );
  }

  const analysis = await analyze(adapter, enriched, router, 'tr');

  const created = await prisma.analysis.create({
    data: {
      sector: args.sector,
      status: 'COMPLETE',
      isFixture: false,
      guestIp: args.guestIp,
      provider: 'google',
      modelUsed: analysis.model,
      costUsd: analysis.costUsd,
      insight: {} as object, // placeholder; replaced below once we have the id
      purgeAt: new Date(Date.now() + Number(process.env.ANALYSIS_TTL_HOURS ?? 24) * 3600_000),
    },
    select: { id: true },
  });

  const view = buildReportView({
    id: created.id,
    adapter,
    enriched,
    analysis,
    charts: buildChartsFor(args.sector, enriched),
    source: { filename: args.filename, rows: rowCount },
    isFixture: false,
    generatedAt: new Date().toISOString(),
  });

  await prisma.analysis.update({ where: { id: created.id }, data: { insight: view as unknown as object } });
  return { reportId: created.id };
}
