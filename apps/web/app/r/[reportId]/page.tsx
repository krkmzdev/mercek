import { notFound } from 'next/navigation';
import { prisma } from '@mercek/db';
import type { ReportView } from '@/lib/report';
import { ReportViewComponent } from '@/components/report/report-view';

export const dynamic = 'force-dynamic';

export default async function ReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const analysis = await prisma.analysis.findUnique({ where: { id: reportId } });
  if (!analysis?.insight) notFound();
  const view = analysis.insight as unknown as ReportView;
  return <ReportViewComponent view={view} />;
}
