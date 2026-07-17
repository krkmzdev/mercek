import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SECTORS } from '@/lib/sectors';

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-6 pb-8 pt-20 sm:pt-28">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Sektör-farkında AI analist</p>
          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
            Ham veri, uzman gözü.
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-lg text-muted">
            “Yapay zekâ tablonu okur” değil. <span className="text-fg">Beş ayrı sektör uzmanı, tek çatı.</span> Bir
            perakendeci ile bir üretim mühendisi aynı düşünmez — Mercek bu farkı kod olarak taşır.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/analyze" className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              Analize başla →
            </Link>
            <Link href="/r/retail-demo" className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline">
              Örnek raporu gör
            </Link>
          </div>
        </section>

        {/* The thesis / honesty */}
        <section className="mx-auto max-w-5xl px-6 py-12">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { t: 'Her sayı kaynağına iner', b: 'Her KPI formülünü ve kanıt hücresini taşır. “CSV’yi sohbete yapıştır”dan ayıran şey budur.' },
              { t: 'Uydurmaz, işaret eder', b: 'Maliyet sütunu yoksa marjı uydurmaz — “kullanılamıyor” der ve veri boşluğunu bildirir.' },
              { t: 'Dürüst veri', b: 'Örnek veriler tamamen sentetik ve açıkça etiketli; benchmark’lar kaynak belirtir.' },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border border-border bg-surface p-5">
                <h3 className="text-sm font-semibold">{c.t}</h3>
                <p className="mt-2 text-sm text-muted">{c.b}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Sectors */}
        <section className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="font-mono text-xs uppercase tracking-widest text-faint">Beş sektör, beş beyin</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {SECTORS.map((s) => (
              <Link key={s.id} href={`/vaka/${s.slug}`} className="group flex flex-col rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-borderStrong">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold tracking-tight">{s.name}</h3>
                  <span className="font-mono text-xs text-faint transition-transform group-hover:translate-x-0.5">→</span>
                </div>
                <p className="mt-1.5 text-sm text-muted">{s.tagline}</p>
                <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-wide text-accent">{s.signature.title}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="font-mono text-xs uppercase tracking-widest text-faint">Nasıl çalışır</h2>
          <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['Yükle', 'Excel · PDF · ekran görüntüsü'],
              ['Çıkar', 'Kaynak referansı (SourceRef) korunur'],
              ['Eşle', 'Sektör adapteri: alias + LLM'],
              ['Hesapla', 'KPI + benchmark, formül + kanıt'],
              ['Analiz', 'Sektör uzmanı prompt’u ile AI'],
              ['Rapor', 'İçgörü · aksiyon · PDF'],
            ].map(([t, b], i) => (
              <li key={t} className="rounded-xl border border-border bg-surface p-4">
                <span className="tnum text-xs text-faint">0{i + 1}</span>
                <p className="mt-1 text-sm font-semibold">{t}</p>
                <p className="mt-1 text-xs text-muted">{b}</p>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mx-auto max-w-5xl px-6 py-16">
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Ham veri, uzman gözü.</h2>
            <p className="mx-auto mt-2 max-w-md text-muted">Sentetik örnek veriyle hemen dene — ücretsiz, kayıt yok.</p>
            <Link href="/analyze" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90">
              Analize başla →
            </Link>
          </div>
          <p className="mt-8 text-center font-mono text-xs text-faint">Mercek · portfolyo demo · sentetik veri</p>
        </footer>
      </main>
    </>
  );
}
