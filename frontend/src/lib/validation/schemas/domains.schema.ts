/**
 * Domain validation schema
 */

import { z } from 'zod';

export const CompetencySchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  ksa_codes: z.object({
    knowledge: z.array(z.string()),
    skills: z.array(z.string()),
    attitudes: z.array(z.string())
  })
});

export const DomainSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  competencies: z.array(CompetencySchema)
});

export const DomainsSchema = z.object({
  domains: z.array(DomainSchema)
});

export type Domain = z.infer<typeof DomainSchema>;
export type Competency = z.infer<typeof CompetencySchema>;
export type Domains = z.infer<typeof DomainsSchema>;