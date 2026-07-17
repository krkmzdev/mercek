/**
 * Finance reference fixture (spec §10.3): 8 quarters of financials in long
 * format (Dönem · Kalem · Değer) with THREE planted problems — nominal growth
 * masking TÜFE-real contraction, a lengthening cash-conversion cycle, and net-
 * margin erosion. Plus an answer key.
 * Run: pnpm --filter @mercek/adapter-finance gen:fixture
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/finance');
const trMoney = (n: number): string => Math.round(n).toLocaleString('tr-TR');
const trIdx = (n: number): string => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');

const QUARTERS = ['2023-Q1', '2023-Q2', '2023-Q3', '2023-Q4', '2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4'];

interface Q {
  period: string;
  items: [string, number][];
  cpi: number;
}

function build(): Q[] {
  return QUARTERS.map((period, q) => {
    const netSales = 1000 * Math.pow(1.085, q); // ~+38.5% YoY nominal
    const cpi = 100 * Math.pow(1.096, q); // ~+44.2% YoY inflation → real contraction
    const grossMarginPct = 38 - q * (8 / 7); // 38 → 30
    const opMarginPct = 12 - q * (6 / 7); // 12 → 6
    const netMarginPct = 8 - q * (6 / 7); // 8 → 2 (erosion)
    const cogs = netSales * (1 - grossMarginPct / 100);
    const dso = 40 + q * (50 / 7); // 40 → 90
    const dio = 50 + q * (50 / 7); // 50 → 100
    const dpo = 45 - q * (20 / 7); // 45 → 25  → CCC lengthens 45 → 165
    const receivables = (netSales * dso) / 91;
    const inventory = (cogs * dio) / 91;
    const payables = (cogs * dpo) / 91;
    const cash = netSales * 0.15 * (1 - q * 0.05);
    const currentAssets = receivables + inventory + cash;
    const currentLiabilities = payables + netSales * 0.2;
    const totalDebt = currentLiabilities + netSales * 0.4;
    const equity = 600 * Math.pow(1.05, q);

    const items: [string, number][] = [
      ['Net Satışlar', netSales],
      ['Satışların Maliyeti', cogs],
      ['Faaliyet Karı', netSales * (opMarginPct / 100)],
      ['Net Kar', netSales * (netMarginPct / 100)],
      ['Amortisman', netSales * 0.05],
      ['Dönen Varlıklar', currentAssets],
      ['Stoklar', inventory],
      ['Ticari Alacaklar', receivables],
      ['Kısa Vadeli Yükümlülükler', currentLiabilities],
      ['Ticari Borçlar', payables],
      ['Toplam Borç', totalDebt],
      ['Özkaynaklar', equity],
    ];
    return { period, items, cpi };
  });
}

async function main(): Promise<void> {
  const quarters = build();
  const header = 'Dönem;Kalem;Değer';
  const lines: string[] = [];
  for (const q of quarters) {
    for (const [name, value] of q.items) lines.push([q.period, name, trMoney(value)].join(';'));
    lines.push([q.period, 'TÜFE Endeksi', trIdx(q.cpi)].join(';'));
  }

  const answerKey = {
    sector: 'FINANCE',
    fixtureId: 'finance-8q',
    rowCount: lines.length,
    plantedProblems: [
      { id: 'real-contraction', signal: 'realReturn', detail: 'Nominal ciro +~%38 büyürken TÜFE +~%44 — reel olarak daralma (~−%4).', keywords: ['reel'], negKeywords: ['daral', 'negatif', 'eksi', 'küçül', 'geril', 'düş'] },
      { id: 'lengthening-ccc', signal: 'ccc', detail: 'Nakit dönüşüm süresi 8 çeyrekte ~45 günden ~165 güne uzadı — nakit baskısı.', keywords: ['nakit dönüşüm', 'nakit döngüsü', 'ccc'], trendKeywords: ['uza', 'art', 'yüksel', 'kötüleş', 'büyü'] },
      { id: 'margin-erosion', signal: 'netMargin', detail: 'Net marj %8’den %2’ye eridi — satış büyürken karlılık düşüyor.', keywords: ['marj'], erosionKeywords: ['eri', 'düş', 'daral', 'azal', 'gerile'] },
    ],
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'finance-8q.csv'), `${header}\r\n${lines.join('\r\n')}\r\n`, 'utf-8');
  await writeFile(resolve(outDir, 'answer-key.json'), JSON.stringify(answerKey, null, 2), 'utf-8');
  console.log(`Wrote ${lines.length} rows → ${outDir}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
