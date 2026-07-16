import type { ExtractedTable } from '@mercek/sdk';

/** Raw bytes + provenance handed to a parser. */
export interface ParseInput {
  fileId: string;
  filename: string;
  bytes: Uint8Array;
  mimeType?: string;
}

/** A parser turns one file's bytes into zero or more {@link ExtractedTable}. */
export type Parser = (input: ParseInput) => Promise<ExtractedTable[]>;

/** Thrown when a file cannot be read at all (surfaced to the user, §5). */
export class ExtractionError extends Error {
  constructor(
    message: string,
    readonly filename: string,
  ) {
    super(message);
    this.name = 'ExtractionError';
  }
}
