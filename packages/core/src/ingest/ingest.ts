import type { PrismaClient, SourceFile } from '@mercek/db';

/** Persisted file category (matches `SourceFile.kind`, §6). */
export type FileKind = 'spreadsheet' | 'pdf' | 'image';

export const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

const KIND_BY_EXT: Record<string, FileKind> = {
  xlsx: 'spreadsheet',
  xls: 'spreadsheet',
  csv: 'spreadsheet',
  tsv: 'spreadsheet',
  pdf: 'pdf',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
};

function extensionOf(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

/** Map a file to its {@link FileKind}, or `null` if unsupported. */
export function kindFromFile(filename: string, mimeType?: string): FileKind | null {
  const byExt = KIND_BY_EXT[extensionOf(filename)];
  if (byExt) return byExt;
  const mime = mimeType ?? '';
  if (mime.includes('sheet') || mime.includes('excel') || mime === 'text/csv') return 'spreadsheet';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  return null;
}

export interface UploadMeta {
  fileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export type UploadValidation =
  | { ok: true; kind: FileKind }
  | { ok: false; reason: string };

/** Reject oversized or unsupported files before anything touches storage (§5). */
export function validateUpload(meta: UploadMeta): UploadValidation {
  if (meta.sizeBytes <= 0) return { ok: false, reason: 'Dosya boş.' };
  if (meta.sizeBytes > MAX_FILE_BYTES) {
    return { ok: false, reason: `Dosya çok büyük (maks ${MAX_FILE_BYTES / 1024 / 1024} MB).` };
  }
  const kind = kindFromFile(meta.filename, meta.mimeType);
  if (!kind) return { ok: false, reason: `Desteklenmeyen dosya türü: ${meta.filename}` };
  return { ok: true, kind };
}

/** Deterministic R2 object key for an uploaded file. */
export function buildObjectKey(analysisId: string, fileId: string, filename: string): string {
  const safe = filename.replace(/[^\w.-]+/g, '_');
  return `uploads/${analysisId}/${fileId}-${safe}`;
}

export interface PersistSourceFileArgs {
  analysisId: string;
  r2Key: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kind: FileKind;
}

/** Record an uploaded file against its analysis (§6 `SourceFile`). */
export function persistSourceFile(
  db: PrismaClient,
  args: PersistSourceFileArgs,
): Promise<SourceFile> {
  return db.sourceFile.create({
    data: {
      analysisId: args.analysisId,
      r2Key: args.r2Key,
      filename: args.filename,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      kind: args.kind,
    },
  });
}
