/**
 * Content validation report generator
 * Produces human-readable validation reports
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import * as yaml from 'js-yaml'
import { extractKSAIdsFromFlexible } from './schemas/ksa-codes-flexible.schema'

interface ContentStats {
  fileName: string
  fileType: string
  totalItems: number
  details: Record<string, any>
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
        const data = yaml.load(content) as any

        let totalItems = 0
        const details: Record<string, any> = {}

        switch (file.type) {
          case 'ksa':
            const ksaIds = extractKSAIdsFromFlexible(data)
            totalItems = ksaIds.knowledgeIds.length + ksaIds.skillIds.length + ksaIds.attitudeIds.length
            details.knowledge = ksaIds.knowledgeIds.length
            details.skills = ksaIds.skillIds.length
            details.attitudes = ksaIds.attitudeIds.length
            details.themes = {
              knowledge: Object.keys(data.knowledge_codes?.themes || {}).length,
              skills: Object.keys(data.skills_codes?.themes || {}).length,
              attitudes: Object.keys(data.attitudes_codes?.themes || {}).length
            }
            break

          case 'domains':
            const domains = data.domains || {}
            Object.entries(domains).forEach(([domainId, domain]: [string, any]) => {
              const competencies = Object.keys(domain.competencies || {})
              details[domainId] = competencies.length
              totalItems += competencies.length
            })
            break

          case 'assessment':
            totalItems = data.questions?.length || 0
            details.totalQuestions = totalItems
            details.byDomain = {}
            details.byDifficulty = {}
            
            data.questions?.forEach((q: any) => {
              details.byDomain[q.domain] = (details.byDomain[q.domain] || 0) + 1
              details.byDifficulty[q.difficulty] = (details.byDifficulty[q.difficulty] || 0) + 1
            })
            break

          case 'pbl':
            totalItems = data.stages?.length || 0
            details.stages = totalItems
            details.totalDuration = data.scenario_info?.estimated_duration || 0
            details.tasks = 0
            data.stages?.forEach((stage: any) => {
              details.tasks += stage.tasks?.length || 0
            })
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
      const domainsData = yaml.load(domainsContent) as any

      Object.entries(domainsData.domains || {}).forEach(([domainId, domain]: [string, any]) => {
        Object.entries(domain.competencies || {}).forEach(([compId, comp]: [string, any]) => {
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
      const data = yaml.load(content) as any

      const checkObject = (obj: any, path: string = '') => {
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
            checkObject(value, `${path}.${key}`)
          } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (typeof item === 'object') {
                checkObject(item, `${path}.${key}[${index}]`)
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