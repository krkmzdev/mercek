import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SECTORS } from '@/lib/sectors';

export const metadata = { title: 'Vakalar — Mercek' };

export default function CaseStudiesIndex() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-14">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Vaka Çalışmaları</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Her sektör, gerçek bir analiz</h1>
        <p className="mt-2 max-w-prose text-muted">
          Her vaka aynı akışı gösterir: ham veri → çıkarım → sektör adapteri → prompt tasarımı → AI çıktısı. Örnek
          veriler sentetiktir; içlerine kasıtlı sorunlar yerleştirdik ve AI’ın bunları bulup bulmadığını ölçtük.
        </p>

        <div className="mt-8 flex flex-col gap-4">
          {SECTORS.map((s) => (
            <Link key={s.id} href={`/vaka/${s.slug}`} className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-borderStrong">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">{s.name}</h2>
                <span className="font-mono text-xs text-faint transition-transform group-hover:translate-x-0.5">oku →</span>
              </div>
              <p className="mt-1.5 text-sm text-muted">{s.tagline}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="rounded border border-accent/40 px-2 py-0.5 font-mono text-[0.68rem] text-accent">{s.signature.title}</span>
                <span className="font-mono text-[0.68rem] text-faint">{s.fixture}</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
