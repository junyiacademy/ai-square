#!/usr/bin/env node
/**
 * Fix TypeScript implicit 'any' type errors
 */

const fs = require('fs');
const { execSync } = require('child_process');

function getFilesWithImplicitAny() {
  try {
    const result = execSync(`npx tsc --noEmit 2>&1 | grep "implicitly has an 'any' type"`, { encoding: 'utf8' });
    const lines = result.trim().split('\n');
    const files = [...new Set(lines.map(line => line.split('(')[0]))];
    return files;
  } catch (error) {
    console.log('No implicit any errors found');
    return [];
  }
}

function fixImplicitAnyInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Fix common parameter patterns
    const fixes = [
      // Scale functions
      { from: /const scale = \(value\) => value;/g, to: 'const scale = (value: unknown) => value;' },
      
      // Map functions in D3
      { from: /\.map\(\(d, i\) => /g, to: '.map((d: unknown, i: number) => ' },
      
      // Jest mock functions in tests
      { from: /jest\.fn\(\(([^)]+)\) =>/g, to: (match, params) => {
        // Add types to parameters
        const typedParams = params.split(',').map(param => {
          const trimmed = param.trim();
          if (trimmed === 'id') return 'id: string';
          if (trimmed === 'updates') return 'updates: unknown';
          if (trimmed === 'value') return 'value: unknown';
          if (trimmed === 'd') return 'd: unknown';
          if (trimmed === 'i') return 'i: number';
          if (trimmed === 'data') return 'data: unknown[]';
          return `${trimmed}: unknown`;
        }).join(', ');
        return `jest.fn((${typedParams}) =>`;
      }},
      
      // Mock function parameters in repository mocks
      { from: /mockImplementation\(\(([^)]+)\) => /g, to: (match, params) => {
        const typedParams = params.split(',').map(param => {
          const trimmed = param.trim();
          if (trimmed === 'id') return 'id: string';
          if (trimmed === 'updates') return 'updates: unknown';
          if (trimmed === 'value') return 'value: unknown';
          return `${trimmed}: unknown`;
        }).join(', ');
        return `mockImplementation((${typedParams}) => `;
      }}
    ];

    fixes.forEach(fix => {
      const oldContent = content;
      content = content.replace(fix.from, fix.to);
      if (content !== oldContent) {
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
  console.log('🔧 Fixing TypeScript implicit any errors...');
  
  const files = getFilesWithImplicitAny();
  if (files.length === 0) {
    console.log('No implicit any errors found.');
    return;
  }

  console.log(`Found ${files.length} files with implicit any errors`);

  let fixedCount = 0;
  files.forEach(file => {
    if (fixImplicitAnyInFile(file)) {
      fixedCount++;
    }
  });

  console.log(`\n✅ Fixed ${fixedCount}/${files.length} files`);
  
  // Check remaining errors
  try {
    const remaining = execSync(`npx tsc --noEmit 2>&1 | grep -c "implicitly has an 'any' type"`, { encoding: 'utf8' });
    console.log(`Remaining implicit any errors: ${remaining.trim()}`);
  } catch (error) {
    console.log('All implicit any errors fixed!');
  }
}

if (require.main === module) {
  main();
}