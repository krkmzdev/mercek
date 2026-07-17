import Link from 'next/link';

interface Sector {
  id: string;
  name: string;
  desc: string;
  inputs: string;
  ready: boolean;
  demo?: string;
}

const SECTORS: Sector[] = [
  {
    id: 'RETAIL',
    name: 'Perakende / E-Ticaret',
    desc: 'Satış, iade ve sepet verisini perakende uzmanı gözüyle okur.',
    inputs: 'tarih · ürün · kategori · adet · ciro · maliyet · iade',
    ready: true,
    demo: '/r/retail-demo',
  },
  {
    id: 'FNB',
    name: 'Restoran / F&B',
    desc: 'POS, menü mühendisliği, food cost.',
    inputs: 'tarih · ürün · adet · tutar · yemek maliyeti · öğün',
    ready: true,
    demo: '/r/fnb-demo',
  },
  {
    id: 'FINANCE',
    name: 'KOBİ Finans',
    desc: 'Mizan, nakit döngüsü, TÜFE-reel büyüme.',
    inputs: 'dönem · kalem · değer · TÜFE',
    ready: true,
    demo: '/r/finance-demo',
  },
  {
    id: 'MANUFACTURING',
    name: 'Üretim / İmalat',
    desc: 'OEE (A×P×Q), fire, duruş Pareto.',
    inputs: 'makine · süre · adet · duruş nedeni',
    ready: true,
    demo: '/r/manufacturing-demo',
  },
  {
    id: 'SAAS',
    name: 'SaaS Metrikleri',
    desc: 'MRR, NRR, Quick Ratio, kohort.',
    inputs: 'ay · müşteri · plan · mrr',
    ready: true,
    demo: '/r/saas-demo',
  },
];

export default function AnalyzePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Analiz</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sektörünü seç</h1>
        <p className="mt-2 max-w-prose text-muted">
          Her sektörün kendi KPI’ları, benchmark’ları ve uzman prompt’u var. Örnek veriyle hemen dene — sentetik, ücretsiz.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTORS.map((s) => (
          <div
            key={s.id}
            className={`flex flex-col rounded-2xl border bg-surface p-5 ${s.ready ? 'border-border' : 'border-dashed border-border opacity-70'}`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">{s.name}</h2>
              {!s.ready && (
                <span className="rounded border border-border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-faint">
                  Yakında
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-muted">{s.desc}</p>
            <p className="mt-3 font-mono text-[0.68rem] text-faint">girdi: {s.inputs}</p>
            <div className="mt-4 flex-1" />
            {s.ready && s.demo ? (
              <Link
                href={s.demo}
                className="mt-2 inline-flex w-fit items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Örnek veriyi dene →
              </Link>
            ) : (
              <span className="mt-2 font-mono text-xs text-faint">Adapter yolda</span>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
