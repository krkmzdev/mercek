import type { Finding } from '@mercek/sdk';
import type { KpiView, ReportView } from '@/lib/report';
import {
  CategoryTrendChart,
  CccTrendChart,
  CohortRetentionChart,
  DaypartMarginChart,
  DowntimeParetoChart,
  MachineOeeChart,
  MenuMatrixChart,
  MrrMovementChart,
  MrrTrendChart,
  OeeDecompositionChart,
  ParetoChart,
  RealReturnChart,
  ReturnBySkuChart,
} from './charts';
import { PrintButton, ThemeToggle } from './interactive';

const SEV = {
  critical: { cls: 'text-critical', bg: 'bg-critical/12 border-critical/30', label: 'Kritik' },
  warning: { cls: 'text-warning', bg: 'bg-warning/12 border-warning/30', label: 'Uyarı' },
  opportunity: { cls: 'text-opportunity', bg: 'bg-opportunity/12 border-opportunity/30', label: 'Fırsat' },
  positive: { cls: 'text-positive', bg: 'bg-positive/12 border-positive/30', label: 'Pozitif' },
} as const;

const VERDICT: Record<string, { cls: string; label: string }> = {
  good: { cls: 'text-positive', label: 'iyi' },
  neutral: { cls: 'text-muted', label: 'bant içi' },
  warning: { cls: 'text-warning', label: 'dikkat' },
  critical: { cls: 'text-critical', label: 'kritik' },
};

function EvidenceRef({ e }: { e: KpiView['evidence'][number] }) {
  const parts = [e.filename, e.sheet, e.range ?? e.cell].filter(Boolean).join(' · ');
  return <span className="text-accent">{parts}</span>;
}

function KpiCard({ k }: { k: KpiView }) {
  const bench = k.benchmark;
  return (
    <div className={`flex flex-col rounded-xl border bg-surface p-4 ${k.status === 'unavailable' ? 'border-dashed border-borderStrong' : 'border-border'}`}>
      <span className="text-sm text-muted">{k.label.tr}</span>
      {k.status === 'ok' ? (
        <span className="tnum mt-0.5 text-2xl font-semibold tracking-tight">{k.value}</span>
      ) : (
        <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded bg-warning/12 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-warning">
          Kullanılamıyor
        </span>
      )}
      {bench && k.status === 'ok' && (
        <span className={`mt-1.5 font-mono text-xs ${VERDICT[bench.verdict]?.cls ?? 'text-muted'}`}>
          benchmark: {VERDICT[bench.verdict]?.label ?? bench.verdict}
          {bench.median !== undefined && ` · medyan ${bench.median.toLocaleString('tr-TR')}`}
          {bench.isSynthetic && <span className="text-faint"> · sentetik</span>}
        </span>
      )}
      <span className="mt-2.5 border-t border-dashed border-border pt-2.5 font-mono text-[0.68rem] leading-relaxed text-faint">
        formül: {k.formula.tr}
        <br />
        {k.status === 'ok' ? (
          <>
            kaynak: <EvidenceRef e={k.evidence[0] ?? { filename: '—' }} />
          </>
        ) : (
          <>neden: {k.unavailableReason}</>
        )}
      </span>
    </div>
  );
}

function FindingCard({ f }: { f: Finding }) {
  const sev = SEV[f.severity];
  return (
    <details className="group overflow-hidden rounded-xl border border-border bg-surface [&>summary]:list-none">
      <summary className="flex cursor-pointer items-center gap-3 p-4">
        <span className={`h-full w-1 self-stretch rounded ${sev.cls}`} style={{ backgroundColor: 'currentColor' }} />
        <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider ${sev.bg} ${sev.cls}`}>
          {sev.label}
        </span>
        <h3 className="flex-1 text-[0.98rem] font-semibold tracking-tight">{f.title}</h3>
        <span className="font-mono text-xs text-faint transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-border px-4 pb-4 pt-3">
        <p className="text-sm text-muted">{f.body}</p>
        <div className="mt-3 flex flex-col gap-1.5">
          {f.evidence.map((ev, i) => (
            <div key={i} className="flex items-start gap-2 font-mono text-[0.68rem] text-faint">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
              <span>
                {ev.kpiId && <code className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">{ev.kpiId}</code>} {ev.claim}
              </span>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

const SEV_ORDER = { critical: 0, warning: 1, opportunity: 2, positive: 3 };

export function ReportViewComponent({ view }: { view: ReportView }) {
  const { insight, mapping, charts } = view;
  const findings = [...insight.findings].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  const lowConfidence = mapping.confidence < 0.85;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 print:py-4">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <span className="text-xl font-semibold tracking-tight">Mercek</span>
          <span className="rounded border border-accent px-2 py-0.5 font-mono text-[0.7rem] uppercase tracking-widest text-accent">
            {view.sectorName.tr}
          </span>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <ThemeToggle />
          <PrintButton />
        </div>
      </header>

      {view.isFixture && (
        <div className="mb-6 rounded-lg border border-warning/35 bg-warning/10 px-3.5 py-2 font-mono text-[0.7rem] text-warning">
          Örnek veri — sentetik, yalnızca gösterim amaçlı
        </div>
      )}

      {/* Hero */}
      <section className="grid grid-cols-1 items-center gap-6 rounded-2xl border border-border bg-surface p-7 sm:grid-cols-[1fr_auto]">
        <div>
          <h1 className="mb-3 text-balance text-2xl font-semibold leading-tight tracking-tight">{insight.headline}</h1>
          <p className="max-w-prose text-pretty text-muted">{insight.summary}</p>
        </div>
        <div className="text-center sm:min-w-[132px]">
          <div className="tnum text-5xl font-semibold leading-none tracking-tighter">{insight.healthScore}</div>
          <div className="mt-1.5 font-mono text-[0.62rem] uppercase tracking-widest text-faint">Sağlık / 100</div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full border border-border bg-surface2">
            <div className="h-full bg-accent" style={{ width: `${insight.healthScore}%` }} />
          </div>
        </div>
      </section>

      {/* KPIs */}
      <Section title="Temel Metrikler">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {view.kpis.map((k) => (
            <KpiCard key={k.id} k={k} />
          ))}
        </div>
      </Section>

      {/* Charts */}
      {hasCharts(charts) && (
        <Section title="Görselleştirmeler">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {charts.categoryTrend && <CategoryTrendChart data={charts.categoryTrend} />}
            {charts.returnBySku && <ReturnBySkuChart data={charts.returnBySku} />}
            {charts.pareto && (
              <div className="lg:col-span-2">
                <ParetoChart data={charts.pareto} />
              </div>
            )}
            {charts.menuMatrix && (
              <div className="lg:col-span-2">
                <MenuMatrixChart data={charts.menuMatrix} />
              </div>
            )}
            {charts.daypartMargin && <DaypartMarginChart data={charts.daypartMargin} />}
            {charts.realReturn && <RealReturnChart data={charts.realReturn} />}
            {charts.cccTrend && <CccTrendChart data={charts.cccTrend} />}
            {charts.oeeDecomposition && <OeeDecompositionChart data={charts.oeeDecomposition} />}
            {charts.machineOee && <MachineOeeChart data={charts.machineOee} />}
            {charts.downtimePareto && (
              <div className="lg:col-span-2">
                <DowntimeParetoChart data={charts.downtimePareto} />
              </div>
            )}
            {charts.mrrTrend && <MrrTrendChart data={charts.mrrTrend} />}
            {charts.mrrMovement && <MrrMovementChart data={charts.mrrMovement} />}
            {charts.cohortRetention && (
              <div className="lg:col-span-2">
                <CohortRetentionChart data={charts.cohortRetention} />
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Findings */}
      <Section title="Bulgular">
        <div className="flex flex-col gap-3">
          {findings.map((f, i) => (
            <FindingCard key={i} f={f} />
          ))}
        </div>
      </Section>

      {/* Actions */}
      <Section title="Öncelikli Aksiyonlar">
        <div className="flex flex-col gap-2.5">
          {[...insight.actions]
            .sort((a, b) => a.priority - b.priority)
            .map((a, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr] items-start gap-4 rounded-xl border border-border bg-surface p-4">
                <span className="tnum grid h-8 w-8 place-items-center rounded-lg border border-borderStrong font-semibold text-accent">
                  {a.priority}
                </span>
                <div>
                  <h3 className="text-[0.98rem] font-semibold">{a.title}</h3>
                  <p className="mt-1 text-sm text-fg">{a.expectedImpact}</p>
                  <p className="mt-1 text-sm text-muted">{a.rationale}</p>
                  <span className="mt-2 inline-block rounded border border-border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted">
                    Efor: {a.effort === 'low' ? 'Düşük' : a.effort === 'medium' ? 'Orta' : 'Yüksek'}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </Section>

      {/* Data gaps */}
      {insight.dataGaps.length > 0 && (
        <Section title="Veri Boşlukları">
          <div className="flex flex-wrap gap-2">
            {insight.dataGaps.map((g, i) => (
              <span key={i} className="rounded-md border border-border bg-surface2 px-3 py-1.5 font-mono text-sm text-muted">
                {g}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Mapping — showing the work is the product */}
      <Section title="Sütun Eşlemesi">
        {lowConfidence && (
          <div className="mb-3 rounded-lg border border-warning/35 bg-warning/10 px-3.5 py-2 text-sm text-warning">
            Eşleme güveni düşük (%{Math.round(mapping.confidence * 100)}) — sütun eşlemesini gözden geçirin.
          </div>
        )}
        <details open={lowConfidence} className="rounded-xl border border-border bg-surface p-4">
          <summary className="cursor-pointer font-mono text-xs text-muted">
            {mapping.columns.length} sütun eşlendi · güven %{Math.round(mapping.confidence * 100)}
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left font-mono text-[0.68rem] uppercase tracking-wider text-faint">
                  <th className="py-1.5 pr-4 font-medium">Kaynak sütun</th>
                  <th className="py-1.5 pr-4 font-medium">Kanonik alan</th>
                  <th className="py-1.5 pr-4 font-medium">Yöntem</th>
                  <th className="py-1.5 font-medium">Güven</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[0.8rem]">
                {mapping.columns.map((c) => (
                  <tr key={c.sourceHeader} className="border-t border-border">
                    <td className="py-1.5 pr-4">{c.sourceHeader}</td>
                    <td className="py-1.5 pr-4 text-accent">{c.canonicalField}</td>
                    <td className="py-1.5 pr-4 text-muted">{c.method}</td>
                    <td className="tnum py-1.5">%{Math.round(c.confidence * 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Section>

      <footer className="mt-10 flex flex-wrap justify-between gap-2 border-t border-border pt-4 font-mono text-[0.72rem] text-faint">
        <span>
          Kaynak: <b className="text-muted">{view.source.filename}</b> · {view.source.rows} satır · eşleme %
          {Math.round(mapping.confidence * 100)}
        </span>
        <span>
          Model: <b className="text-muted">{view.meta.model}</b> · maliyet{' '}
          <b className="text-muted">{view.meta.costUsd.toFixed(6)} USD</b> · kanıt-uyarı {view.meta.evidenceFlagRate}
        </span>
      </footer>
    </main>
  );
}

function hasCharts(charts: ReportView['charts']): boolean {
  return Object.values(charts).some((v) => Array.isArray(v) && v.length > 0);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 flex items-center gap-2.5 font-mono text-[0.72rem] font-semibold uppercase tracking-widest text-faint">
        {title}
        <span className="h-px flex-1 bg-border" />
      </h2>
      {children}
    </section>
  );
}
