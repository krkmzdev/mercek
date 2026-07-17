import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { UploadAnalyzer } from '@/components/upload-analyzer';
import { SECTORS, sectorBySlug } from '@/lib/sectors';

const ORNEK: Record<string, string> = {
  perakende: 'perakende.xlsx',
  restoran: 'restoran-fnb.xlsx',
  finans: 'finans.xlsx',
  uretim: 'uretim.xlsx',
  saas: 'saas.xlsx',
};

export function generateStaticParams() {
  return SECTORS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = sectorBySlug(slug);
  return { title: s ? `${s.name} analizi — Mercek` : 'Analiz — Mercek' };
}

export default async function SectorAnalyzePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = sectorBySlug(slug);
  if (!s) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-14">
        <Link href="/analyze" className="font-mono text-xs text-muted hover:text-fg">
          ← Sektörler
        </Link>

        <header className="mt-6">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">{s.name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Verini analiz et</h1>
          <p className="mt-2 text-muted">{s.tagline}</p>
        </header>

        <div className="mt-4 rounded-xl border border-border bg-surface2 p-4">
          <p className="font-mono text-[0.68rem] uppercase tracking-wide text-faint">Beklenen sütunlar</p>
          <p className="mt-1.5 font-mono text-xs text-muted">{s.dataShape}</p>
          <a
            href={`/ornek/${ORNEK[s.slug]}`}
            download
            className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-accent underline-offset-4 hover:underline"
          >
            ⤓ Örnek Excel’i indir ve yükleyip dene
          </a>
        </div>

        <div className="mt-6">
          <UploadAnalyzer sector={s.id} sectorName={s.name} />
        </div>

        <div className="mt-8 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-xs text-faint">veya</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Link
          href={`/r/${s.demoId}`}
          className="mt-6 flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:border-borderStrong"
        >
          <span>
            <span className="text-sm font-medium">Önce örnek veriyle dene</span>
            <span className="mt-0.5 block font-mono text-xs text-faint">{s.fixture} · sentetik · ücretsiz</span>
          </span>
          <span className="font-mono text-xs text-accent">örnek rapor →</span>
        </Link>
      </main>
    </>
  );
}
