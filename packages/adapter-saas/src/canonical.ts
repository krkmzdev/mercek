import { z } from 'zod';
import type { SourceRef } from '@mercek/sdk';

/** SaaS canonical (spec §10.5): monthly subscription / MRR snapshots. */
export const SaasRowSchema = z.object({
  month: z.string(), // "2024-01"
  customerId: z.string(),
  plan: z.string().optional(),
  mrr: z.number(),
  status: z.string().optional(),
  signupDate: z.coerce.date().optional(),
  churnDate: z.coerce.date().optional(),
  seats: z.number().optional(),
  acquisitionCost: z.number().optional(),
});
export type SaasRow = z.infer<typeof SaasRowSchema>;

export const SaasCanonicalSchema = z.object({ rows: z.array(SaasRowSchema) });
export type SaasCanonical = z.infer<typeof SaasCanonicalSchema> & { sourceRef: SourceRef };

export const SAAS_FIELDS = [
  'month', 'customerId', 'plan', 'mrr', 'status', 'signupDate', 'churnDate', 'seats', 'acquisitionCost',
] as const;
export type SaasField = (typeof SAAS_FIELDS)[number];
