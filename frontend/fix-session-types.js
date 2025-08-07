#!/usr/bin/env node
/**
 * Fix Session Type Errors Script
 * Fix TypeScript errors related to session object types in tests
 */

const fs = require('fs');
const { execSync } = require('child_process');

function getSessionTypeErrors() {
  try {
    const result = execSync(`npx tsc --noEmit 2>&1 | grep -E "user.*null|name.*does not exist|id.*missing|email.*undefined"`, { encoding: 'utf8' });
    const lines = result.trim().split('\n').filter(line => line.trim());
    const files = [...new Set(lines.map(line => line.split('(')[0]))];
    return files;
  } catch (error) {
    console.log('No session type errors found');
    return [];
  }
}

function fixSessionTypesInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Fix session with null user (line 178)
    if (content.includes('{ user: null }')) {
      content = content.replace(/\{ user: null \}/g, '{ user: null } as any');
      changed = true;
    }

    // Fix session with name but no id/email (lines 195, 213)
    if (content.includes("{ name: 'Test User' }")) {
      content = content.replace(/user: \{ name: '[^']*' \}/g, 'user: { name: \'Test User\' } as any');
      changed = true;
    }

    // Fix session with email and name but missing id (lines 213)
    const emailNamePattern = /user: \{ email: '[^']*', name: '[^']*' \}/g;
    if (emailNamePattern.test(content)) {
      content = content.replace(emailNamePattern, (match) => `${match} as any`);
      changed = true;
    }

    // Fix session with undefined email (line 231)
    if (content.includes('email: undefined')) {
      content = content.replace(/user: \{ email: undefined, name: '[^']*' \}/g, 'user: { email: undefined, name: \'Test User\' } as any');
      changed = true;
    }

    // Fix session with only email property (missing id) - multiple lines
    const emailOnlyPattern = /user: \{ email: [^}]+ \}(?!\s+as\s+any)/g;
    if (emailOnlyPattern.test(content)) {
      content = content.replace(emailOnlyPattern, (match) => {
        // Don't add 'as any' if it's already there
        if (match.includes(' as any')) return match;
        return `${match} as any`;
      });
      changed = true;
    }

    // Fix delete operator on required property (line 417)
    if (content.includes('delete user.id')) {
      // Replace delete with setting to null
      content = content.replace(/delete\s+(\w+)\.id;/, '$1.id = null;');
      changed = true;
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
  console.log('🔧 Fixing session type errors...');
  
  // For now, let's focus on the specific file we know has issues
  const problemFile = 'src/app/api/pbl/programs/[programId]/tasks/__tests__/route.test.ts';
  
  console.log(`Fixing ${problemFile}...`);
  const success = fixSessionTypesInFile(problemFile);
  
  if (success) {
    console.log('\n✅ Session type errors fixed');
  } else {
    console.log('\n⚠️  No changes made');
  }
  
  // Check remaining errors
  try {
    const remaining = execSync(`npx tsc --noEmit 2>&1 | grep -E "user.*null|name.*does not exist|id.*missing|email.*undefined" | wc -l`, { encoding: 'utf8' });
    console.log(`Remaining session errors: ${remaining.trim()}`);
  } catch (error) {
    console.log('Session type errors may be fixed!');
  }
}

if (require.main === module) {
  main();
}