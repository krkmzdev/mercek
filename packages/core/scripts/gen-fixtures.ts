/**
 * Generates real extract-layer test fixtures into /fixtures/extract:
 *   retail-sample.xlsx  — typed cells (numbers + a Date), one sheet
 *   retail-sample.csv   — ';'-delimited, Turkish decimals (strings)
 *   retail-sample.pdf   — text-layer table, fixed column x-positions (ASCII)
 *
 * Run: pnpm --filter @mercek/core gen:fixtures
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../../../fixtures/extract');
const BOM = '﻿';

const headers = ['Tarih', 'Urun', 'Adet', 'Birim Fiyat', 'Ciro'];
const rows: Array<[string, string, number, number, number]> = [
  ['2026-01-05', 'Kirmizi Tisort', 12, 199.9, 2398.8],
  ['2026-01-06', 'Mavi Kot Pantolon', 5, 499.5, 2497.5],
  ['2026-01-07', 'Deri Ceket', 2, 1499.0, 2998.0],
  ['2026-01-08', 'Spor Ayakkabi', 8, 899.9, 7199.2],
  ['2026-01-09', 'Yun Atki', 20, 149.9, 2998.0],
];

async function genXlsx(path: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Satislar');
  ws.addRow(headers);
  for (const [date, product, qty, price, revenue] of rows) {
    ws.addRow([new Date(`${date}T00:00:00Z`), product, qty, price, revenue]);
  }
  const buf = await wb.xlsx.writeBuffer();
  await writeFile(path, Buffer.from(buf));
}

async function genCsv(path: string): Promise<void> {
  const tr = (n: number): string => n.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
  const lines = [
    headers.join(';'),
    ...rows.map(([date, product, qty, price, revenue]) =>
      [date, product, String(qty), tr(price), tr(revenue)].join(';'),
    ),
  ];
  await writeFile(path, `${BOM}${lines.join('\r\n')}\r\n`, 'utf-8');
}

async function genPdf(path: string): Promise<void> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const colX = [50, 150, 300, 370, 470];
  let y = 780;
  const drawRow = (cells: Array<string | number>): void => {
    cells.forEach((c, i) => page.drawText(String(c), { x: colX[i] ?? 50, y, size: 11, font }));
    y -= 26;
  };
  drawRow(headers);
  for (const [date, product, qty, price, revenue] of rows) {
    drawRow([date, product, qty, price.toFixed(2), revenue.toFixed(2)]);
  }
  const bytes = await doc.save();
  await writeFile(path, bytes);
}

async function main(): Promise<void> {
  await mkdir(outDir, { recursive: true });
  await genXlsx(resolve(outDir, 'retail-sample.xlsx'));
  await genCsv(resolve(outDir, 'retail-sample.csv'));
  await genPdf(resolve(outDir, 'retail-sample.pdf'));
  console.log(`Fixtures written to ${outDir}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
