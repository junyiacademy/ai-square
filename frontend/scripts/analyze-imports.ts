#!/usr/bin/env tsx

/**
 * 分析專案中的導入並提供優化建議
 */

import * as fs from 'fs/promises'
import * as path from 'path'

interface ImportAnalysis {
  file: string
  imports: {
    module: string
    type: 'default' | 'named' | 'namespace'
    members?: string[]
  }[]
}

interface OptimizationSuggestion {
  module: string
  currentSize?: number
  suggestion: string
  priority: 'high' | 'medium' | 'low'
}

// 已知的大型套件
const LARGE_PACKAGES = {
  'recharts': { size: 500, alternative: 'Use dynamic imports' },
  'd3': { size: 600, alternative: 'Import specific modules' },
  '@sentry/nextjs': { size: 400, alternative: 'Lazy load in production only' },
  'react-markdown': { size: 200, alternative: 'Use dynamic import' },
  '@monaco-editor/react': { size: 1000, alternative: 'Load only when needed' },
  'chart.js': { size: 300, alternative: 'Use lightweight alternative' },
}

async function analyzeFile(filePath: string): Promise<ImportAnalysis | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const imports: ImportAnalysis['imports'] = []
    
    // 匹配 import 語句
    const importRegex = /import\s+(?:(\*\s+as\s+\w+)|({[^}]+})|(\w+))?\s*(?:,\s*({[^}]+}))?\s*from\s*['"]([^'"]+)['"]/g
    let match
    
    while ((match = importRegex.exec(content)) !== null) {
      const [, namespace, namedImports1, defaultImport, namedImports2, module] = match
      
      if (namespace) {
        imports.push({ module, type: 'namespace' })
      } else if (defaultImport) {
        imports.push({ module, type: 'default' })
      }
      
      const namedImports = namedImports1 || namedImports2
      if (namedImports) {
        const members = namedImports
          .replace(/[{}]/g, '')
          .split(',')
          .map(m => m.trim())
          .filter(Boolean)
        imports.push({ module, type: 'named', members })
      }
    }
    
    return imports.length > 0 ? { file: filePath, imports } : null
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error)
    return null
  }
}

async function findAllTypeScriptFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    
    // 跳過 node_modules 和 .next
    if (entry.name === 'node_modules' || entry.name === '.next') {
      continue
    }
    
    if (entry.isDirectory()) {
      files.push(...await findAllTypeScriptFiles(fullPath))
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath)
    }
  }
  
  return files
}

function generateOptimizationSuggestions(analyses: ImportAnalysis[]): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []
  const moduleUsage = new Map<string, number>()
  
  // 統計模組使用次數
  for (const analysis of analyses) {
    for (const imp of analysis.imports) {
      const count = moduleUsage.get(imp.module) || 0
      moduleUsage.set(imp.module, count + 1)
    }
  }
  
  // 檢查大型套件
  for (const [module, usage] of moduleUsage.entries()) {
    const packageName = module.split('/')[0]
    const packageInfo = LARGE_PACKAGES[packageName as keyof typeof LARGE_PACKAGES]
    
    if (packageInfo) {
      suggestions.push({
        module: packageName,
        currentSize: packageInfo.size,
        suggestion: `${packageInfo.alternative} (used in ${usage} files)`,
        priority: packageInfo.size > 500 ? 'high' : 'medium'
      })
    }
  }
  
  // 檢查可能的重複導入
  for (const analysis of analyses) {
    const imports = analysis.imports
    const moduleCount = new Map<string, number>()
    
    for (const imp of imports) {
      const count = moduleCount.get(imp.module) || 0
      moduleCount.set(imp.module, count + 1)
      
      if (count > 0) {
        suggestions.push({
          module: imp.module,
          suggestion: `Duplicate import in ${analysis.file}`,
          priority: 'low'
        })
      }
    }
  }
  
  return suggestions
}

async function main() {
  console.log('🔍 Analyzing imports in the project...\n')
  
  const srcDir = path.join(process.cwd(), 'src')
  const files = await findAllTypeScriptFiles(srcDir)
  
  console.log(`Found ${files.length} TypeScript files\n`)
  
  const analyses: ImportAnalysis[] = []
  for (const file of files) {
    const analysis = await analyzeFile(file)
    if (analysis) {
      analyses.push(analysis)
    }
  }
  
  const suggestions = generateOptimizationSuggestions(analyses)
  
  // 按優先級排序
  suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
  
  // 顯示建議
  console.log('📊 Optimization Suggestions:\n')
  
  const uniqueSuggestions = new Map<string, OptimizationSuggestion>()
  for (const suggestion of suggestions) {
    const key = `${suggestion.module}-${suggestion.suggestion}`
    if (!uniqueSuggestions.has(key)) {
      uniqueSuggestions.set(key, suggestion)
    }
  }
  
  for (const [, suggestion] of uniqueSuggestions) {
    const icon = suggestion.priority === 'high' ? '🔴' : suggestion.priority === 'medium' ? '🟡' : '🟢'
    console.log(`${icon} ${suggestion.module}`)
    if (suggestion.currentSize) {
      console.log(`   Size: ~${suggestion.currentSize}KB`)
    }
    console.log(`   ${suggestion.suggestion}\n`)
  }
  
  // 顯示總結
  console.log('\n📈 Summary:')
  console.log(`   Total files analyzed: ${analyses.length}`)
  console.log(`   Unique modules imported: ${new Set(analyses.flatMap(a => a.imports.map(i => i.module))).size}`)
  console.log(`   Optimization opportunities: ${uniqueSuggestions.size}`)
}

main().catch(console.error)