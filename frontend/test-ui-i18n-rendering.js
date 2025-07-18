#!/usr/bin/env node

/**
 * Test UI rendering and i18n across all stages of unified learning architecture
 * Tests 5 stages x 3 modes = 15 different flows
 */

const fs = require('fs').promises;
const path = require('path');

// Languages to test
const LANGUAGES = ['en', 'zhTW', 'zhCN', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it', 'pt', 'ar', 'id', 'th'];

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  languages: {},
  stages: {},
  errors: [],
  warnings: []
};

// Stages in unified learning architecture
const STAGES = [
  'list',      // Stage 1: Scenario list
  'detail',    // Stage 2: Scenario detail
  'learn',     // Stage 3: Learning/Task
  'complete',  // Stage 4: Completion
  'history'    // Stage 5: History view
];

// Modes
const MODES = ['pbl', 'assessment', 'discovery'];

/**
 * Test URL patterns for each mode and stage
 */
const URL_PATTERNS = {
  pbl: {
    list: '/pbl',
    detail: '/pbl/scenarios/{scenarioId}',
    learn: '/pbl/scenarios/{scenarioId}/program/{programId}/tasks/{taskId}/learn',
    complete: '/pbl/scenarios/{scenarioId}/program/{programId}/complete',
    history: '/pbl/history'
  },
  assessment: {
    list: '/assessment',
    detail: '/assessment/scenarios/{scenarioId}',
    learn: '/assessment/scenarios/{scenarioId}/programs/{programId}',
    complete: '/assessment/scenarios/{scenarioId}/programs/{programId}/complete',
    history: '/assessment/history'
  },
  discovery: {
    list: '/discovery',
    detail: '/discovery/scenarios/{scenarioId}',
    learn: '/discovery/scenarios/{scenarioId}/programs/{programId}/tasks/{taskId}',
    complete: '/discovery/scenarios/{scenarioId}/programs/{programId}/complete',
    history: '/discovery/history'
  }
};

/**
 * Check if a page component exists
 */
async function checkPageExists(mode, stage) {
  const pagePaths = {
    pbl: {
      list: 'src/app/pbl/page.tsx',
      detail: 'src/app/pbl/scenarios/[id]/page.tsx',
      learn: 'src/app/pbl/scenarios/[id]/programs/[programId]/tasks/[taskId]/page.tsx',
      complete: 'src/app/pbl/scenarios/[id]/programs/[programId]/complete/page.tsx',
      history: 'src/app/pbl/history/page.tsx'
    },
    assessment: {
      list: 'src/app/assessment/page.tsx',
      detail: 'src/app/assessment/scenarios/[id]/page.tsx',
      learn: 'src/app/assessment/scenarios/[id]/programs/[programId]/page.tsx',
      complete: 'src/app/assessment/scenarios/[id]/programs/[programId]/complete/page.tsx',
      history: 'src/app/assessment/history/page.tsx'
    },
    discovery: {
      list: 'src/app/discovery/page.tsx',
      detail: 'src/app/discovery/scenarios/[id]/page.tsx',
      learn: 'src/app/discovery/scenarios/[id]/programs/[programId]/tasks/[taskId]/page.tsx',
      complete: 'src/app/discovery/scenarios/[id]/programs/[programId]/complete/page.tsx',
      history: 'src/app/discovery/history/page.tsx'
    }
  };

  const pagePath = pagePaths[mode]?.[stage];
  if (!pagePath) return false;

  try {
    await fs.access(path.join(process.cwd(), pagePath));
    return true;
  } catch {
    return false;
  }
}

/**
 * Check i18n keys in a component
 */
async function checkI18nUsage(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Check for useTranslation hook
    const hasUseTranslation = content.includes('useTranslation');
    
    // Find all t() calls
    const tCalls = content.match(/t\(['"`]([^'"`]+)['"`]\)/g) || [];
    
    // Find all Trans components
    const transComponents = content.match(/<Trans[^>]*i18nKey=['"`]([^'"`]+)['"`]/g) || [];
    
    return {
      hasI18n: hasUseTranslation || transComponents.length > 0,
      translationKeys: tCalls.map(call => call.match(/t\(['"`]([^'"`]+)['"`]\)/)[1]),
      transKeys: transComponents.map(comp => comp.match(/i18nKey=['"`]([^'"`]+)['"`]/)[1])
    };
  } catch (error) {
    return {
      hasI18n: false,
      translationKeys: [],
      transKeys: [],
      error: error.message
    };
  }
}

/**
 * Check if translation files exist for all languages
 */
async function checkTranslationFiles() {
  const results = {};
  
  for (const lang of LANGUAGES) {
    const commonPath = path.join(process.cwd(), 'public/locales', lang, 'common.json');
    try {
      const content = await fs.readFile(commonPath, 'utf8');
      const translations = JSON.parse(content);
      results[lang] = {
        exists: true,
        keyCount: Object.keys(translations).length,
        sampleKeys: Object.keys(translations).slice(0, 5)
      };
    } catch (error) {
      results[lang] = {
        exists: false,
        error: error.message
      };
    }
  }
  
  return results;
}

/**
 * Check API routes for i18n support
 */
async function checkAPIi18n(mode) {
  const apiPaths = {
    pbl: [
      'src/app/api/pbl/scenarios/route.ts',
      'src/app/api/pbl/chat/route.ts'
    ],
    assessment: [
      'src/app/api/assessment/scenarios/route.ts',
      'src/app/api/assessment/programs/[programId]/route.ts'
    ],
    discovery: [
      'src/app/api/discovery/scenarios/route.ts',
      'src/app/api/discovery/generate-report/route.ts'
    ]
  };

  const results = {};
  
  for (const apiPath of (apiPaths[mode] || [])) {
    try {
      const content = await fs.readFile(path.join(process.cwd(), apiPath), 'utf8');
      const hasLangParam = content.includes('lang') || content.includes('language');
      const hasTranslation = content.includes('getTranslatedField') || content.includes('translate');
      
      results[apiPath] = {
        exists: true,
        hasLanguageSupport: hasLangParam || hasTranslation,
        patterns: {
          langParam: hasLangParam,
          translationFunction: hasTranslation
        }
      };
    } catch (error) {
      results[apiPath] = {
        exists: false,
        error: error.message
      };
    }
  }
  
  return results;
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🔍 Testing UI rendering and i18n across unified learning architecture\n');
  
  // Test 1: Check translation files
  console.log('1️⃣ Checking translation files...');
  testResults.translations = await checkTranslationFiles();
  
  const missingLangs = LANGUAGES.filter(lang => !testResults.translations[lang].exists);
  if (missingLangs.length > 0) {
    testResults.warnings.push(`Missing translation files for: ${missingLangs.join(', ')}`);
  }
  console.log(`   ✅ Found ${LANGUAGES.length - missingLangs.length}/${LANGUAGES.length} language files`);
  
  // Test 2: Check each mode and stage
  console.log('\n2️⃣ Checking pages for each mode and stage...\n');
  
  for (const mode of MODES) {
    console.log(`   📦 Mode: ${mode.toUpperCase()}`);
    testResults.stages[mode] = {};
    
    for (const stage of STAGES) {
      const exists = await checkPageExists(mode, stage);
      testResults.stages[mode][stage] = { exists };
      
      if (exists) {
        // Get the actual file path
        const pagePaths = {
          pbl: {
            list: 'src/app/pbl/page.tsx',
            detail: 'src/app/pbl/scenarios/[id]/page.tsx',
            learn: 'src/app/pbl/scenarios/[id]/programs/[programId]/tasks/[taskId]/page.tsx',
            complete: 'src/app/pbl/scenarios/[id]/programs/[programId]/complete/page.tsx',
            history: 'src/app/pbl/history/page.tsx'
          },
          assessment: {
            list: 'src/app/assessment/page.tsx',
            detail: 'src/app/assessment/scenarios/[id]/page.tsx',
            learn: 'src/app/assessment/scenarios/[id]/programs/[programId]/page.tsx',
            complete: 'src/app/assessment/scenarios/[id]/programs/[programId]/complete/page.tsx',
            history: 'src/app/assessment/history/page.tsx'
          },
          discovery: {
            list: 'src/app/discovery/page.tsx',
            detail: 'src/app/discovery/scenarios/[id]/page.tsx',
            learn: 'src/app/discovery/scenarios/[id]/programs/[programId]/tasks/[taskId]/page.tsx',
            complete: 'src/app/discovery/scenarios/[id]/programs/[programId]/complete/page.tsx',
            history: 'src/app/discovery/history/page.tsx'
          }
        };
        
        const filePath = path.join(process.cwd(), pagePaths[mode][stage]);
        const i18nInfo = await checkI18nUsage(filePath);
        testResults.stages[mode][stage].i18n = i18nInfo;
        
        const status = i18nInfo.hasI18n ? '✅' : '⚠️';
        console.log(`      ${status} Stage ${STAGES.indexOf(stage) + 1}: ${stage} - ${exists ? 'Found' : 'Missing'} ${i18nInfo.hasI18n ? '(with i18n)' : '(no i18n)'}`);
      } else {
        console.log(`      ❌ Stage ${STAGES.indexOf(stage) + 1}: ${stage} - Missing`);
        testResults.errors.push(`Missing page: ${mode}/${stage}`);
      }
    }
    
    // Check API i18n support
    console.log(`      🔌 Checking API routes...`);
    testResults.stages[mode].api = await checkAPIi18n(mode);
  }
  
  // Test 3: Generate summary
  console.log('\n3️⃣ Summary Report\n');
  
  // Count pages with i18n
  let totalPages = 0;
  let pagesWithI18n = 0;
  let missingPages = 0;
  
  for (const mode of MODES) {
    for (const stage of STAGES) {
      totalPages++;
      if (testResults.stages[mode][stage].exists) {
        if (testResults.stages[mode][stage].i18n?.hasI18n) {
          pagesWithI18n++;
        }
      } else {
        missingPages++;
      }
    }
  }
  
  console.log(`   📊 Page Coverage:`);
  console.log(`      - Total expected pages: ${totalPages}`);
  console.log(`      - Existing pages: ${totalPages - missingPages}`);
  console.log(`      - Pages with i18n: ${pagesWithI18n}`);
  console.log(`      - Missing pages: ${missingPages}`);
  
  console.log(`\n   🌐 Language Support:`);
  console.log(`      - Languages configured: ${LANGUAGES.length}`);
  console.log(`      - Translation files found: ${LANGUAGES.length - missingLangs.length}`);
  
  if (testResults.errors.length > 0) {
    console.log(`\n   ❌ Errors:`);
    testResults.errors.forEach(error => console.log(`      - ${error}`));
  }
  
  if (testResults.warnings.length > 0) {
    console.log(`\n   ⚠️  Warnings:`);
    testResults.warnings.forEach(warning => console.log(`      - ${warning}`));
  }
  
  // Save detailed report
  const reportPath = path.join(process.cwd(), 'ui-i18n-test-report.json');
  await fs.writeFile(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Detailed report saved to: ui-i18n-test-report.json`);
  
  // Generate recommendations
  console.log('\n4️⃣ Recommendations:\n');
  
  if (missingPages > 0) {
    console.log('   🔧 Missing Pages:');
    for (const mode of MODES) {
      for (const stage of STAGES) {
        if (!testResults.stages[mode][stage].exists) {
          console.log(`      - Create ${mode}/${stage} page`);
        }
      }
    }
  }
  
  if (pagesWithI18n < totalPages - missingPages) {
    console.log('\n   🌐 Add i18n to pages without internationalization:');
    for (const mode of MODES) {
      for (const stage of STAGES) {
        if (testResults.stages[mode][stage].exists && !testResults.stages[mode][stage].i18n?.hasI18n) {
          console.log(`      - Add useTranslation to ${mode}/${stage}`);
        }
      }
    }
  }
}

// Run tests
runTests().catch(console.error);