/**
 * SaaS reference fixture (spec §10.5): 18 months, ~500 customers. Planted
 * leaky bucket — MRR grows on new-logo acquisition while the existing base
 * leaks (NRR < 100%, Quick Ratio ~2), the classic pattern Quick Ratio exposes.
 * Run: pnpm --filter @mercek/adapter-saas gen:fixture
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/saas');

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(23);

const PLANS: [string, number][] = [['Basic', 500], ['Pro', 1500], ['Enterprise', 5000]];
const pickPlan = (): [string, number] => {
  const r = rng();
  return r < 0.55 ? PLANS[0]! : r < 0.85 ? PLANS[1]! : PLANS[2]!;
};

const MONTHS = Array.from({ length: 18 }, (_, i) => {
  const d = new Date(Date.UTC(2024, i, 1));
  return d.toISOString().slice(0, 7);
});

interface Cust { id: string; mrr: number; plan: string; signup: string; active: boolean }

interface Line { month: string; id: string; plan: string; mrr: number; signup: string }

function generate(): Line[] {
  const customers = new Map<string, Cust>();
  let nextId = 1;
  const lines: Line[] = [];
  const addCustomers = (n: number, month: string): void => {
    for (let i = 0; i < n; i++) {
      const [plan, mrr] = pickPlan();
      const id = `C-${String(nextId++).padStart(4, '0')}`;
      customers.set(id, { id, mrr, plan, signup: month, active: true });
    }
  };

  addCustomers(200, MONTHS[0]!);

  for (const month of MONTHS) {
    if (month !== MONTHS[0]) {
      // Churn / contraction / expansion on the existing base (the leak).
      for (const c of customers.values()) {
        if (!c.active) continue;
        const r = rng();
        if (r < 0.05) c.active = false; // ~5% logo churn
        else if (r < 0.09) c.mrr = Math.round(c.mrr * 0.7); // ~4% contraction
        else if (r < 0.11) c.mrr = Math.round(c.mrr * 1.4); // ~2% expansion
      }
      // New logos sized to keep MRR growing (masks the leak).
      const activeCount = [...customers.values()].filter((c) => c.active).length;
      addCustomers(Math.round(activeCount * 0.16), month);
    }
    for (const c of customers.values()) {
      if (c.active) lines.push({ month, id: c.id, plan: c.plan, mrr: c.mrr, signup: c.signup });
    }
  }
  return lines;
}

async function main(): Promise<void> {
  const lines = generate();
  const header = 'Ay;Müşteri;Plan;MRR;Kayıt Tarihi';
  const rows = lines.map((l) => [l.month, l.id, l.plan, l.mrr, `${l.signup}-01`].join(';'));

  const answerKey = {
    sector: 'SAAS',
    fixtureId: 'saas-18mo',
    rowCount: lines.length,
    plantedProblems: [
      { id: 'leaky-bucket', signal: 'nrr', detail: 'MRR büyürken NRR %100 altında — mevcut taban sızdırıyor (sızdıran kova).', keywords: ['sızdıran', 'leaky', 'nrr'] },
      { id: 'quick-ratio-low', signal: 'quickRatio', detail: 'Quick Ratio ~2 (sağlıklı ~4) — büyüme verimsiz, kazanılan her dolara karşılık ciddi kayıp.', keywords: ['quick ratio', 'quick-ratio'] },
      { id: 'churn-masked', signal: 'movement', detail: 'Yüksek churn/daralma, yeni-logo büyümesiyle maskeleniyor.', keywords: ['churn'], maskKeywords: ['maskele', 'yeni', 'gizl', 'örtül', 'rağmen'] },
    ],
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'saas-18mo.csv'), `${header}\r\n${rows.join('\r\n')}\r\n`, 'utf-8');
  await writeFile(resolve(outDir, 'answer-key.json'), JSON.stringify(answerKey, null, 2), 'utf-8');
  console.log(`Wrote ${lines.length} rows → ${outDir}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
