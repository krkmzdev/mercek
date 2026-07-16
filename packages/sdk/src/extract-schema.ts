import { z } from 'zod';
import type { SourceRef } from './extract';

/** Runtime schema for {@link SourceRef} — used inside {@link InsightSchema}. */
export const SourceRefSchema: z.ZodType<SourceRef> = z.object({
  fileId: z.string(),
  filename: z.string(),
  sheet: z.string().optional(),
  page: z.number().int().optional(),
  range: z.string().optional(),
  cell: z.string().optional(),
});
