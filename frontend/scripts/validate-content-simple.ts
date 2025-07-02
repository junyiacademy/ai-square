#!/usr/bin/env node

/**
 * Simple content validation script
 * Focuses on practical validation rather than strict schema compliance
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import * as yaml from 'js-yaml'
import { extractKSAIdsFromFlexible } from '../src/lib/validation/schemas/ksa-codes-flexible.schema'
import { ValidationReporter } from '../src/lib/validation/validation-report'

const SUPPORTED_LANGUAGES = ['en', 'zhTW', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it', 'zhCN', 'pt', 'ar', 'id', 'th']

interface ValidationIssue {
  type: 'error' | 'warning'
  file: string
  message: string
}

const issues: ValidationIssue[] = []

function addIssue(type: 'error' | 'warning', file: string, message: string) {
  issues.push({ type, file, message })
}

async function validateContent() {
  console.log('🔍 Content Validation Report\n')
  console.log('This validation focuses on practical issues that affect functionality.\n')

  const reporter = new ValidationReporter()

  // Step 1: Load and analyze KSA codes
  console.log('📚 Step 1: Analyzing KSA Codes...')
  let ksaIds: { knowledgeIds: string[], skillIds: string[], attitudeIds: string[] } = {
    knowledgeIds: [],
    skillIds: [],
    attitudeIds: []
  }

  try {
    const ksaContent = readFileSync(join(process.cwd(), 'public/rubrics_data/ksa_codes.yaml'), 'utf-8')
    const ksaData = yaml.load(ksaContent) as any
    ksaIds = extractKSAIdsFromFlexible(ksaData)
    
    console.log(`✅ Found ${ksaIds.knowledgeIds.length} knowledge codes`)
    console.log(`✅ Found ${ksaIds.skillIds.length} skill codes`)
    console.log(`✅ Found ${ksaIds.attitudeIds.length} attitude codes`)

    // Check for typos
    if (ksaData.knowledge_codes?.desciption) {
      addIssue('warning', 'ksa_codes.yaml', 'Typo: "desciption" should be "description"')
    }
  } catch (error) {
    addIssue('error', 'ksa_codes.yaml', `Failed to load: ${error}`)
  }

  // Step 2: Validate domains
  console.log('\n📋 Step 2: Analyzing Domains...')
  const domainCompetencies: Record<string, string[]> = {}
  
  try {
    const domainsContent = readFileSync(join(process.cwd(), 'public/rubrics_data/ai_lit_domains.yaml'), 'utf-8')
    const domainsData = yaml.load(domainsContent) as any
    
    let totalCompetencies = 0
    Object.entries(domainsData.domains || {}).forEach(([domainId, domain]: [string, any]) => {
      const competencies = Object.keys(domain.competencies || {})
      domainCompetencies[domainId] = competencies
      totalCompetencies += competencies.length
      
      // Check KSA references
      competencies.forEach(compId => {
        const comp = domain.competencies[compId]
        const invalidKnowledge = comp.knowledge?.filter((k: string) => !ksaIds.knowledgeIds.includes(k)) || []
        const invalidSkills = comp.skills?.filter((s: string) => !ksaIds.skillIds.includes(s)) || []
        const invalidAttitudes = comp.attitudes?.filter((a: string) => !ksaIds.attitudeIds.includes(a)) || []
        
        if (invalidKnowledge.length > 0) {
          addIssue('error', 'ai_lit_domains.yaml', `${domainId}.${compId}: Invalid knowledge codes: ${invalidKnowledge.join(', ')}`)
        }
        if (invalidSkills.length > 0) {
          addIssue('error', 'ai_lit_domains.yaml', `${domainId}.${compId}: Invalid skill codes: ${invalidSkills.join(', ')}`)
        }
        if (invalidAttitudes.length > 0) {
          addIssue('error', 'ai_lit_domains.yaml', `${domainId}.${compId}: Invalid attitude codes: ${invalidAttitudes.join(', ')}`)
        }
      })
    })
    
    console.log(`✅ Found ${Object.keys(domainCompetencies).length} domains with ${totalCompetencies} total competencies`)
    Object.entries(domainCompetencies).forEach(([domain, comps]) => {
      console.log(`   - ${domain}: ${comps.length} competencies`)
    })
  } catch (error) {
    addIssue('error', 'ai_lit_domains.yaml', `Failed to load: ${error}`)
  }

  // Step 3: Validate assessment questions
  console.log('\n📝 Step 3: Analyzing Assessment Questions...')
  try {
    const assessmentContent = readFileSync(join(process.cwd(), 'public/assessment_data/ai_literacy_questions.yaml'), 'utf-8')
    const assessmentData = yaml.load(assessmentContent) as any
    
    const questions = assessmentData.questions || []
    const questionsByDomain: Record<string, number> = {}
    const questionsByDifficulty: Record<string, number> = {}
    
    interface Question {
      id: string;
      domain: string;
      difficulty: string;
      ksa_codes?: {
        knowledge?: string[];
        skills?: string[];
        attitudes?: string[];
      };
    }
    
    questions.forEach((q: Question) => {
      questionsByDomain[q.domain] = (questionsByDomain[q.domain] || 0) + 1
      questionsByDifficulty[q.difficulty] = (questionsByDifficulty[q.difficulty] || 0) + 1
      
      // Validate domain exists
      if (!domainCompetencies[q.domain]) {
        addIssue('error', 'ai_literacy_questions.yaml', `Question ${q.id}: Invalid domain ${q.domain}`)
      }
      
      // Check KSA mappings
      if (q.ksa_codes) {
        const invalidK = q.ksa_codes.knowledge?.filter((k: string) => !ksaIds.knowledgeIds.includes(k)) || []
        const invalidS = q.ksa_codes.skills?.filter((s: string) => !ksaIds.skillIds.includes(s)) || []
        const invalidA = q.ksa_codes.attitudes?.filter((a: string) => !ksaIds.attitudeIds.includes(a)) || []
        
        if (invalidK.length > 0) {
          addIssue('error', 'ai_literacy_questions.yaml', `Question ${q.id}: Invalid knowledge codes: ${invalidK.join(', ')}`)
        }
        if (invalidS.length > 0) {
          addIssue('error', 'ai_literacy_questions.yaml', `Question ${q.id}: Invalid skill codes: ${invalidS.join(', ')}`)
        }
        if (invalidA.length > 0) {
          addIssue('error', 'ai_literacy_questions.yaml', `Question ${q.id}: Invalid attitude codes: ${invalidA.join(', ')}`)
        }
      }
    })
    
    console.log(`✅ Found ${questions.length} questions`)
    console.log('   By domain:')
    Object.entries(questionsByDomain).forEach(([domain, count]) => {
      console.log(`   - ${domain}: ${count} questions`)
    })
    console.log('   By difficulty:')
    Object.entries(questionsByDifficulty).forEach(([difficulty, count]) => {
      console.log(`   - ${difficulty}: ${count} questions`)
    })
    
    // Check question distribution matches config
    const expectedTotal = assessmentData.assessment_config?.total_questions
    if (expectedTotal && questions.length !== expectedTotal) {
      addIssue('warning', 'ai_literacy_questions.yaml', `Total questions (${questions.length}) doesn't match config (${expectedTotal})`)
    }
  } catch (error) {
    addIssue('error', 'ai_literacy_questions.yaml', `Failed to load: ${error}`)
  }

  // Step 4: Validate PBL scenarios
  console.log('\n🎯 Step 4: Analyzing PBL Scenarios...')
  try {
    const pblContent = readFileSync(join(process.cwd(), 'public/pbl_data/ai_job_search_scenario.yaml'), 'utf-8')
    const pblData = yaml.load(pblContent) as any
    
    const stages = pblData.stages || []
    let totalTasks = 0
    let totalDuration = 0
    
    interface Stage {
      tasks?: unknown[];
      duration?: number;
    }
    
    stages.forEach((stage: Stage) => {
      totalTasks += stage.tasks?.length || 0
      totalDuration += stage.duration || 0
    })
    
    console.log(`✅ Found ${stages.length} stages with ${totalTasks} total tasks`)
    console.log(`   Total duration: ${totalDuration} minutes`)
    
    // Check KSA mappings
    if (pblData.ksa_mapping) {
      const invalidK = pblData.ksa_mapping.knowledge?.filter((k: string) => !ksaIds.knowledgeIds.includes(k)) || []
      const invalidS = pblData.ksa_mapping.skills?.filter((s: string) => !ksaIds.skillIds.includes(s)) || []
      const invalidA = pblData.ksa_mapping.attitudes?.filter((a: string) => !ksaIds.attitudeIds.includes(a)) || []
      
      if (invalidK.length > 0) {
        addIssue('error', 'ai_job_search_scenario.yaml', `Invalid knowledge codes: ${invalidK.join(', ')}`)
      }
      if (invalidS.length > 0) {
        addIssue('error', 'ai_job_search_scenario.yaml', `Invalid skill codes: ${invalidS.join(', ')}`)
      }
      if (invalidA.length > 0) {
        addIssue('error', 'ai_job_search_scenario.yaml', `Invalid attitude codes: ${invalidA.join(', ')}`)
      }
    }
    
    // Check duration consistency
    const estimatedDuration = pblData.scenario_info?.estimated_duration
    if (estimatedDuration && Math.abs(totalDuration - estimatedDuration) > estimatedDuration * 0.1) {
      addIssue('warning', 'ai_job_search_scenario.yaml', 
        `Stage durations (${totalDuration}min) differ from estimated (${estimatedDuration}min) by more than 10%`)
    }
  } catch (error) {
    addIssue('error', 'ai_job_search_scenario.yaml', `Failed to load: ${error}`)
  }

  // Step 5: Language coverage check
  console.log('\n🌐 Step 5: Checking Language Coverage...')
  const files = [
    'public/rubrics_data/ai_lit_domains.yaml',
    'public/assessment_data/ai_literacy_questions.yaml',
    'public/pbl_data/ai_job_search_scenario.yaml'
  ]
  
  files.forEach(file => {
    const coverage = reporter.generateLanguageCoverageReport(join(process.cwd(), file), SUPPORTED_LANGUAGES)
    const fileName = file.split('/').pop()
    console.log(`\n   ${fileName}:`)
    
    const maxFields = Math.max(...Object.values(coverage))
    Object.entries(coverage).forEach(([lang, count]) => {
      const percentage = maxFields > 0 ? Math.round((count / maxFields) * 100) : 0
      const bar = '█'.repeat(Math.round(percentage / 10)) + '░'.repeat(10 - Math.round(percentage / 10))
      console.log(`   ${lang}: ${bar} ${percentage}% (${count} fields)`)
    })
  })

  // Final summary
  console.log('\n' + '═'.repeat(60))
  console.log('📊 Validation Summary')
  console.log('═'.repeat(60))
  
  const errors = issues.filter(i => i.type === 'error')
  const warnings = issues.filter(i => i.type === 'warning')
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All content files are valid!')
  } else {
    if (errors.length > 0) {
      console.log(`\n❌ ${errors.length} Error(s):`)
      errors.forEach(e => {
        console.log(`   - [${e.file}] ${e.message}`)
      })
    }
    
    if (warnings.length > 0) {
      console.log(`\n⚠️  ${warnings.length} Warning(s):`)
      warnings.forEach(w => {
        console.log(`   - [${w.file}] ${w.message}`)
      })
    }
  }
  
  console.log('\n' + '═'.repeat(60))
  
  // Exit with error code if there are errors
  if (errors.length > 0) {
    process.exit(1)
  }
}

// Run validation
validateContent().catch(error => {
  console.error('Unexpected error:', error)
  process.exit(1)
})