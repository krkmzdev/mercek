/**
 * Manufacturing fixture (spec §10.4): 30 days, 4 machines, 2 shifts/day. THREE
 * planted problems — the binding constraint is availability (not P/Q); machine
 * M3 hides a severe availability problem behind a middling composite OEE; and
 * its downtime is dominated by one Pareto reason (Kalıp Değişimi).
 * Run: pnpm --filter @mercek/adapter-manufacturing gen:fixture
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/manufacturing');

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(11);
const jitter = (base: number, amp: number): number => base + (rng() - 0.5) * 2 * amp;

interface Machine { id: string; a: number; p: number; q: number }
const MACHINES: Machine[] = [
  { id: 'M1', a: 0.9, p: 0.95, q: 0.99 },
  { id: 'M2', a: 0.88, p: 0.94, q: 0.98 },
  { id: 'M3', a: 0.62, p: 0.93, q: 0.97 }, // hidden availability problem
  { id: 'M4', a: 0.91, p: 0.95, q: 0.99 },
];
const SHIFTS = ['Gündüz', 'Gece'];
const REASONS = ['Kalıp Değişimi', 'Arıza', 'Malzeme Bekleme', 'Ayar', 'Planlı Bakım'];
const IDEAL_CYCLE = 2; // min/unit
const START = Date.UTC(2026, 0, 1);
const DAY = 86400000;

function reasonFor(m: Machine): string {
  if (m.id === 'M3') return rng() < 0.78 ? 'Kalıp Değişimi' : REASONS[1 + Math.floor(rng() * 4)]!;
  return REASONS[Math.floor(rng() * REASONS.length)]!;
}

interface Line { date: string; machine: string; shift: string; planned: number; runtime: number; ideal: number; total: number; good: number; reason: string }

function generate(): Line[] {
  const lines: Line[] = [];
  for (let day = 0; day < 30; day++) {
    const date = new Date(START + day * DAY).toISOString().slice(0, 10);
    for (const m of MACHINES) {
      for (const shift of SHIFTS) {
        const planned = 480;
        const avail = Math.min(0.99, Math.max(0.3, jitter(m.a, 0.03)));
        const runtime = Math.round(planned * avail);
        const perf = Math.min(0.99, Math.max(0.5, jitter(m.p, 0.02)));
        const actualCycle = IDEAL_CYCLE / perf;
        const total = Math.floor(runtime / actualCycle);
        const qual = Math.min(0.999, Math.max(0.8, jitter(m.q, 0.01)));
        const good = Math.floor(total * qual);
        const downtime = planned - runtime;
        lines.push({
          date, machine: m.id, shift, planned, runtime, ideal: IDEAL_CYCLE, total, good,
          reason: downtime > 5 ? reasonFor(m) : '',
        });
      }
    }
  }
  return lines;
}

async function main(): Promise<void> {
  const lines = generate();
  const header = 'Tarih;Makine;Vardiya;Planlı Süre;Çalışma Süresi;İdeal Çevrim;Toplam Adet;Sağlam Adet;Duruş Nedeni';
  const rows = lines.map((l) =>
    [l.date, l.machine, l.shift, l.planned, l.runtime, l.ideal, l.total, l.good, l.reason].join(';'),
  );

  const answerKey = {
    sector: 'MANUFACTURING',
    fixtureId: 'mfg-30d',
    rowCount: lines.length,
    plantedProblems: [
      { id: 'availability-constraint', signal: 'binding', detail: 'Bağlayıcı kısıt kullanılabilirlik (duruşlar) — kalite/performans değil.', keywords: ['kullanılabilirlik', 'availability', 'duruş'] },
      { id: 'problem-machine', signal: 'byMachine', detail: 'M3 makinesi kompozit OEE’nin gizlediği düşük kullanılabilirlik sorununu taşıyor.', keywords: ['m3'] },
      { id: 'downtime-pareto', signal: 'downtime', detail: 'En büyük duruş nedeni Kalıp Değişimi.', keywords: ['kalıp'] },
    ],
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'mfg-30d.csv'), `${header}\r\n${rows.join('\r\n')}\r\n`, 'utf-8');
  await writeFile(resolve(outDir, 'answer-key.json'), JSON.stringify(answerKey, null, 2), 'utf-8');
  console.log(`Wrote ${lines.length} rows → ${outDir}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
