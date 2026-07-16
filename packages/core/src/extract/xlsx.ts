import ExcelJS from 'exceljs';
import type { CellValue, ExtractedTable } from '@mercek/sdk';
import { tableRange } from './a1';
import { ExtractionError, type ParseInput } from './input';

/** Coerce an exceljs cell value into a typed {@link CellValue}. */
function coerceCell(value: ExcelJS.CellValue): CellValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  // Rich objects: formulas, hyperlinks, rich text, errors.
  if (typeof value === 'object') {
    if ('result' in value && value.result !== undefined) return coerceCell(value.result);
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join('');
    }
    if ('error' in value) return null;
  }
  return String(value);
}

function isRowEmpty(row: CellValue[]): boolean {
  return row.every((c) => c === null || c === '');
}

/** Parse an `.xlsx`/`.xls` workbook into one {@link ExtractedTable} per sheet. */
export async function parseXlsx(input: ParseInput): Promise<ExtractedTable[]> {
  const workbook = new ExcelJS.Workbook();
  try {
    // exceljs accepts a Node Buffer / ArrayBuffer-like for load().
    await workbook.xlsx.load(input.bytes as unknown as ExcelJS.Buffer);
  } catch (err) {
    throw new ExtractionError(
      `Excel dosyası okunamadı: ${err instanceof Error ? err.message : String(err)}`,
      input.filename,
    );
  }

  const tables: ExtractedTable[] = [];

  workbook.eachSheet((sheet) => {
    const matrix: CellValue[][] = [];
    let maxCols = 0;

    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values: CellValue[] = [];
      // exceljs row.values is 1-based (index 0 is empty).
      const raw = row.values as ExcelJS.CellValue[];
      for (let c = 1; c < raw.length; c++) {
        values[c - 1] = coerceCell(raw[c] ?? null);
      }
      maxCols = Math.max(maxCols, values.length);
      matrix.push(values);
    });

    // Drop leading empty rows; the first remaining row is the header.
    while (matrix.length > 0 && isRowEmpty(matrix[0] ?? [])) matrix.shift();
    if (matrix.length === 0 || maxCols === 0) return;

    const normalize = (row: CellValue[]): CellValue[] =>
      Array.from({ length: maxCols }, (_, i) => row[i] ?? null);

    const headerRow = normalize(matrix[0] ?? []);
    const headers = headerRow.map((c, i) => (c === null || c === '' ? `col_${i + 1}` : String(c)));
    const rows = matrix.slice(1).map(normalize);

    tables.push({
      id: `${input.fileId}:${sheet.name}`,
      sourceRef: {
        fileId: input.fileId,
        filename: input.filename,
        sheet: sheet.name,
        range: tableRange(maxCols, matrix.length),
      },
      headers,
      rows,
      meta: {
        sheetName: sheet.name,
        confidence: 1,
        extractionMethod: 'exceljs',
      },
    });
  });

  return tables;
}
