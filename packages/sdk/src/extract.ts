/**
 * Extract-layer contract types (spec §7.1).
 *
 * Every parser — deterministic or vision — produces {@link ExtractedTable}.
 * {@link SourceRef} is the explainability backbone: every KPI, finding, and
 * number in the final report traces back to a `SourceRef`. Never drop it.
 *
 * These types live in the SDK (not core) because the Adapter contract (§8,
 * added in S2) consumes `ExtractedTable[]`, and the SDK must stay free of any
 * dependency on the engine (`packages/core`).
 */

/** A single typed cell value produced by the extract layer. */
export type CellValue = string | number | boolean | Date | null;

/** How an {@link ExtractedTable} was produced. Deterministic parses are 1.0. */
export type ExtractionMethod = 'exceljs' | 'papaparse' | 'pdf-text' | 'vision';

/**
 * Provenance for a value or region, carried all the way to the UI.
 * This is what separates Mercek from "paste a CSV into a chatbot".
 */
export interface SourceRef {
  /** Id of the {@link https | StoredFile} this came from. */
  fileId: string;
  filename: string;
  sheet?: string;
  page?: number;
  /** A1-style range, e.g. "B2:F40". */
  range?: string;
  /** A1-style single cell, e.g. "D17". */
  cell?: string;
}

/** A rectangular table extracted from one source region. */
export interface ExtractedTable {
  id: string;
  /** Where this table came from — never drop it. */
  sourceRef: SourceRef;
  headers: string[];
  rows: CellValue[][];
  meta: ExtractedTableMeta;
}

export interface ExtractedTableMeta {
  sheetName?: string;
  pageNumber?: number;
  /** 0–1. Deterministic parse = 1; vision < 1. */
  confidence: number;
  extractionMethod: ExtractionMethod;
  /** Optional free-text notes (e.g. detected number locale, cut-off columns). */
  notes?: string;
}
