#!/usr/bin/env node

/**
 * Script to analyze test-API mismatches
 * Identifies tests that expect different API structures than actual implementations
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface Mismatch {
  testFile: string;
  apiFile: string;
  issues: string[];
}

const mismatches: Mismatch[] = [];

// Known API structure mismatches
const knownMismatches = [
  {
    pattern: /expect\(.*\)\.toHaveProperty\(['"]status['"]/,
    apiReturns: 'health',
    description: 'Test expects "status" but API returns "health"'
  },
  {
    pattern: /expect\(.*\.services\)/,
    apiReturns: 'No services object',
    description: 'Test expects "services" object that doesn\'t exist'
  },
  {
    pattern: /mockScenarioRepo\.findByMode/,
    apiReturns: 'Method may not exist',
    description: 'Mock expects findByMode method'
  }
];

// Find all test files
const findTestFiles = (dir: string): string[] => {
  const files: string[] = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...findTestFiles(fullPath));
    } else if (item.endsWith('.test.ts') || item.endsWith('.test.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
};

// Analyze a test file for mismatches
const analyzeTestFile = (testFile: string) => {
  const content = fs.readFileSync(testFile, 'utf-8');
  const issues: string[] = [];
  
  // Check for known mismatches
  knownMismatches.forEach(({ pattern, description }) => {
    if (pattern.test(content)) {
      issues.push(description);
    }
  });
  
  // Try to find the corresponding API file
  let apiFile = '';
  const routeMatch = testFile.match(/app\/api\/(.*)__tests__\/route\.test\.ts/);
  if (routeMatch) {
    apiFile = testFile.replace('__tests__/route.test.ts', 'route.ts');
  }
  
  if (issues.length > 0) {
    mismatches.push({
      testFile: path.relative(process.cwd(), testFile),
      apiFile: apiFile ? path.relative(process.cwd(), apiFile) : 'Unknown',
      issues
    });
  }
};

// Main execution
console.log('🔍 Analyzing test-API mismatches...\n');

const testFiles = findTestFiles(path.join(process.cwd(), 'src'));
console.log(`Found ${testFiles.length} test files\n`);

testFiles.forEach(analyzeTestFile);

if (mismatches.length === 0) {
  console.log('✅ No mismatches found!');
} else {
  console.log(`Found ${mismatches.length} files with potential mismatches:\n`);
  
  mismatches.forEach(({ testFile, apiFile, issues }) => {
    console.log(`📄 ${testFile}`);
    if (apiFile !== 'Unknown') {
      console.log(`   API: ${apiFile}`);
    }
    issues.forEach(issue => {
      console.log(`   ❌ ${issue}`);
    });
    console.log('');
  });
  
  // Generate fix suggestions
  console.log('\n📝 Fix suggestions:\n');
  
  const statusMismatches = mismatches.filter(m => 
    m.issues.some(i => i.includes('"status"'))
  );
  
  if (statusMismatches.length > 0) {
    console.log('1. For "status" vs "health" mismatches:');
    console.log('   - Update tests to expect "health" instead of "status"');
    console.log('   - Or update APIs to return "status" for consistency\n');
  }
  
  const servicesMismatches = mismatches.filter(m => 
    m.issues.some(i => i.includes('services'))
  );
  
  if (servicesMismatches.length > 0) {
    console.log('2. For missing "services" object:');
    console.log('   - Remove service expectations from tests');
    console.log('   - Or implement services object in API responses\n');
  }
}

// Export findings to JSON for further processing
const outputPath = path.join(process.cwd(), 'test-api-mismatches.json');
fs.writeFileSync(outputPath, JSON.stringify(mismatches, null, 2));
console.log(`\n💾 Detailed report saved to: ${outputPath}`);