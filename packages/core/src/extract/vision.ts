import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { parseLocaleNumber, type CellValue, type ExtractedTable } from '@mercek/sdk';
import { ExtractionError, type ParseInput } from './input';

/** Structured-output contract for vision extraction (spec §7.3). */
export const VisionExtractSchema = z.object({
  tables: z.array(
    z.object({
      title: z.string().nullable(),
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string())),
      confidence: z.number().min(0).max(1),
      notes: z.string().nullable(),
    }),
  ),
  unreadableRegions: z.array(z.string()),
});

export interface VisionConfig {
  /** Model id, kept as config (§9.2) — model ids drift. */
  model: string;
  /** Google API key; falls back to GOOGLE_GENERATIVE_AI_API_KEY when omitted. */
  apiKey?: string;
  // TODO(S1/S4): §7.3 wants Google media_resolution: HIGH for OCR-class
  // accuracy. Wire it via generateObject `providerOptions.google` once the
  // exact @ai-sdk/google option key is verified against a live key.
}

const VISION_PROMPT = [
  'You extract tables from an image or PDF of business data. Be exact — a misread digit poisons the analysis.',
  'Rules:',
  '- Preserve original header text verbatim. Do NOT translate or normalize (Turkish headers stay Turkish).',
  '- Empty cell → "" (empty string). Never invent a value.',
  '- Merged cells → repeat the value across the span and mention it in notes.',
  '- If a number is blurry, cut off, or ambiguous → report it in notes; do not guess.',
  '- Turkish vs US number format: "1.234,56" (TR) and "1,234.56" (US) are the same value. Detect which the document uses and state it in notes. Keep the digits as written.',
  '- Currency symbols (₺, TL, $, €) stay with the value; record the currency in notes.',
  'Return every table you can see, plus any regions you could not read.',
].join('\n');

function castCell(raw: string): CellValue {
  if (raw === '') return null;
  const parsed = parseLocaleNumber(raw);
  return parsed.value !== null ? parsed.value : raw;
}

/**
 * Build a vision extractor. The returned function sends the file to Gemini and
 * maps the structured result to {@link ExtractedTable}[]. Wire it into the
 * extract router via `ExtractOptions.vision`.
 */
export function createVisionExtractor(
  config: VisionConfig,
): (input: ParseInput) => Promise<ExtractedTable[]> {
  const google = createGoogleGenerativeAI(config.apiKey ? { apiKey: config.apiKey } : {});

  return async function extractWithVision(input: ParseInput): Promise<ExtractedTable[]> {
    const isPdf =
      input.mimeType === 'application/pdf' || input.filename.toLowerCase().endsWith('.pdf');

    try {
      const { object } = await generateObject({
        model: google(config.model),
        schema: VisionExtractSchema,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: VISION_PROMPT },
              isPdf
                ? { type: 'file', data: input.bytes, mediaType: 'application/pdf' }
                : { type: 'image', image: input.bytes },
            ],
          },
        ],
      });

      return object.tables.map((t, index) => ({
        id: `${input.fileId}:vision:${index + 1}`,
        sourceRef: {
          fileId: input.fileId,
          filename: input.filename,
          page: isPdf ? index + 1 : undefined,
        },
        headers: t.headers,
        rows: t.rows.map((row) => row.map(castCell)),
        meta: {
          confidence: t.confidence,
          extractionMethod: 'vision',
          notes: [t.title, t.notes].filter(Boolean).join(' · ') || undefined,
        },
      }));
    } catch (err) {
      throw new ExtractionError(
        `Görüntü/tarama okunamadı (vision): ${err instanceof Error ? err.message : String(err)}`,
        input.filename,
      );
    }
  };
}
