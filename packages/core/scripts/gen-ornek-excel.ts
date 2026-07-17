/**
 * Ana dizindeki /ornek-veriler klasörüne her sektör için analiz edilebilir
 * örnek Excel (.xlsx) üretir. Kanıtlanmış fixture verilerini (canlı analizde
 * 3/3 sonuç veren) gerçek Excel'e çevirir: sayılar sayı, tarihler tarih hücresi.
 * Çalıştır: pnpm --filter @mercek/core gen:ornek
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { parseLocaleNumber } from '@mercek/sdk';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const outDir = resolve(root, 'ornek-veriler');

interface Src {
  csv: string;
  out: string;
  sheet: string;
}

const SOURCES: Src[] = [
  { csv: 'fixtures/retail/retail-90d.csv', out: 'perakende.xlsx', sheet: 'Satışlar' },
  { csv: 'fixtures/fnb/fnb-60d.csv', out: 'restoran-fnb.xlsx', sheet: 'POS' },
  { csv: 'fixtures/finance/finance-8q.csv', out: 'finans.xlsx', sheet: 'Finansal Tablo' },
  { csv: 'fixtures/manufacturing/mfg-30d.csv', out: 'uretim.xlsx', sheet: 'Üretim' },
  { csv: 'fixtures/saas/saas-18mo.csv', out: 'saas.xlsx', sheet: 'Abonelikler' },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function coerce(cell: string): string | number | Date {
  const v = cell.trim();
  if (ISO_DATE.test(v)) return new Date(`${v}T00:00:00Z`);
  const parsed = parseLocaleNumber(v);
  return parsed.value !== null ? parsed.value : v;
}

function parseCsv(text: string): string[][] {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return clean
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
    .map((l) => l.split(';'));
}

async function build(src: Src): Promise<number> {
  const text = (await readFile(resolve(root, src.csv))).toString('utf-8');
  const [headers, ...rows] = parseCsv(text);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(src.sheet);
  ws.addRow(headers);
  ws.getRow(1).font = { bold: true };
  for (const row of rows) ws.addRow(row.map(coerce));
  // Reasonable column widths.
  ws.columns.forEach((c) => {
    c.width = 16;
  });
  const buf = await wb.xlsx.writeBuffer();
  writeFileSync(resolve(outDir, src.out), Buffer.from(buf));
  return rows.length;
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  for (const src of SOURCES) {
    const n = await build(src);
    console.log(`  ✓ ornek-veriler/${src.out}  (${n} satır)`);
  }
  console.log(`\nÖrnek Excel'ler → ${outDir}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
