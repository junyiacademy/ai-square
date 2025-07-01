/**
 * Content validation report generator
 * Produces human-readable validation reports
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import * as yaml from 'js-yaml'
import { extractKSAIdsFromFlexible } from './schemas/ksa-codes-flexible.schema'
import { 
  KSAData, 
  DomainsData, 
  Domain,
  Competency,
  AssessmentData, 
  AssessmentQuestion,
  PBLData,
  PBLStage
} from '@/types/validation'

interface ContentStats {
  fileName: string
  fileType: string
  totalItems: number
  details: Record<string, string | number | Record<string, number>>
}

export class ValidationReporter {
  /**
   * Generate content statistics report
   */
  generateContentStats(files: Array<{ path: string, type: string, name: string }>): ContentStats[] {
    const stats: ContentStats[] = []

    files.forEach(file => {
      try {
        const content = readFileSync(join(process.cwd(), file.path), 'utf-8')
        const data = yaml.load(content)

        let totalItems = 0
        const details: Record<string, string | number | Record<string, number>> = {}

        switch (file.type) {
          case 'ksa':
            const ksaData = data as KSAData
            const ksaIds = extractKSAIdsFromFlexible(ksaData)
            totalItems = ksaIds.knowledgeIds.length + ksaIds.skillIds.length + ksaIds.attitudeIds.length
            details.knowledge = ksaIds.knowledgeIds.length
            details.skills = ksaIds.skillIds.length
            details.attitudes = ksaIds.attitudeIds.length
            details.themes = {
              knowledge: Object.keys(ksaData.knowledge_codes?.themes || {}).length,
              skills: Object.keys(ksaData.skills_codes?.themes || {}).length,
              attitudes: Object.keys(ksaData.attitudes_codes?.themes || {}).length
            }
            break

          case 'domains':
            const domainsData = data as DomainsData
            const domains = domainsData.domains || {}
            Object.entries(domains).forEach(([domainId, domain]) => {
              const competencies = Object.keys(domain.competencies || {})
              details[domainId] = competencies.length
              totalItems += competencies.length
            })
            break

          case 'assessment':
            const assessmentData = data as AssessmentData
            totalItems = assessmentData.questions?.length || 0
            details.totalQuestions = totalItems
            const byDomain: Record<string, number> = {}
            const byDifficulty: Record<string, number> = {}
            
            assessmentData.questions?.forEach((q) => {
              byDomain[q.domain] = (byDomain[q.domain] || 0) + 1
              byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1
            })
            details.byDomain = byDomain
            details.byDifficulty = byDifficulty
            break

          case 'pbl':
            const pblData = data as PBLData
            totalItems = pblData.stages?.length || 0
            details.stages = totalItems
            details.totalDuration = pblData.scenario_info?.estimated_duration || 0
            let taskCount = 0
            pblData.stages?.forEach((stage) => {
              taskCount += stage.tasks?.length || 0
            })
            details.tasks = taskCount
            break
        }

        stats.push({
          fileName: file.name,
          fileType: file.type,
          totalItems,
          details
        })
      } catch (error) {
        stats.push({
          fileName: file.name,
          fileType: file.type,
          totalItems: 0,
          details: { error: `Failed to read: ${error}` }
        })
      }
    })

    return stats
  }

  /**
   * Generate cross-reference validation report
   */
  generateCrossReferenceReport(
    domainsFile: string,
    assessmentFile: string,
    pblFile: string,
    ksaIds: { knowledgeIds: string[], skillIds: string[], attitudeIds: string[] }
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = []

    try {
      // Check domains file
      const domainsContent = readFileSync(domainsFile, 'utf-8')
      const domainsData = yaml.load(domainsContent) as DomainsData

      Object.entries(domainsData.domains || {}).forEach(([domainId, domain]) => {
        Object.entries(domain.competencies || {}).forEach(([compId, comp]) => {
          // Check KSA references
          comp.knowledge?.forEach((k: string) => {
            if (!ksaIds.knowledgeIds.includes(k)) {
              issues.push(`Domain ${domainId}.${compId}: Unknown knowledge code ${k}`)
            }
          })
          comp.skills?.forEach((s: string) => {
            if (!ksaIds.skillIds.includes(s)) {
              issues.push(`Domain ${domainId}.${compId}: Unknown skill code ${s}`)
            }
          })
          comp.attitudes?.forEach((a: string) => {
            if (!ksaIds.attitudeIds.includes(a)) {
              issues.push(`Domain ${domainId}.${compId}: Unknown attitude code ${a}`)
            }
          })
        })
      })
    } catch (error) {
      issues.push(`Failed to validate domains: ${error}`)
    }

    // Similar checks for assessment and PBL files...

    return {
      valid: issues.length === 0,
      issues
    }
  }

  /**
   * Generate language coverage report
   */
  generateLanguageCoverageReport(file: string, languages: string[]): Record<string, number> {
    const coverage: Record<string, number> = {}
    languages.forEach(lang => coverage[lang] = 0)

    try {
      const content = readFileSync(file, 'utf-8')
      const data = yaml.load(content) as Record<string, unknown>

      const checkObject = (obj: Record<string, unknown>, path: string = '') => {
        if (!obj || typeof obj !== 'object') return

        Object.entries(obj).forEach(([key, value]) => {
          // Check for language-specific fields
          languages.forEach(lang => {
            const suffix = lang === 'en' ? '' : `_${lang}`
            if (key.endsWith(suffix) && value) {
              coverage[lang]++
            }
          })

          // Recurse into nested objects
          if (typeof value === 'object' && !Array.isArray(value)) {
            checkObject(value as Record<string, unknown>, `${path}.${key}`)
          } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (typeof item === 'object' && item !== null) {
                checkObject(item as Record<string, unknown>, `${path}.${key}[${index}]`)
              }
            })
          }
        })
      }

      checkObject(data)
    } catch (error) {
      console.error(`Failed to analyze language coverage: ${error}`)
    }

    return coverage
  }
}