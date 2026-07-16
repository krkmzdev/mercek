/** Spreadsheet A1-notation helpers for building {@link SourceRef} ranges. */

/** 1-based column index → column letters (1 → "A", 27 → "AA"). */
export function columnLetter(index: number): string {
  if (index < 1) return '';
  let n = index;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/** Build an A1 range like "A1:F40" for a header row + `rowCount` data rows. */
export function tableRange(colCount: number, rowCount: number): string {
  if (colCount < 1 || rowCount < 1) return '';
  return `A1:${columnLetter(colCount)}${rowCount}`;
}
