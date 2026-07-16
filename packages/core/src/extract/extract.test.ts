import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv';
import { extract } from './router';
import { parsePdf } from './pdf';
import { parseXlsx } from './xlsx';
import type { ParseInput } from './input';

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../fixtures/extract');

function load(name: string): ParseInput {
  return {
    fileId: name,
    filename: name,
    bytes: new Uint8Array(readFileSync(resolve(fixturesDir, name))),
  };
}

const EXPECTED_HEADERS = ['Tarih', 'Urun', 'Adet', 'Birim Fiyat', 'Ciro'];

describe('parseXlsx', () => {
  it('extracts one typed table per sheet with intact SourceRef', async () => {
    const tables = await parseXlsx(load('retail-sample.xlsx'));
    expect(tables).toHaveLength(1);
    const table = tables[0]!;
    expect(table.headers).toEqual(EXPECTED_HEADERS);
    expect(table.rows).toHaveLength(5);
    expect(table.meta.extractionMethod).toBe('exceljs');
    expect(table.meta.confidence).toBe(1);
    expect(table.sourceRef.sheet).toBe('Satislar');
    expect(table.sourceRef.range).toBe('A1:E6');

    const [date, product, qty, price, revenue] = table.rows[0]!;
    expect(date).toBeInstanceOf(Date);
    expect(product).toBe('Kirmizi Tisort');
    expect(qty).toBe(12);
    expect(price).toBe(199.9);
    expect(revenue).toBe(2398.8);
  });
});

describe('parseCsv', () => {
  it('extracts a table, auto-detects ";" delimiter, keeps raw strings', () => {
    const table = parseCsv(load('retail-sample.csv'))[0]!;
    expect(table.headers).toEqual(EXPECTED_HEADERS);
    expect(table.rows).toHaveLength(5);
    expect(table.meta.extractionMethod).toBe('papaparse');
    expect(table.meta.notes).toContain(';');
    // Turkish-formatted decimals stay as strings until the normalize layer.
    expect(table.rows[0]).toEqual(['2026-01-05', 'Kirmizi Tisort', '12', '199,90', '2.398,80']);
  });
});

describe('parsePdf', () => {
  it('reconstructs the table from text-item geometry, keeping multi-word headers', async () => {
    const pdfTables = await parsePdf(load('retail-sample.pdf'));
    expect(pdfTables).toHaveLength(1);
    const table = pdfTables[0]!;
    expect(table.headers).toEqual(EXPECTED_HEADERS); // "Birim Fiyat" stays one column
    expect(table.rows).toHaveLength(5);
    expect(table.meta.extractionMethod).toBe('pdf-text');
    expect(table.sourceRef.page).toBe(1);
    expect(table.rows[0]).toEqual(['2026-01-05', 'Kirmizi Tisort', '12', '199.90', '2398.80']);
  });
});

describe('extract router', () => {
  it('dispatches by extension', async () => {
    expect((await extract(load('retail-sample.xlsx')))[0]!.meta.extractionMethod).toBe('exceljs');
    expect((await extract(load('retail-sample.csv')))[0]!.meta.extractionMethod).toBe('papaparse');
    expect((await extract(load('retail-sample.pdf')))[0]!.meta.extractionMethod).toBe('pdf-text');
  });

  it('errors on an image when no vision extractor is configured', async () => {
    await expect(
      extract({ fileId: 'x', filename: 'shot.png', bytes: new Uint8Array([1, 2, 3]) }),
    ).rejects.toThrow(/vision extractor/i);
  });

  it('routes an image to the injected vision extractor', async () => {
    const table = {
      id: 'v',
      sourceRef: { fileId: 'x', filename: 'shot.png' },
      headers: ['a'],
      rows: [[1]],
      meta: { confidence: 0.9, extractionMethod: 'vision' as const },
    };
    const out = await extract(
      { fileId: 'x', filename: 'shot.png', bytes: new Uint8Array([1]) },
      { vision: () => Promise.resolve([table]) },
    );
    expect(out[0]!.meta.extractionMethod).toBe('vision');
  });
});
