/**
 * Validation schema for AI literacy domains and competencies
 */

import { z } from 'zod'
import { multilingualFieldSchema, idSchemas, commonSchemas } from './base.schema'

// Competency schema
const competencySchema = z.object({
  ...multilingualFieldSchema('description').shape,
  knowledge: z.array(idSchemas.knowledgeId),
  skills: z.array(idSchemas.skillId),
  attitudes: z.array(idSchemas.attitudeId),
  ...multilingualFieldSchema('content').shape,
  scenarios: z.array(z.string()),
  scenarios_zh: z.array(z.string()),
  scenarios_es: z.array(z.string()),
  scenarios_ja: z.array(z.string()),
  scenarios_ko: z.array(z.string()),
  scenarios_fr: z.array(z.string()),
  scenarios_de: z.array(z.string()),
  scenarios_ru: z.array(z.string()),
  scenarios_it: z.array(z.string())
})

// Domain schema
const domainSchema = z.object({
  emoji: commonSchemas.emoji,
  ...multilingualFieldSchema('overview').shape,
  competencies: z.record(idSchemas.competencyId, competencySchema)
})

// Complete domains file schema
export const domainsFileSchema = z.object({
  domains: z.object({
    Engaging_with_AI: domainSchema,
    Creating_with_AI: domainSchema,
    Managing_with_AI: domainSchema,
    Designing_with_AI: domainSchema
  })
})

// Type exports
export type DomainsFile = z.infer<typeof domainsFileSchema>
export type Domain = z.infer<typeof domainSchema>
export type Competency = z.infer<typeof competencySchema>

// Helper function to validate KSA references
export function validateKSAReferences(
  domainsData: DomainsFile,
  validKSAIds: { knowledgeIds: string[], skillIds: string[], attitudeIds: string[] }
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  Object.entries(domainsData.domains).forEach(([domainId, domain]) => {
    Object.entries(domain.competencies).forEach(([competencyId, competency]) => {
      // Check knowledge references
      competency.knowledge.forEach(kId => {
        if (!validKSAIds.knowledgeIds.includes(kId)) {
          errors.push(`Invalid knowledge reference ${kId} in ${domainId}.${competencyId}`)
        }
      })

      // Check skill references
      competency.skills.forEach(sId => {
        if (!validKSAIds.skillIds.includes(sId)) {
          errors.push(`Invalid skill reference ${sId} in ${domainId}.${competencyId}`)
        }
      })

      // Check attitude references
      competency.attitudes.forEach(aId => {
        if (!validKSAIds.attitudeIds.includes(aId)) {
          errors.push(`Invalid attitude reference ${aId} in ${domainId}.${competencyId}`)
        }
      })
    })
  })

  return {
    valid: errors.length === 0,
    errors
  }
}