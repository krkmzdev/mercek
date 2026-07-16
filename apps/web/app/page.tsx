import { HealthCheck } from '@/components/health-check';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium tracking-wide text-[--color-accent]">MERCEK</p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Ham veri, uzman gözü.
        </h1>
        <p className="max-w-xl text-pretty text-[--color-muted]">
          Sektör-farkında AI analist. Excel, PDF veya ekran görüntüsü olarak yüklenen ham işletme
          verisini, o sektörün diline hâkim bir analistin gözüyle okur.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-[--color-muted]">Sistem durumu</p>
        <HealthCheck />
        <p className="text-xs text-[--color-muted]">
          S0 — Foundation iskeleti çalışıyor. Sonraki: S1 (ingest + extract).
        </p>
      </div>
    </main>
  );
}
