import Papa from 'papaparse';
import type { CellValue, ExtractedTable } from '@mercek/sdk';
import { tableRange } from './a1';
import { ExtractionError, type ParseInput } from './input';

/**
 * Parse `.csv`/`.tsv` into a single {@link ExtractedTable}. Values are kept as
 * raw strings — locale-aware typing happens later (normalize/adapter), so the
 * extract layer stays a faithful transcription.
 */
export function parseCsv(input: ParseInput): ExtractedTable[] {
  const text = new TextDecoder('utf-8').decode(input.bytes);
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: 'greedy',
    // delimiter auto-detected; TR exports frequently use ';'
  });

  const rows = result.data.filter((r) => r.length > 0);
  if (rows.length === 0) {
    throw new ExtractionError('CSV dosyası boş veya okunamadı.', input.filename);
  }

  const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const pad = (r: string[]): CellValue[] =>
    Array.from({ length: maxCols }, (_, i) => (r[i] ?? '') as CellValue);

  const headerRow = rows[0] ?? [];
  const headers = Array.from({ length: maxCols }, (_, i) => {
    const h = headerRow[i];
    return h === undefined || h === '' ? `col_${i + 1}` : h;
  });

  return [
    {
      id: `${input.fileId}:csv`,
      sourceRef: {
        fileId: input.fileId,
        filename: input.filename,
        range: tableRange(maxCols, rows.length),
      },
      headers,
      rows: rows.slice(1).map(pad),
      meta: {
        confidence: 1,
        extractionMethod: 'papaparse',
        notes: result.meta.delimiter ? `delimiter: "${result.meta.delimiter}"` : undefined,
      },
    },
  ];
}
