/**
 * Validation schema for KSA (Knowledge, Skills, Attitudes) codes
 */

import { z } from 'zod'
import { multilingualFieldSchema, idSchemas } from './base.schema'

// Individual KSA code schema
const ksaCodeSchema = multilingualFieldSchema('summary')

// Theme schema containing multiple codes
const themeSchema = z.record(
  z.union([idSchemas.knowledgeId, idSchemas.skillId, idSchemas.attitudeId]),
  ksaCodeSchema
)

// Schema for knowledge codes section
const knowledgeCodesSchema = z.object({
  description: z.string().min(1),
  description_zh: z.string().min(1),
  description_es: z.string().min(1),
  description_ja: z.string().min(1),
  description_ko: z.string().min(1),
  description_fr: z.string().min(1),
  description_de: z.string().min(1),
  description_ru: z.string().min(1),
  description_it: z.string().min(1),
  themes: z.record(z.string(), themeSchema)
})

// Schema for skills codes section
const skillsCodesSchema = z.object({
  description: z.string().min(1),
  description_zh: z.string().min(1),
  description_es: z.string().min(1),
  description_ja: z.string().min(1),
  description_ko: z.string().min(1),
  description_fr: z.string().min(1),
  description_de: z.string().min(1),
  description_ru: z.string().min(1),
  description_it: z.string().min(1),
  themes: z.record(z.string(), themeSchema)
})

// Schema for attitudes codes section
const attitudesCodesSchema = z.object({
  description: z.string().min(1),
  description_zh: z.string().min(1),
  description_es: z.string().min(1),
  description_ja: z.string().min(1),
  description_ko: z.string().min(1),
  description_fr: z.string().min(1),
  description_de: z.string().min(1),
  description_ru: z.string().min(1),
  description_it: z.string().min(1),
  themes: z.record(z.string(), themeSchema)
})

// Complete KSA codes file schema
export const ksaCodesFileSchema = z.object({
  knowledge_codes: knowledgeCodesSchema,
  skills_codes: skillsCodesSchema,
  attitudes_codes: attitudesCodesSchema
})

// Type exports
export type KSACodesFile = z.infer<typeof ksaCodesFileSchema>
export type KnowledgeCodes = z.infer<typeof knowledgeCodesSchema>
export type SkillsCodes = z.infer<typeof skillsCodesSchema>
export type AttitudesCodes = z.infer<typeof attitudesCodesSchema>

// Helper function to extract all valid KSA IDs from a file
export function extractKSAIds(ksaData: KSACodesFile) {
  const knowledgeIds: string[] = []
  const skillIds: string[] = []
  const attitudeIds: string[] = []

  // Extract knowledge IDs
  Object.values(ksaData.knowledge_codes.themes).forEach(theme => {
    knowledgeIds.push(...Object.keys(theme))
  })

  // Extract skill IDs
  Object.values(ksaData.skills_codes.themes).forEach(theme => {
    skillIds.push(...Object.keys(theme))
  })

  // Extract attitude IDs
  Object.values(ksaData.attitudes_codes.themes).forEach(theme => {
    attitudeIds.push(...Object.keys(theme))
  })

  return { knowledgeIds, skillIds, attitudeIds }
}