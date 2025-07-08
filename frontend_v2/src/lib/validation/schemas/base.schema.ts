/**
 * Base validation schemas for common patterns
 */

import { z } from 'zod'

// Supported languages
export const SUPPORTED_LANGUAGES = ['en', 'zhTW', 'zhCN', 'pt', 'ar', 'id', 'th', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'] as const
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]

/**
 * Schema for multilingual fields
 * Validates that a field has translations for all supported languages
 */
export const multilingualFieldSchema = (fieldName: string) => {
  const schema: Record<string, z.ZodString> = {
    [fieldName]: z.string().min(1, `${fieldName} is required`)
  }
  
  SUPPORTED_LANGUAGES.forEach(lang => {
    if (lang !== 'en') {
      schema[`${fieldName}_${lang}`] = z.string().min(1, `${fieldName}_${lang} is required`)
    }
  })
  
  return z.object(schema)
}

/**
 * Schema for optional multilingual fields
 */
export const optionalMultilingualFieldSchema = (fieldName: string) => {
  const schema: Record<string, z.ZodOptional<z.ZodString>> = {
    [fieldName]: z.string().optional()
  }
  
  SUPPORTED_LANGUAGES.forEach(lang => {
    if (lang !== 'en') {
      schema[`${fieldName}_${lang}`] = z.string().optional()
    }
  })
  
  return z.object(schema)
}

/**
 * Common ID patterns
 */
export const idSchemas = {
  domainId: z.enum(['Engaging_with_AI', 'Creating_with_AI', 'Managing_with_AI', 'Designing_with_AI']),
  competencyId: z.string().regex(/^[ECMD]\d+$/, 'Competency ID must be in format like E1, C2, etc.'),
  knowledgeId: z.string().regex(/^K\d+\.\d+$/, 'Knowledge ID must be in format K1.1, K2.3, etc.'),
  skillId: z.string().regex(/^S\d+\.\d+$/, 'Skill ID must be in format S1.1, S2.3, etc.'),
  attitudeId: z.string().regex(/^A\d+\.\d+$/, 'Attitude ID must be in format A1.1, A2.3, etc.'),
  questionId: z.string().regex(/^Q\d{3}$/, 'Question ID must be in format Q001, Q002, etc.'),
  scenarioId: z.string().min(1),
  stageId: z.string().min(1)
}

/**
 * Common field schemas
 */
export const commonSchemas = {
  difficulty: z.enum(['basic', 'intermediate', 'advanced']),
  duration: z.number().positive().int(),
  emoji: z.string().regex(/^\p{Emoji}$/u, 'Must be a single emoji'),
  url: z.string().url().optional(),
  percentage: z.number().min(0).max(100)
}