import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@mercek/db';
import type { ReportView } from '@/lib/report';
import { ReportViewComponent } from '@/components/report/report-view';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reportId: string }>;
}): Promise<Metadata> {
  const { reportId } = await params;
  const analysis = await prisma.analysis.findUnique({ where: { id: reportId } });
  if (!analysis?.insight) return { title: 'Rapor bulunamadı' };
  const view = analysis.insight as unknown as ReportView;
  const sector = view.sectorName?.tr ?? 'Analiz';
  const headline = view.insight?.plainSummary?.headline ?? view.insight?.headline;
  return {
    title: `${sector} raporu`,
    description: headline ?? undefined,
  };
}

export default async function ReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const analysis = await prisma.analysis.findUnique({ where: { id: reportId } });
  if (!analysis?.insight) notFound();
  const view = analysis.insight as unknown as ReportView;
  return <ReportViewComponent view={view} />;
}
