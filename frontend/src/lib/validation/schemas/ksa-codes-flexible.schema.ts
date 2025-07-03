/**
 * Flexible validation schema for KSA codes that matches actual YAML structure
 */

import { z } from 'zod'

// Individual KSA code schema - more flexible
interface KSACode {
  summary?: string;
  summary_zhTW?: string;
  summary_es?: string;
  summary_ja?: string;
  summary_ko?: string;
  summary_fr?: string;
  summary_de?: string;
  summary_ru?: string;
  summary_it?: string;
  [key: string]: unknown;
}

// // const ksaCodeSchema = z.object({
//   summary: z.string().optional(),
//   summary_zhTW: z.string().optional(),
//   summary_es: z.string().optional(),
//   summary_ja: z.string().optional(),
//   summary_ko: z.string().optional(),
//   summary_fr: z.string().optional(),
//   summary_de: z.string().optional(),
//   summary_ru: z.string().optional(),
//   summary_it: z.string().optional()
// }).passthrough() // Allow extra fields

// Theme schema - flexible to handle both codes and explanations
interface ThemeResult {
  codes: Record<string, KSACode>;
  metadata: Record<string, unknown>;
}

export const themeSchema = z.record(z.string(), z.unknown()).transform((theme): ThemeResult => {
  // Separate codes from other fields
  const codes: Record<string, KSACode> = {}
  const metadata: Record<string, unknown> = {}
  
  Object.entries(theme).forEach(([key, value]) => {
    if (key === 'codes' && typeof value === 'object' && value !== null) {
      // Handle nested codes structure
      Object.assign(codes, value as Record<string, KSACode>)
    } else if (key.match(/^[KSA]\d+(\.\d+)?$/)) {
      // Direct code entries
      codes[key] = value as KSACode
    } else {
      // Theme metadata (explanations, etc.)
      metadata[key] = value
    }
  })
  
  return { codes, metadata }
})

// Schema for knowledge/skills/attitudes section with flexible field names
interface KSASection {
  themes: Record<string, ThemeResult>;
  [key: string]: unknown;
}

const ksaSectionSchema = z.object({})
  .catchall(z.unknown()) // Allow any field names
  .transform((section): KSASection => {
    const result: KSASection = {
      themes: {}
    }
    
    Object.entries(section).forEach(([key, value]) => {
      if (key === 'themes' && typeof value === 'object' && value !== null) {
        result.themes = value as Record<string, ThemeResult>
      } else {
        // Description fields (with possible typos)
        result[key] = value
      }
    })
    
    return result
  })

// Complete flexible KSA codes file schema
export const flexibleKSACodesFileSchema = z.object({
  knowledge_codes: ksaSectionSchema,
  skill_codes: ksaSectionSchema.optional(), // YAML uses skill_codes not skills_codes
  skills_codes: ksaSectionSchema.optional(), // Alternative naming
  attitude_codes: ksaSectionSchema.optional(), // YAML uses attitude_codes not attitudes_codes
  attitudes_codes: ksaSectionSchema.optional() // Alternative naming
}).passthrough() // Allow extra top-level fields

// Type for the flexible KSA data structure
export interface FlexibleKSAData {
  knowledge_codes?: KSASection;
  skill_codes?: KSASection;
  skills_codes?: KSASection;
  attitude_codes?: KSASection;
  attitudes_codes?: KSASection;
  [key: string]: unknown;
}

// Function to extract all KSA IDs from flexible structure
export function extractKSAIdsFromFlexible(data: FlexibleKSAData): {
  knowledgeIds: string[]
  skillIds: string[]
  attitudeIds: string[]
} {
  const knowledgeIds: string[] = []
  const skillIds: string[] = []
  const attitudeIds: string[] = []

  // Helper to extract codes from a theme
  const extractCodesFromTheme = (theme: ThemeResult | Record<string, unknown>, targetArray: string[]) => {
    if ('codes' in theme && theme.codes) {
      Object.keys(theme.codes).forEach(code => {
        targetArray.push(code)
      })
    }
    // Also check direct code entries
    Object.keys(theme).forEach(key => {
      if (key.match(/^[KSA]\d+(\.\d+)?$/) && key !== 'codes') {
        targetArray.push(key)
      }
    })
  }

  // Extract from knowledge codes - note the typo in the YAML (skill_codes instead of skills_codes)
  if (data.knowledge_codes?.themes) {
    Object.values(data.knowledge_codes.themes).forEach((theme) => {
      extractCodesFromTheme(theme, knowledgeIds)
    })
  }

  // Extract from skills codes - the YAML uses "skill_codes" not "skills_codes"
  if (data.skill_codes?.themes) {
    Object.values(data.skill_codes.themes).forEach((theme) => {
      extractCodesFromTheme(theme, skillIds)
    })
  }

  // Extract from attitudes codes - the YAML uses "attitude_codes" not "attitudes_codes"
  if (data.attitude_codes?.themes) {
    Object.values(data.attitude_codes.themes).forEach((theme) => {
      extractCodesFromTheme(theme, attitudeIds)
    })
  }

  return { knowledgeIds, skillIds, attitudeIds }
}

// Validation function that provides warnings for typos
export function validateKSAStructure(data: FlexibleKSAData): {
  valid: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  // Check for common typos
  const sections = ['knowledge_codes', 'skills_codes', 'attitudes_codes'] as const
  sections.forEach(section => {
    const sectionData = data[section]
    if (sectionData && typeof sectionData === 'object') {
      Object.keys(sectionData).forEach(key => {
        if (key.startsWith('description')) {
          warnings.push(`Typo found in ${section}: '${key}' should be 'description${key.substring(10)}'`)
        }
      })
    }
  })

  // Check for required sections
  if (!data.knowledge_codes) warnings.push('Missing knowledge_codes section')
  if (!data.skills_codes) warnings.push('Missing skills_codes section')
  if (!data.attitudes_codes) warnings.push('Missing attitudes_codes section')

  return {
    valid: warnings.filter(w => w.startsWith('Missing')).length === 0,
    warnings
  }
}