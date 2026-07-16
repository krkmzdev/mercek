import { extractTextItems, getDocumentProxy } from 'unpdf';
import type { CellValue, ExtractedTable } from '@mercek/sdk';
import { tableRange } from './a1';
import { ExtractionError, type ParseInput } from './input';

/** Minimal shape of an unpdf text item that we rely on. */
interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

const ROW_TOLERANCE = 6; // pt — items within this y-distance share a row
const COL_TOLERANCE = 16; // pt — x positions closer than this collapse to one column

/** Cluster sorted x-positions into column anchors (ascending). */
function clusterColumns(xs: number[]): number[] {
  const sorted = [...xs].sort((a, b) => a - b);
  const anchors: number[] = [];
  for (const x of sorted) {
    const last = anchors[anchors.length - 1];
    if (last === undefined || x - last > COL_TOLERANCE) anchors.push(x);
  }
  return anchors;
}

function nearestColumn(x: number, anchors: number[]): number {
  let best = 0;
  let bestDist = Infinity;
  anchors.forEach((a, i) => {
    const d = Math.abs(a - x);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

/** Reconstruct a table from positioned text items using x/y geometry. */
function itemsToTable(items: TextItem[]): { headers: string[]; rows: CellValue[][] } | null {
  const cells = items.filter((it) => it.str.trim() !== '');
  if (cells.length === 0) return null;

  // Group into rows top-to-bottom (PDF y grows upward).
  const byY = [...cells].sort((a, b) => b.y - a.y);
  const lines: TextItem[][] = [];
  for (const item of byY) {
    const line = lines[lines.length - 1];
    const ref = line?.[0];
    if (ref && Math.abs(ref.y - item.y) <= ROW_TOLERANCE) line.push(item);
    else lines.push([item]);
  }

  const anchors = clusterColumns(cells.map((c) => c.x));
  if (anchors.length === 0) return null;

  const toRow = (line: TextItem[]): CellValue[] => {
    const row: CellValue[] = Array.from({ length: anchors.length }, () => null);
    for (const item of [...line].sort((a, b) => a.x - b.x)) {
      const col = nearestColumn(item.x, anchors);
      const existing = row[col];
      row[col] = existing ? `${String(existing)} ${item.str}`.trim() : item.str.trim();
    }
    return row;
  };

  const [headerLine, ...bodyLines] = lines;
  if (!headerLine) return null;
  const headerRow = toRow(headerLine);
  const headers = headerRow.map((c, i) => (c === null || c === '' ? `col_${i + 1}` : String(c)));
  return { headers, rows: bodyLines.map(toRow) };
}

/**
 * Parse a text-layer PDF into one {@link ExtractedTable} per page using item
 * geometry. Scanned PDFs (no text layer) yield nothing here and are routed to
 * the vision extractor by the caller (§7.2).
 */
export async function parsePdf(input: ParseInput): Promise<ExtractedTable[]> {
  let pages: TextItem[][];
  try {
    const pdf = await getDocumentProxy(input.bytes);
    const result = await extractTextItems(pdf);
    pages = result.items as unknown as TextItem[][];
  } catch (err) {
    throw new ExtractionError(
      `PDF okunamadı: ${err instanceof Error ? err.message : String(err)}`,
      input.filename,
    );
  }

  const tables: ExtractedTable[] = [];
  pages.forEach((items, index) => {
    const table = itemsToTable(items);
    if (!table) return;
    const strong = table.headers.length >= 2 && table.rows.length >= 1;
    tables.push({
      id: `${input.fileId}:p${index + 1}`,
      sourceRef: {
        fileId: input.fileId,
        filename: input.filename,
        page: index + 1,
        range: tableRange(table.headers.length, table.rows.length + 1),
      },
      headers: table.headers,
      rows: table.rows,
      meta: {
        pageNumber: index + 1,
        // Text-layer geometry is reliable but not perfect; below threshold the
        // router should re-attempt this page via vision.
        confidence: strong ? 0.75 : 0.4,
        extractionMethod: 'pdf-text',
        notes: 'reconstructed from PDF text-item x/y positions',
      },
    });
  });

  return tables;
}
