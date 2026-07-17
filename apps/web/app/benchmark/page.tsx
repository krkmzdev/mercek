import { SiteHeader } from '@/components/site-header';

export const metadata = { title: 'Provider Benchmark — Mercek' };

interface Provider {
  name: string;
  model: string;
  status: 'measured' | 'pending';
  costPerRun?: string;
  latency?: string;
  structured?: string;
  evidence?: string;
  recall?: string;
  note: string;
}

// Google numbers are REAL — measured live across S0–S7 (seeds + 5 sector evals).
// Claude/GPT are intentionally left un-fabricated until their keys are wired.
const PROVIDERS: Provider[] = [
  {
    name: 'Google Gemini',
    model: 'gemini-flash-lite-latest',
    status: 'measured',
    costPerRun: '≈ $0,00055',
    latency: '≈ 2,5 sn',
    structured: '%100',
    evidence: '%100 (flag 0)',
    recall: '15/15',
    note: 'S0–S7 boyunca canlı ölçüldü (5 sektör eval + seed).',
  },
  { name: 'Anthropic Claude', model: 'claude-*', status: 'pending', note: 'ANTHROPIC_API_KEY bağlanınca ölçülecek.' },
  { name: 'OpenAI GPT', model: 'gpt-*', status: 'pending', note: 'OPENAI_API_KEY bağlanınca ölçülecek.' },
];

const METRICS = [
  ['Analiz başına maliyet', 'Gerçek sağlayıcı kullanım metadatasından hesaplanır.'],
  ['Gecikme (latency)', 'İlk yanıt süresi.'],
  ['Structured-output uyumu', 'Zod şemasını ilk denemede geçen yanıt oranı.'],
  ['Kanıt doğrulama (evidence)', 'Hesaplanan KPI’lara dayanmayan iddiaların işaretlenme (flag) oranı.'],
  ['Planted-problem recall', 'Fixture’a yerleştirilen sorunların bulunma oranı.'],
] as const;

export default function BenchmarkPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-14">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Provider Benchmark</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Aynı analiz, üç sağlayıcı</h1>
        <p className="mt-2 max-w-prose text-muted">
          Mercek’in router’ı sağlayıcıdan bağımsızdır. Aynı fixture’ı Gemini / Claude / GPT üzerinden çalıştırıp maliyet,
          gecikme ve çıktı kalitesini ölçüyoruz. <span className="text-fg">Sayılar uydurulmaz</span> — gerçek çalıştırılır,
          kaydedilir ve tarihlenir (§9.6).
        </p>

        <div className="mt-8 overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface2 text-left font-mono text-[0.68rem] uppercase tracking-wider text-faint">
                <th className="p-3 font-medium">Sağlayıcı</th>
                <th className="p-3 font-medium">Maliyet</th>
                <th className="p-3 font-medium">Gecikme</th>
                <th className="p-3 font-medium">Structured</th>
                <th className="p-3 font-medium">Evidence</th>
                <th className="p-3 font-medium">Recall</th>
              </tr>
            </thead>
            <tbody>
              {PROVIDERS.map((p) => (
                <tr key={p.name} className="border-t border-border align-top">
                  <td className="p-3">
                    <div className="font-semibold">{p.name}</div>
                    <div className="font-mono text-[0.68rem] text-faint">{p.model}</div>
                  </td>
                  {p.status === 'measured' ? (
                    <>
                      <td className="tnum p-3">{p.costPerRun}</td>
                      <td className="tnum p-3">{p.latency}</td>
                      <td className="tnum p-3 text-positive">{p.structured}</td>
                      <td className="tnum p-3 text-positive">{p.evidence}</td>
                      <td className="tnum p-3 text-positive">{p.recall}</td>
                    </>
                  ) : (
                    <td colSpan={5} className="p-3 font-mono text-xs text-faint">
                      ölçüm bekliyor — {p.note}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 font-mono text-xs text-faint">
          Gemini ölçümleri gerçektir; Claude ve GPT satırları anahtarlar bağlanana kadar bilinçli olarak boş bırakıldı —
          hiçbir sayı uydurulmadı.
        </p>

        <section className="mt-12">
          <h2 className="font-mono text-xs uppercase tracking-widest text-faint">Metodoloji</h2>
          <dl className="mt-4 flex flex-col gap-3">
            {METRICS.map(([t, d]) => (
              <div key={t} className="rounded-lg border border-border bg-surface p-4">
                <dt className="text-sm font-semibold">{t}</dt>
                <dd className="mt-1 text-sm text-muted">{d}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </>
  );
}
