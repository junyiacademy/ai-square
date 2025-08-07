#!/usr/bin/env node
/**
 * Fix D3 Mock Issues Script
 * Automatically fixes TypeScript errors in D3 mocks across all test files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all test files with D3 mock issues
function findFilesWithD3Mocks() {
  try {
    const result = execSync('grep -r "arc.innerRadius\\|arc.outerRadius\\|pie.value" --include="*.ts" --include="*.tsx" src/', { encoding: 'utf8' });
    const lines = result.trim().split('\n');
    const files = [...new Set(lines.map(line => line.split(':')[0]))];
    console.log(`Found ${files.length} files with D3 mock issues:`, files);
    return files;
  } catch (error) {
    console.log('No D3 mock issues found or error:', error.message);
    return [];
  }
}

// Fix D3 mock in a single file
function fixD3MockInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Fix arc innerRadius and outerRadius
    if (content.includes('arc.innerRadius = jest.fn()')) {
      content = content.replace(/arc\.innerRadius = jest\.fn\(\)\.mockReturnThis\(\);/g, '');
      content = content.replace(/arc\.outerRadius = jest\.fn\(\)\.mockReturnThis\(\);/g, '');
      content = content.replace(
        /arc: jest\.fn\(\(\) => \{\s*const arc = jest\.fn\(\);\s*return arc;\s*\}\),/g,
        `arc: jest.fn(() => {
    const arcFn = jest.fn();
    Object.assign(arcFn, {
      innerRadius: jest.fn().mockReturnThis(),
      outerRadius: jest.fn().mockReturnThis()
    });
    return arcFn;
  }),`
      );
      changed = true;
    }

    // Fix pie value
    if (content.includes('pie.value = jest.fn()')) {
      content = content.replace(/pie\.value = jest\.fn\(\)\.mockReturnThis\(\);/g, '');
      content = content.replace(
        /pie: jest\.fn\(\(\) => \{\s*const pie = jest\.fn\(\([^)]*\) => [^;]*\);\s*return pie;\s*\}\),/g,
        `pie: jest.fn(() => {
    const pieFn = jest.fn((data) => data.map((d, i) => ({ data: d, index: i })));
    Object.assign(pieFn, {
      value: jest.fn().mockReturnThis()
    });
    return pieFn;
  }),`
      );
      changed = true;
    }

    // Fix parameter types
    const parameterFixes = [
      { from: /(value\)) => value/g, to: '(value: unknown) => value' },
      { from: /(data\)) => data/g, to: '(data: unknown[]) => data' },
      { from: /map\(\(d, i\) => /g, to: 'map((d: unknown, i: number) => ' },
      { from: /jest\.fn\(\(([^)]*)\) => /g, to: 'jest.fn(($1: unknown) => ' }
    ];

    parameterFixes.forEach(fix => {
      if (content.includes(fix.from.source || fix.from)) {
        content = content.replace(fix.from, fix.to);
        changed = true;
      }
    });

    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Fixed ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
function main() {
  console.log('🔧 Fixing D3 mock issues...');
  
  const files = findFilesWithD3Mocks();
  if (files.length === 0) {
    console.log('No files found with D3 mock issues.');
    return;
  }

  let fixedCount = 0;
  files.forEach(file => {
    if (fixD3MockInFile(file)) {
      fixedCount++;
    }
  });

  console.log(`\n✅ Fixed ${fixedCount}/${files.length} files`);
  
  // Run TypeScript check to see if errors are fixed
  try {
    console.log('\n🔍 Running TypeScript check...');
    execSync('npx tsc --noEmit 2>&1 | grep -c "innerRadius\\|outerRadius\\|\\.value"', { encoding: 'utf8' });
  } catch (error) {
    const remaining = error.stdout ? error.stdout.trim() : '0';
    console.log(`Remaining D3 property errors: ${remaining}`);
  }
}

if (require.main === module) {
  main();
}