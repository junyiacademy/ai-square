/**
 * Domain validation schema - Updated to match actual YAML structure
 */

import { z } from "zod";

export const CompetencySchema = z.object({
  description: z.string(),
  knowledge: z.array(z.string()),
  skills: z.array(z.string()),
  attitudes: z.array(z.string()),
  content: z.string(),
  scenarios: z.array(z.string()),
});

export const DomainSchema = z.object({
  title: z.string(),
  emoji: z.string(),
  overview: z.string(),
  competencies: z.record(z.string(), CompetencySchema),
});

export const DomainsSchema = z.object({
  domains: z.record(z.string(), DomainSchema),
});

export type Domain = z.infer<typeof DomainSchema>;
export type Competency = z.infer<typeof CompetencySchema>;
export type Domains = z.infer<typeof DomainsSchema>;
