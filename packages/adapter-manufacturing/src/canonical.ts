import { z } from 'zod';
import type { SourceRef } from '@mercek/sdk';

/** Manufacturing canonical (spec §10.4): work-order / machine-event records. */
export const MfgRowSchema = z.object({
  timestamp: z.coerce.date(),
  machineId: z.string(),
  workOrderId: z.string().optional(),
  plannedTime: z.number(), // planned production minutes
  runtime: z.number(), // actual running minutes
  idealCycleTime: z.number(), // ideal minutes per unit
  totalCount: z.number(),
  goodCount: z.number(),
  downtimeReason: z.string().optional(),
  shift: z.string().optional(),
  operatorId: z.string().optional(),
});
export type MfgRow = z.infer<typeof MfgRowSchema>;

export const MfgCanonicalSchema = z.object({ rows: z.array(MfgRowSchema) });
export type MfgCanonical = z.infer<typeof MfgCanonicalSchema> & { sourceRef: SourceRef };

export const MFG_FIELDS = [
  'timestamp', 'machineId', 'workOrderId', 'plannedTime', 'runtime', 'idealCycleTime',
  'totalCount', 'goodCount', 'downtimeReason', 'shift', 'operatorId',
] as const;
export type MfgField = (typeof MFG_FIELDS)[number];
