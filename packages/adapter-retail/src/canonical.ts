import { z } from 'zod';
import type { SourceRef } from '@mercek/sdk';

/**
 * Retail canonical shape (spec §10.1): transaction-level or daily-aggregate
 * sales. Each row is one order line. Optional fields degrade their KPIs to
 * `unavailable` rather than crashing (§5).
 */
export const RetailRowSchema = z.object({
  date: z.coerce.date(),
  sku: z.string().optional(),
  productName: z.string().optional(),
  category: z.string().optional(),
  quantity: z.number(),
  unitPrice: z.number().optional(),
  revenue: z.number(),
  cost: z.number().optional(),
  discount: z.number().optional(),
  returnFlag: z.boolean().optional(),
  channel: z.string().optional(),
  customerId: z.string().optional(),
});

export type RetailRow = z.infer<typeof RetailRowSchema>;

export const RetailCanonicalSchema = z.object({
  rows: z.array(RetailRowSchema),
});

export type RetailCanonical = z.infer<typeof RetailCanonicalSchema> & {
  /** Dataset provenance, carried so KPIs can cite their source (§8.1). */
  sourceRef: SourceRef;
};

/** Canonical field names, used by the mapper and KPI `requiredFields`. */
export const RETAIL_FIELDS = [
  'date',
  'sku',
  'productName',
  'category',
  'quantity',
  'unitPrice',
  'revenue',
  'cost',
  'discount',
  'returnFlag',
  'channel',
  'customerId',
] as const;

export type RetailField = (typeof RETAIL_FIELDS)[number];
