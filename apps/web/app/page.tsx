import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium tracking-wide text-accent">MERCEK</p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Ham veri, uzman gözü.</h1>
        <p className="max-w-xl text-pretty text-muted">
          Sektör-farkında AI analist. Excel, PDF veya ekran görüntüsü olarak yüklenen ham işletme verisini, o sektörün
          diline hâkim bir analistin gözüyle okur — içgörü, benchmark ve aksiyon üretir.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/analyze"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Analize başla →
        </Link>
        <Link href="/r/retail-demo" className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline">
          Örnek raporu gör
        </Link>
      </div>

      <p className="font-mono text-xs text-faint">S5 — Report UI. Sonraki: S6 (F&B + Finans adapterları).</p>
    </main>
  );
}
