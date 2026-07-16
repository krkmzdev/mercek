import { describe, expect, it } from 'vitest';
import { buildObjectKey, kindFromFile, validateUpload, MAX_FILE_BYTES } from './ingest';
import { createR2Storage } from './storage';

describe('kindFromFile', () => {
  it('maps spreadsheets, pdf, and images by extension', () => {
    expect(kindFromFile('a.xlsx')).toBe('spreadsheet');
    expect(kindFromFile('a.csv')).toBe('spreadsheet');
    expect(kindFromFile('a.pdf')).toBe('pdf');
    expect(kindFromFile('a.png')).toBe('image');
    expect(kindFromFile('a.jpeg')).toBe('image');
  });

  it('falls back to mime type when extension is unknown', () => {
    expect(kindFromFile('blob', 'application/pdf')).toBe('pdf');
    expect(kindFromFile('blob', 'image/webp')).toBe('image');
  });

  it('returns null for unsupported files', () => {
    expect(kindFromFile('a.exe')).toBeNull();
  });
});

describe('validateUpload', () => {
  it('accepts a normal spreadsheet', () => {
    const r = validateUpload({ fileId: '1', filename: 's.xlsx', mimeType: '', sizeBytes: 1000 });
    expect(r).toEqual({ ok: true, kind: 'spreadsheet' });
  });

  it('rejects empty and oversized files', () => {
    expect(validateUpload({ fileId: '1', filename: 's.xlsx', mimeType: '', sizeBytes: 0 }).ok).toBe(false);
    expect(
      validateUpload({ fileId: '1', filename: 's.xlsx', mimeType: '', sizeBytes: MAX_FILE_BYTES + 1 }).ok,
    ).toBe(false);
  });

  it('rejects unsupported types', () => {
    expect(validateUpload({ fileId: '1', filename: 'a.exe', mimeType: '', sizeBytes: 10 }).ok).toBe(false);
  });
});

describe('buildObjectKey', () => {
  it('namespaces by analysis and sanitizes the filename', () => {
    // Non-ASCII (ı, ş) and spaces collapse to '_' for a storage-safe key.
    expect(buildObjectKey('an1', 'f1', 'satış raporu.xlsx')).toBe('uploads/an1/f1-sat_raporu.xlsx');
  });
});

describe('createR2Storage presigning', () => {
  const storage = createR2Storage({
    accountId: 'acct',
    accessKeyId: 'key',
    secretAccessKey: 'secret',
    bucket: 'mercek-uploads',
  });

  it('signs a PUT url pointing at the bucket + key (no network)', async () => {
    const url = await storage.presignedPutUrl('uploads/a/f.xlsx', 'application/octet-stream');
    expect(url).toContain('mercek-uploads');
    expect(url).toContain('uploads/a/f.xlsx');
    expect(url).toContain('X-Amz-Signature');
  });

  it('signs a GET url', async () => {
    const url = await storage.presignedGetUrl('uploads/a/f.xlsx');
    expect(url).toMatch(/^https:\/\//);
    expect(url).toContain('X-Amz-Expires');
  });
});
