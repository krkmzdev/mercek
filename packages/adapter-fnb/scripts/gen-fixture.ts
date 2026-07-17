/**
 * F&B reference fixture (spec §10.2): 60 days of POS data with THREE planted
 * problems — a clear Dog, an obvious Plowhorse, and a lunch daypart that is
 * quietly unprofitable (high food cost). Plus an answer key for the eval.
 * Run: pnpm --filter @mercek/adapter-fnb gen:fixture
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/fnb');

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
const rng = mulberry32(7);
const trMoney = (n: number): string => n.toFixed(2).replace('.', ',');

interface Item {
  name: string;
  cat: string;
  price: number;
  foodCost: number;
  weight: number;
}

// cmPerUnit = price - foodCost. Planted: Köfte = high-volume low-margin
// (PLOWHORSE); Deniz Mahsulü Güveç = rare low-margin (DOG).
// Food costs are realistic (~28–35%) except the two planted low-margin items:
// Köfte (loss-leader, high volume → PLOWHORSE) and Deniz Mahsulü Güveç (costly
// specialty, rarely sold → DOG). Lunch's 0.7× discount pushes its food cost %
// above the healthy band without any item being absurd.
const MENU: Item[] = [
  { name: 'Köfte', cat: 'Ana Yemek', price: 180, foodCost: 117, weight: 26 },
  { name: 'Tavuk Şiş', cat: 'Ana Yemek', price: 220, foodCost: 66, weight: 12 },
  { name: 'Izgara Balık', cat: 'Ana Yemek', price: 340, foodCost: 105, weight: 8 },
  { name: 'Deniz Mahsulü Güveç', cat: 'Ana Yemek', price: 300, foodCost: 240, weight: 2 },
  { name: 'Mercimek Çorba', cat: 'Başlangıç', price: 60, foodCost: 20, weight: 18 },
  { name: 'Mevsim Salata', cat: 'Başlangıç', price: 95, foodCost: 33, weight: 10 },
  { name: 'Baklava', cat: 'Tatlı', price: 95, foodCost: 30, weight: 9 },
  { name: 'Sütlaç', cat: 'Tatlı', price: 75, foodCost: 26, weight: 6 },
  { name: 'Ayran', cat: 'İçecek', price: 28, foodCost: 9, weight: 22 },
  { name: 'Kola', cat: 'İçecek', price: 32, foodCost: 11, weight: 16 },
];

const START = Date.UTC(2026, 0, 1);
const DAY = 86400000;

function pickItem(): Item {
  const total = MENU.reduce((s, m) => s + m.weight, 0);
  let r = rng() * total;
  for (const m of MENU) {
    r -= m.weight;
    if (r <= 0) return m;
  }
  return MENU[0]!;
}

interface Line {
  dt: string;
  order: string;
  item: string;
  cat: string;
  qty: number;
  price: number;
  revenue: number;
  foodCost: number;
  covers: number;
  daypart: string;
  isVoid: boolean;
}

function generate(): Line[] {
  const lines: Line[] = [];
  let orderNo = 1000;
  for (let day = 0; day < 60; day++) {
    const orders = 30 + Math.floor(rng() * 16); // ~38/day
    for (let o = 0; o < orders; o++) {
      const lunch = rng() < 0.42;
      const daypart = lunch ? 'Öğle' : 'Akşam';
      const hour = lunch ? 12 + Math.floor(rng() * 3) : 19 + Math.floor(rng() * 3);
      const dt = new Date(START + day * DAY + hour * 3600000).toISOString().slice(0, 16).replace('T', ' ');
      const order = `ADS-${++orderNo}`;
      const covers = 1 + Math.floor(rng() * 4);
      const itemsInOrder = 1 + Math.floor(rng() * 4);
      for (let i = 0; i < itemsInOrder; i++) {
        const item = pickItem();
        const qty = 1 + Math.floor(rng() * 2);
        // Lunch is quietly unprofitable: discounted price, same food cost.
        const price = lunch ? Math.round(item.price * 0.7) : item.price;
        const isVoid = rng() < 0.015;
        lines.push({
          dt,
          order,
          item: item.name,
          cat: item.cat,
          qty,
          price,
          revenue: Math.round(price * qty * 100) / 100,
          foodCost: Math.round(item.foodCost * qty * 100) / 100,
          covers: i === 0 ? covers : 0,
          daypart,
          isVoid,
        });
      }
    }
  }
  return lines;
}

async function main(): Promise<void> {
  const lines = generate();
  const header = 'Tarih Saat;Adisyon;Ürün;Kategori;Adet;Birim Fiyat;Tutar;Yemek Maliyeti;Kişi;Öğün;İptal';
  const rows = lines.map((l) =>
    [
      l.dt,
      l.order,
      l.item,
      l.cat,
      l.qty,
      trMoney(l.price),
      trMoney(l.revenue),
      trMoney(l.foodCost),
      l.covers || '',
      l.daypart,
      l.isVoid ? 'Evet' : 'Hayır',
    ].join(';'),
  );

  const answerKey = {
    sector: 'FNB',
    fixtureId: 'fnb-60d',
    rowCount: lines.length,
    plantedProblems: [
      { id: 'menu-dog', signal: 'menu', detail: 'Deniz Mahsulü Güveç: menüde Köpek (Dog) — düşük popülerlik + düşük katkı payı.', keywords: ['güveç', 'dog', 'köpek'] },
      { id: 'menu-plowhorse', signal: 'menu', detail: 'Köfte: Beygir (Plowhorse) — yüksek popülerlik + düşük katkı payı (yeniden fiyatla/re-cost).', keywords: ['köfte', 'plowhorse', 'beygir'] },
      { id: 'lunch-unprofitable', signal: 'daypartMargin', detail: 'Öğle öğünü indirimli fiyat + yüksek food cost ile sessizce kârsız.', keywords: ['öğle', 'öğün', 'lunch'], marginKeywords: ['food cost', 'marj', 'kâr', 'zarar', 'yüksek maliyet', 'düşük'] },
    ],
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'fnb-60d.csv'), `${header}\r\n${rows.join('\r\n')}\r\n`, 'utf-8');
  await writeFile(resolve(outDir, 'answer-key.json'), JSON.stringify(answerKey, null, 2), 'utf-8');
  console.log(`Wrote ${lines.length} lines → ${outDir}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
