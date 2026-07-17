/**
 * Generates the Retail reference fixture (spec §10.1): 90 days of synthetic
 * e-commerce data (~2000 rows) with THREE deliberately planted problems, plus
 * an answer key. The eval scores whether the AI surfaces all three.
 *
 * Run: pnpm --filter @mercek/adapter-retail gen:fixture
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/retail');

// Seeded PRNG (mulberry32) for a reproducible fixture.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(42);
const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]!;
const between = (lo: number, hi: number): number => lo + rng() * (hi - lo);
const trMoney = (n: number): string => n.toFixed(2).replace('.', ',');

interface Cat {
  name: string;
  priceLo: number;
  priceHi: number;
  costRatio: number; // cost = list × costRatio
  returnBase: number;
  weight0: number; // day-0 relative weight
  weight89: number; // day-89 relative weight (for trend)
  skus: { id: string; name: string }[];
}

const CATS: Cat[] = [
  { name: 'Giyim', priceLo: 150, priceHi: 700, costRatio: 0.55, returnBase: 0.1, weight0: 30, weight89: 34,
    skus: [1, 2, 3, 4, 5].map((i) => ({ id: `GIY-00${i}`, name: `Giyim Ürünü ${i}` })) },
  { name: 'Ayakkabı', priceLo: 300, priceHi: 1400, costRatio: 0.6, returnBase: 0.07, weight0: 18, weight89: 20,
    skus: [1, 2, 3, 4, 5].map((i) => ({ id: `AYK-00${i}`, name: `Ayakkabı ${i}` })) },
  { name: 'Aksesuar', priceLo: 50, priceHi: 350, costRatio: 0.45, returnBase: 0.05, weight0: 14, weight89: 30,
    skus: [1, 2, 3, 4, 5].map((i) => ({ id: `AKS-00${i}`, name: `Aksesuar ${i}` })) },
  { name: 'Elektronik', priceLo: 800, priceHi: 6000, costRatio: 0.8, returnBase: 0.03, weight0: 30, weight89: 11,
    skus: [1, 2, 3, 4, 5].map((i) => ({ id: `ELK-00${i}`, name: `Elektronik ${i}` })) },
  { name: 'Ev Tekstili', priceLo: 100, priceHi: 900, costRatio: 0.5, returnBase: 0.06, weight0: 16, weight89: 16,
    skus: [1, 2, 3, 4, 5].map((i) => ({ id: `EVT-00${i}`, name: `Ev Tekstili ${i}` })) },
];

// ── Planted problems ────────────────────────────────────────────────────────
const RETURN_ANOMALY_SKU = 'AYK-003'; // ~30% returns vs ~7% category baseline
const DISCOUNT_WINDOW = { start: 42, end: 48 }; // days: deep Giyim discount → margin collapse
// (Elektronik decline is encoded in weight0 → weight89 above.)

const CHANNELS = ['Web', 'Mağaza', 'Pazaryeri'];
const CUSTOMERS = Array.from({ length: 350 }, (_, i) => `MUS-${String(i + 1).padStart(4, '0')}`);
const START = Date.UTC(2026, 0, 1);
const DAY = 86400000;

interface Row {
  date: string;
  sku: string;
  name: string;
  cat: string;
  qty: number;
  unitPrice: number;
  revenue: number;
  cost: number;
  discount: number;
  isReturn: boolean;
  channel: string;
  customer: string;
}

function catWeight(c: Cat, day: number): number {
  const f = day / 89;
  return c.weight0 + (c.weight89 - c.weight0) * f;
}

function weightedCat(day: number): Cat {
  const weights = CATS.map((c) => catWeight(c, day));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < CATS.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return CATS[i]!;
  }
  return CATS[CATS.length - 1]!;
}

function makeSale(day: number, cat: Cat, discountRate: number): Row {
  const sku = pick(cat.skus);
  const qty = 1 + Math.floor(rng() * 3);
  const unitPrice = Math.round(between(cat.priceLo, cat.priceHi));
  const gross = qty * unitPrice;
  const revenue = gross * (1 - discountRate);
  return {
    date: new Date(START + day * DAY).toISOString().slice(0, 10),
    sku: sku.id,
    name: sku.name,
    cat: cat.name,
    qty,
    unitPrice,
    revenue: Math.round(revenue * 100) / 100,
    cost: Math.round(qty * unitPrice * cat.costRatio * 100) / 100,
    discount: Math.round(gross * discountRate * 100) / 100,
    isReturn: false,
    channel: pick(CHANNELS),
    customer: pick(CUSTOMERS),
  };
}

function generate(): Row[] {
  const rows: Row[] = [];
  for (let day = 0; day < 90; day++) {
    const count = 18 + Math.floor(rng() * 8);
    for (let i = 0; i < count; i++) {
      const cat = weightedCat(day);
      const discountRate = between(0, 0.08);
      const sale = makeSale(day, cat, discountRate);
      rows.push(sale);
    }
    // Discount-spike week: a dominant block of deeply-discounted Giyim volume
    // (sell below cost) → that week's revenue spikes while gross margin turns
    // negative. Volume is large enough to survive weekly blending.
    if (day >= DISCOUNT_WINDOW.start && day <= DISCOUNT_WINDOW.end) {
      const giyim = CATS[0]!;
      for (let i = 0; i < 80; i++) rows.push(makeSale(day, giyim, 0.55));
    }
  }
  // Returns as separate rows (returnFlag = true), keyed off each sale's SKU.
  const returns: Row[] = [];
  for (const s of rows) {
    const cat = CATS.find((c) => c.name === s.cat)!;
    const p = s.sku === RETURN_ANOMALY_SKU ? 0.3 : cat.returnBase;
    if (rng() < p) {
      returns.push({ ...s, isReturn: true, cost: 0, discount: 0 });
    }
  }
  return [...rows, ...returns];
}

async function main(): Promise<void> {
  const rows = generate();
  const header = 'Tarih;SKU;Ürün;Kategori;Adet;Birim Fiyat;Ciro;Maliyet;İskonto;İade;Kanal;Müşteri No';
  const lines = rows.map((r) =>
    [
      r.date,
      r.sku,
      r.name,
      r.cat,
      r.qty,
      trMoney(r.unitPrice),
      trMoney(r.revenue),
      r.isReturn ? '' : trMoney(r.cost),
      r.isReturn ? '' : trMoney(r.discount),
      r.isReturn ? 'Evet' : 'Hayır',
      r.channel,
      r.customer,
    ].join(';'),
  );

  const answerKey = {
    sector: 'RETAIL',
    fixtureId: 'retail-90d',
    rowCount: rows.length,
    plantedProblems: [
      {
        id: 'return-anomaly',
        signal: 'returnBySku',
        detail: `SKU ${RETURN_ANOMALY_SKU} iade oranı ~%30 — kategori ortalamasının (~%7) çok üstünde.`,
        keywords: [RETURN_ANOMALY_SKU.toLowerCase(), 'iade'],
      },
      {
        id: 'category-decline',
        signal: 'categoryTrend',
        detail: 'Elektronik kategorisi 90 gün boyunca sessizce ~%60 daraldı; toplam ciro diğer kategorilerin büyümesiyle maskelendi.',
        keywords: ['elektronik'],
        declineKeywords: ['düş', 'azal', 'geril', 'daral', 'küçül'],
      },
      {
        id: 'discount-margin',
        signal: 'weeklyDiscountMargin',
        detail: 'Yaklaşık 7. hafta Giyim’de %50 indirim ciroyu şişirip brüt marjı çökertti (negatif marj).',
        keywords: ['indirim', 'iskonto', 'marj'],
        marginKeywords: ['çök', 'düş', 'negatif', 'erime', 'erit', 'zarar'],
      },
    ],
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'retail-90d.csv'), `${header}\r\n${lines.join('\r\n')}\r\n`, 'utf-8');
  await writeFile(resolve(outDir, 'answer-key.json'), JSON.stringify(answerKey, null, 2), 'utf-8');
  console.log(`Wrote ${rows.length} rows → ${outDir}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
