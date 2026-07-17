import { z } from 'zod';
import type { SourceRef } from '@mercek/sdk';

/** F&B canonical shape (spec §10.2): POS transaction lines. */
export const FnbRowSchema = z.object({
  datetime: z.coerce.date(),
  itemName: z.string(),
  category: z.string().optional(),
  quantity: z.number(),
  unitPrice: z.number().optional(),
  revenue: z.number(),
  foodCost: z.number().optional(),
  orderId: z.string().optional(),
  covers: z.number().optional(),
  tableId: z.string().optional(),
  voidFlag: z.boolean().optional(),
  daypart: z.string().optional(),
});

export type FnbRow = z.infer<typeof FnbRowSchema>;

export const FnbCanonicalSchema = z.object({ rows: z.array(FnbRowSchema) });
export type FnbCanonical = z.infer<typeof FnbCanonicalSchema> & { sourceRef: SourceRef };

export const FNB_FIELDS = [
  'datetime',
  'itemName',
  'category',
  'quantity',
  'unitPrice',
  'revenue',
  'foodCost',
  'orderId',
  'covers',
  'tableId',
  'voidFlag',
  'daypart',
] as const;
export type FnbField = (typeof FNB_FIELDS)[number];
