import type { ExtractedTable } from '@mercek/sdk';
import { parseCsv } from './csv';
import { ExtractionError, type ParseInput } from './input';
import { parsePdf } from './pdf';
import { parseXlsx } from './xlsx';

type Kind = 'xlsx' | 'csv' | 'pdf' | 'image' | 'unknown';

const EXT_KIND: Record<string, Kind> = {
  xlsx: 'xlsx',
  xls: 'xlsx',
  csv: 'csv',
  tsv: 'csv',
  pdf: 'pdf',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
};

function detectKind(input: ParseInput): Kind {
  const ext = input.filename.split('.').pop()?.toLowerCase() ?? '';
  if (EXT_KIND[ext]) return EXT_KIND[ext];
  const mime = input.mimeType ?? '';
  if (mime.includes('sheet') || mime.includes('excel')) return 'xlsx';
  if (mime === 'text/csv') return 'csv';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  return 'unknown';
}

export interface ExtractOptions {
  /** Vision extractor (see {@link createVisionExtractor}). Required for images. */
  vision?: (input: ParseInput) => Promise<ExtractedTable[]>;
  /** A text-layer PDF page below this confidence is re-tried via vision. */
  pdfVisionThreshold?: number;
}

/**
 * Route a file to the right parser and produce {@link ExtractedTable}[] (§7.2).
 * A missing vision extractor makes image/scanned inputs a user-facing error
 * rather than a silent empty result.
 */
export async function extract(
  input: ParseInput,
  opts: ExtractOptions = {},
): Promise<ExtractedTable[]> {
  const kind = detectKind(input);
  const threshold = opts.pdfVisionThreshold ?? 0.5;

  switch (kind) {
    case 'xlsx':
      return parseXlsx(input);
    case 'csv':
      return parseCsv(input);
    case 'image':
      if (!opts.vision) {
        throw new ExtractionError(
          'Görüntü için vision extractor gerekli (Google API anahtarı yapılandırılmadı).',
          input.filename,
        );
      }
      return opts.vision(input);
    case 'pdf': {
      const tables = await parsePdf(input);
      const strong =
        tables.length > 0 && tables.every((t) => t.meta.confidence >= threshold);
      if (strong || !opts.vision) return tables;
      // Weak text layer (or scanned) → let Gemini read the PDF directly.
      return opts.vision(input);
    }
    default:
      throw new ExtractionError(
        `Desteklenmeyen dosya türü: ${input.filename}`,
        input.filename,
      );
  }
}
