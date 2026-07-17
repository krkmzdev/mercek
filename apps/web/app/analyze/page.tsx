import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SECTORS } from '@/lib/sectors';

export const metadata = { title: 'Analiz — Mercek' };

export default function AnalyzePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-14">
        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">Analiz</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sektörünü seç</h1>
          <p className="mt-2 max-w-prose text-muted">
            Kendi verini yükle ya da sentetik örnek veriyle dene. Her sektörün kendi KPI’ları, benchmark’ları ve uzman
            prompt’u var.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SECTORS.map((s) => (
            <Link
              key={s.id}
              href={`/analyze/${s.slug}`}
              className="group flex flex-col rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-borderStrong"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">{s.name}</h2>
                <span className="font-mono text-xs text-faint transition-transform group-hover:translate-x-0.5">→</span>
              </div>
              <p className="mt-1.5 text-sm text-muted">{s.tagline}</p>
              <p className="mt-3 font-mono text-[0.7rem] uppercase tracking-wide text-accent">{s.signature.title}</p>
              <div className="mt-4 flex-1" />
              <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity group-hover:opacity-90">
                Verini yükle veya örnek dene →
              </span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
