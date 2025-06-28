/**
 * Validation schema for KSA (Knowledge, Skills, Attitudes) codes
 */

import { z } from 'zod'
import { multilingualFieldSchema, idSchemas } from './base.schema'

// Individual KSA code schema
const ksaCodeSchema = multilingualFieldSchema('summary')

// Theme schema containing multiple codes
const themeSchema = z.object({
  codes: z.record(
    z.union([idSchemas.knowledgeId, idSchemas.skillId, idSchemas.attitudeId]),
    ksaCodeSchema
  )
})

// Schema for knowledge codes section
const knowledgeCodesSchema = z.object({
  desciption: z.string().min(1), // Note: typo in actual YAML file
  desciption_zh: z.string().min(1),
  desciption_es: z.string().min(1),
  desciption_ja: z.string().min(1),
  desciption_ko: z.string().min(1),
  desciption_fr: z.string().min(1),
  desciption_de: z.string().min(1),
  desciption_ru: z.string().min(1),
  desciption_it: z.string().min(1),
  themes: z.record(z.string(), themeSchema)
})

// Schema for skills codes section
const skillsCodesSchema = z.object({
  desciption: z.string().min(1), // Note: typo in actual YAML file
  desciption_zh: z.string().min(1),
  desciption_es: z.string().min(1),
  desciption_ja: z.string().min(1),
  desciption_ko: z.string().min(1),
  desciption_fr: z.string().min(1),
  desciption_de: z.string().min(1),
  desciption_ru: z.string().min(1),
  desciption_it: z.string().min(1),
  themes: z.record(z.string(), themeSchema)
})

// Schema for attitudes codes section
const attitudesCodesSchema = z.object({
  desciption: z.string().min(1), // Note: typo in actual YAML file
  desciption_zh: z.string().min(1),
  desciption_es: z.string().min(1),
  desciption_ja: z.string().min(1),
  desciption_ko: z.string().min(1),
  desciption_fr: z.string().min(1),
  desciption_de: z.string().min(1),
  desciption_ru: z.string().min(1),
  desciption_it: z.string().min(1),
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
  const knowledgeIds = new Set<string>()
  const skillIds = new Set<string>()
  const attitudeIds = new Set<string>()

  // Extract knowledge IDs
  Object.values(ksaData.knowledge_codes.themes).forEach(theme => {
    Object.keys(theme.codes).forEach(id => knowledgeIds.add(id))
  })

  // Extract skill IDs
  Object.values(ksaData.skills_codes.themes).forEach(theme => {
    Object.keys(theme.codes).forEach(id => skillIds.add(id))
  })

  // Extract attitude IDs
  Object.values(ksaData.attitudes_codes.themes).forEach(theme => {
    Object.keys(theme.codes).forEach(id => attitudeIds.add(id))
  })

  return { 
    knowledgeIds: Array.from(knowledgeIds),
    skillIds: Array.from(skillIds),
    attitudeIds: Array.from(attitudeIds)
  }
}