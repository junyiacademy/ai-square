/**
 * KSA Codes validation schema
 */

import { z } from 'zod';

export const KSAItemSchema = z.object({
  code: z.string(),
  description: z.string()
});

export const KSACodesSchema = z.object({
  knowledge: z.array(KSAItemSchema),
  skills: z.array(KSAItemSchema),
  attitudes: z.array(KSAItemSchema)
});

export type KSAItem = z.infer<typeof KSAItemSchema>;
export type KSACodes = z.infer<typeof KSACodesSchema>;