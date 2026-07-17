import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SECTORS, sectorBySlug } from '@/lib/sectors';

export function generateStaticParams() {
  return SECTORS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = sectorBySlug(slug);
  return { title: s ? `${s.name} — Mercek Vaka` : 'Vaka — Mercek' };
}

function Block({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <p className="font-mono text-[0.7rem] uppercase tracking-widest text-faint">{eyebrow}</p>
      <h2 className="mt-1.5 text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function CaseStudy({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = sectorBySlug(slug);
  if (!s) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/vaka" className="font-mono text-xs text-muted hover:text-fg">
          ← Vakalar
        </Link>

        <header className="mt-6">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">{s.name}</p>
          <h1 className="mt-2 text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {s.signature.title}
          </h1>
          <p className="mt-3 text-pretty text-lg text-muted">{s.tagline}</p>
        </header>

        <Block eyebrow="1 · Girdi" title="Veri şekli">
          <p className="text-muted">
            Bu sektörün verisi diğerlerinden farklı bir şekle sahiptir. Mercek’in “tek çatı, beş dil” iddiası ancak veri
            karakterleri gerçekten farklıysa inandırıcıdır.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface2 p-3 font-mono text-xs text-fg">
            {s.dataShape}
          </pre>
        </Block>

        <Block eyebrow="2 · Adapter" title="Sektörün beyni">
          <ul className="flex flex-col gap-2">
            {s.domain.map((d) => (
              <li key={d} className="flex gap-2.5 text-sm text-muted">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                {d}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {s.kpis.map((k) => (
              <span key={k} className="rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-xs text-muted">
                {k}
              </span>
            ))}
          </div>
        </Block>

        <Block eyebrow="3 · İmza hamle" title={s.signature.title}>
          <div className="rounded-xl border border-accent/30 bg-accent/10 p-5">
            <p className="text-fg">{s.signature.body}</p>
          </div>
        </Block>

        <Block eyebrow="4 · Çıktı" title="AI ne buldu?">
          <p className="text-muted">
            Sentetik veri setine kasıtlı olarak üç sorun yerleştirdik ({s.fixture}). Canlı analiz üçünü de buldu:
          </p>
          <ol className="mt-3 flex flex-col gap-2.5">
            {s.findings.map((f) => (
              <li key={f} className="flex gap-3 rounded-lg border border-border bg-surface p-3.5">
                <span className="tnum font-mono text-sm font-semibold text-positive">✓</span>
                <span className="text-sm text-fg">{f}</span>
              </li>
            ))}
          </ol>
        </Block>

        <div className="mt-10 rounded-2xl border border-border bg-surface p-6 text-center">
          <p className="text-muted">Tam raporu, KPI kartlarını ve grafikleri incele:</p>
          <Link href={`/r/${s.demoId}`} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90">
            {s.name} örnek raporu →
          </Link>
        </div>
      </main>
    </>
  );
}
