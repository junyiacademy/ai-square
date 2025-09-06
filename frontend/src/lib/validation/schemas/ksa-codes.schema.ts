/**
 * KSA Codes validation schema - Updated to match actual YAML structure
 */

import { z } from 'zod';

export const KSACodeItemSchema = z.object({
  summary: z.string()
});

export const KSAThemeSchema = z.object({
  codes: z.record(z.string(), KSACodeItemSchema),
  explanation: z.string().optional()
});

export const KSASectionSchema = z.object({
  description: z.string(),
  themes: z.record(z.string(), KSAThemeSchema)
});

export const KSACodesSchema = z.object({
  knowledge_codes: KSASectionSchema,
  skill_codes: KSASectionSchema,
  attitude_codes: KSASectionSchema
});

export type KSACodeItem = z.infer<typeof KSACodeItemSchema>;
export type KSATheme = z.infer<typeof KSAThemeSchema>;
export type KSASection = z.infer<typeof KSASectionSchema>;
export type KSACodes = z.infer<typeof KSACodesSchema>;