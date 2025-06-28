#!/usr/bin/env node

/**
 * CLI script to validate content files
 * Usage: npm run validate-content
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { contentValidator } from '../src/lib/validation/content-validator'

interface FileToValidate {
  path: string
  type: 'ksa' | 'domains' | 'assessment' | 'pbl'
  name: string
}

const contentFiles: FileToValidate[] = [
  {
    path: 'public/rubrics_data/ksa_codes.yaml',
    type: 'ksa',
    name: 'KSA Codes'
  },
  {
    path: 'public/rubrics_data/ai_lit_domains.yaml',
    type: 'domains',
    name: 'AI Literacy Domains'
  },
  {
    path: 'public/assessment_data/ai_literacy_questions.yaml',
    type: 'assessment',
    name: 'Assessment Questions'
  },
  {
    path: 'public/pbl_data/ai_job_search_scenario.yaml',
    type: 'pbl',
    name: 'PBL Job Search Scenario'
  }
]

async function validateAllContent() {
  console.log('🔍 Starting content validation...\n')
  
  let hasErrors = false
  const results: Array<{ file: string; valid: boolean; errors: number; warnings: number }> = []

  // First, load KSA codes for cross-reference validation
  console.log('📚 Loading KSA codes for reference validation...')
  try {
    const ksaContent = readFileSync(join(process.cwd(), contentFiles[0].path), 'utf-8')
    await contentValidator.validateKSACodes(ksaContent)
    console.log('✅ KSA codes loaded successfully\n')
  } catch (error) {
    console.error('❌ Failed to load KSA codes:', error)
    console.error('   Cross-reference validation will be skipped\n')
  }

  // Validate each file
  for (const file of contentFiles) {
    console.log(`📄 Validating ${file.name}...`)
    console.log(`   Path: ${file.path}`)
    
    try {
      const content = readFileSync(join(process.cwd(), file.path), 'utf-8')
      const result = await contentValidator.validateContent(content, file.type)
      
      if (result.valid) {
        console.log('   ✅ Valid')
        if (result.warnings && result.warnings.length > 0) {
          console.log(`   ⚠️  ${result.warnings.length} warning(s):`)
          result.warnings.forEach(w => {
            console.log(`      - ${w.message}`)
          })
        }
      } else {
        console.log(`   ❌ Invalid - ${result.errors.length} error(s):`)
        result.errors.forEach(err => {
          if (err.path) {
            console.log(`      - ${err.path}: ${err.message}`)
          } else {
            console.log(`      - ${err.message}`)
          }
        })
        hasErrors = true
      }
      
      results.push({
        file: file.name,
        valid: result.valid,
        errors: result.errors.length,
        warnings: result.warnings?.length || 0
      })
      
    } catch (error) {
      console.log(`   ❌ Failed to read file: ${error}`)
      hasErrors = true
      results.push({
        file: file.name,
        valid: false,
        errors: 1,
        warnings: 0
      })
    }
    
    console.log()
  }

  // Summary
  console.log('📊 Validation Summary:')
  console.log('═'.repeat(60))
  console.log('File'.padEnd(30) + 'Status'.padEnd(10) + 'Errors'.padEnd(10) + 'Warnings')
  console.log('─'.repeat(60))
  
  results.forEach(r => {
    const status = r.valid ? '✅ Valid' : '❌ Invalid'
    console.log(
      r.file.padEnd(30) + 
      status.padEnd(10) + 
      r.errors.toString().padEnd(10) + 
      r.warnings.toString()
    )
  })
  
  console.log('═'.repeat(60))
  
  if (hasErrors) {
    console.log('\n❌ Validation failed! Please fix the errors above.')
    process.exit(1)
  } else {
    console.log('\n✅ All content files are valid!')
  }
}

// Run validation
validateAllContent().catch(error => {
  console.error('Unexpected error:', error)
  process.exit(1)
})