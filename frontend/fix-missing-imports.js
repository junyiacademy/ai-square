#!/usr/bin/env node
/**
 * Fix Missing Import Errors Script
 * Fixes missing fireEvent and act imports in test files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getFilesWithMissingImports() {
  try {
    const result = execSync(`npx tsc --noEmit 2>&1 | grep -E "Cannot find name '(fireEvent|act)'"`, { encoding: 'utf8' });
    const lines = result.trim().split('\n');
    const files = [...new Set(lines.map(line => line.split('(')[0]))];
    return files;
  } catch (error) {
    console.log('No missing import errors found');
    return [];
  }
}

function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Check if file uses fireEvent or act
    const usesFireEvent = content.includes('fireEvent.');
    const usesAct = content.includes('act(');

    if (!usesFireEvent && !usesAct) {
      return false; // No need to fix this file
    }

    // Check current import from testing-library/react
    const hasTestingLibraryImport = content.includes('@testing-library/react');
    const hasRenderImport = content.includes('from \'@/test-utils/helpers/render\'');

    if (hasRenderImport) {
      // File uses our custom render helper
      const importMatch = content.match(/import \{([^}]+)\} from '@\/test-utils\/helpers\/render';/);
      if (importMatch) {
        const currentImports = importMatch[1].split(',').map(imp => imp.trim());
        const newImports = [...currentImports];
        
        if (usesFireEvent && !newImports.includes('fireEvent')) {
          newImports.push('fireEvent');
        }
        if (usesAct && !newImports.includes('act')) {
          newImports.push('act');
        }
        
        if (newImports.length !== currentImports.length) {
          const newImportStatement = `import { ${newImports.join(', ')} } from '@/test-utils/helpers/render';`;
          content = content.replace(/import \{[^}]+\} from '@\/test-utils\/helpers\/render';/, newImportStatement);
          changed = true;
        }
      }
    } else if (hasTestingLibraryImport) {
      // File uses testing-library directly
      const importMatch = content.match(/import \{([^}]+)\} from '@testing-library\/react';/);
      if (importMatch) {
        const currentImports = importMatch[1].split(',').map(imp => imp.trim());
        const newImports = [...currentImports];
        
        if (usesFireEvent && !newImports.includes('fireEvent')) {
          newImports.push('fireEvent');
        }
        if (usesAct && !newImports.includes('act')) {
          newImports.push('act');
        }
        
        if (newImports.length !== currentImports.length) {
          const newImportStatement = `import { ${newImports.join(', ')} } from '@testing-library/react';`;
          content = content.replace(/import \{[^}]+\} from '@testing-library\/react';/, newImportStatement);
          changed = true;
        }
      }
    } else {
      // Add new import
      const importsNeeded = [];
      if (usesFireEvent) importsNeeded.push('fireEvent');
      if (usesAct) importsNeeded.push('act');
      
      if (importsNeeded.length > 0) {
        // Check if file has any imports to determine where to add
        const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
        if (importLines.length > 0) {
          // Add after the last import
          const lastImportIndex = content.lastIndexOf(importLines[importLines.length - 1]);
          const endOfLastImport = content.indexOf('\n', lastImportIndex);
          const newImport = `import { ${importsNeeded.join(', ')} } from '@testing-library/react';`;
          content = content.slice(0, endOfLastImport + 1) + newImport + '\n' + content.slice(endOfLastImport + 1);
          changed = true;
        }
      }
    }

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
  console.log('🔧 Fixing missing fireEvent and act imports...');
  
  const files = getFilesWithMissingImports();
  if (files.length === 0) {
    console.log('No files with missing imports found.');
    return;
  }

  console.log(`Found ${files.length} files with missing imports`);

  let fixedCount = 0;
  files.forEach(file => {
    if (fixImportsInFile(file)) {
      fixedCount++;
    }
  });

  console.log(`\n✅ Fixed ${fixedCount}/${files.length} files`);
  
  // Check remaining errors
  try {
    const remaining = execSync(`npx tsc --noEmit 2>&1 | grep -c "Cannot find name '(fireEvent|act)'"`, { encoding: 'utf8' });
    console.log(`Remaining missing import errors: ${remaining.trim()}`);
  } catch (error) {
    console.log('All missing import errors may be fixed!');
  }
}

if (require.main === module) {
  main();
}