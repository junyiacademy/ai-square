/**
 * Content validation utility
 * Validates YAML/JSON content files against schemas
 */

import { z } from 'zod'
import * as yaml from 'js-yaml'
import { 
  flexibleKSACodesFileSchema,
  extractKSAIdsFromFlexible,
  validateKSAStructure
} from './schemas/ksa-codes-flexible.schema'
import { 
  domainsFileSchema, 
  validateKSAReferences as validateDomainKSAReferences,
  type DomainsFile 
} from './schemas/domains.schema'
import { 
  assessmentFileSchema,
  validateQuestionDistribution,
  validateQuestionKSAReferences,
  type AssessmentFile 
} from './schemas/assessment.schema'
import { 
  pblScenarioFileSchema,
  validateStageDuration,
  validateScenarioKSAReferences,
  type PBLScenarioFile 
} from './schemas/pbl-scenario.schema'

export interface ValidationResult {
  valid: boolean
  errors: Array<{
    path?: string
    message: string
  }>
  warnings?: Array<{
    path?: string
    message: string
  }>
}

export class ContentValidator {
  private ksaIds: { knowledgeIds: string[], skillIds: string[], attitudeIds: string[] } | null = null

  /**
   * Load and validate KSA codes file
   */
  async validateKSACodes(content: string): Promise<ValidationResult> {
    try {
      const data = yaml.load(content) as any
      
      // Use flexible schema
      const parsed = flexibleKSACodesFileSchema.parse(data)
      
      // Validate structure and get warnings
      const structureValidation = validateKSAStructure(parsed)
      
      // Extract valid IDs for cross-reference validation
      this.ksaIds = extractKSAIdsFromFlexible(parsed)
      
      return { 
        valid: structureValidation.valid, 
        errors: structureValidation.valid ? [] : structureValidation.warnings.filter(w => w.startsWith('Missing')).map(w => ({ message: w })),
        warnings: structureValidation.warnings.filter(w => !w.startsWith('Missing')).map(w => ({ message: w }))
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        }
      }
      return {
        valid: false,
        errors: [{ message: `Unexpected error: ${error}` }]
      }
    }
  }

  /**
   * Validate domains file
   */
  async validateDomains(content: string): Promise<ValidationResult> {
    try {
      const data = yaml.load(content) as any
      const parsed = domainsFileSchema.parse(data)
      
      // Cross-reference validation if KSA IDs are loaded
      if (this.ksaIds) {
        const refValidation = validateDomainKSAReferences(parsed, this.ksaIds)
        if (!refValidation.valid) {
          return {
            valid: false,
            errors: refValidation.errors.map(msg => ({ message: msg }))
          }
        }
      } else {
        return {
          valid: true,
          errors: [],
          warnings: [{ message: 'KSA codes not loaded, skipping cross-reference validation' }]
        }
      }
      
      return { valid: true, errors: [] }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        }
      }
      return {
        valid: false,
        errors: [{ message: `Unexpected error: ${error}` }]
      }
    }
  }

  /**
   * Validate assessment questions file
   */
  async validateAssessment(content: string): Promise<ValidationResult> {
    try {
      const data = yaml.load(content) as any
      const parsed = assessmentFileSchema.parse(data)
      
      // Validate question distribution
      const distValidation = validateQuestionDistribution(parsed)
      if (!distValidation.valid) {
        return {
          valid: false,
          errors: distValidation.errors.map(msg => ({ message: msg }))
        }
      }
      
      // Cross-reference validation if KSA IDs are loaded
      if (this.ksaIds) {
        const refValidation = validateQuestionKSAReferences(parsed.questions, this.ksaIds)
        if (!refValidation.valid) {
          return {
            valid: false,
            errors: refValidation.errors.map(msg => ({ message: msg }))
          }
        }
      } else {
        return {
          valid: true,
          errors: [],
          warnings: [{ message: 'KSA codes not loaded, skipping cross-reference validation' }]
        }
      }
      
      return { valid: true, errors: [] }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        }
      }
      return {
        valid: false,
        errors: [{ message: `Unexpected error: ${error}` }]
      }
    }
  }

  /**
   * Validate PBL scenario file
   */
  async validatePBLScenario(content: string): Promise<ValidationResult> {
    try {
      const data = yaml.load(content) as any
      const parsed = pblScenarioFileSchema.parse(data)
      
      // Validate stage duration
      const durationValidation = validateStageDuration(parsed)
      if (!durationValidation.valid) {
        return {
          valid: false,
          errors: durationValidation.errors.map(msg => ({ message: msg }))
        }
      }
      
      // Cross-reference validation if KSA IDs are loaded
      if (this.ksaIds) {
        const refValidation = validateScenarioKSAReferences(parsed, this.ksaIds)
        if (!refValidation.valid) {
          return {
            valid: false,
            errors: refValidation.errors.map(msg => ({ message: msg }))
          }
        }
      } else {
        return {
          valid: true,
          errors: [],
          warnings: [{ message: 'KSA codes not loaded, skipping cross-reference validation' }]
        }
      }
      
      return { valid: true, errors: [] }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        }
      }
      return {
        valid: false,
        errors: [{ message: `Unexpected error: ${error}` }]
      }
    }
  }

  /**
   * Validate any content file based on its type
   */
  async validateContent(content: string, fileType: 'ksa' | 'domains' | 'assessment' | 'pbl'): Promise<ValidationResult> {
    switch (fileType) {
      case 'ksa':
        return this.validateKSACodes(content)
      case 'domains':
        return this.validateDomains(content)
      case 'assessment':
        return this.validateAssessment(content)
      case 'pbl':
        return this.validatePBLScenario(content)
      default:
        return {
          valid: false,
          errors: [{ message: `Unknown file type: ${fileType}` }]
        }
    }
  }
}

// Export singleton instance
export const contentValidator = new ContentValidator()