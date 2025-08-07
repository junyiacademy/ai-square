#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Map of file paths to their expected params
const paramMappings = {
  '[programId]': { programId: 'test-id' },
  '[id]': { id: 'test-id' },
  '[taskId]': { taskId: 'test-id' },
  '[id]/programs/[programId]': { id: 'test-id', programId: 'test-program-id' },
  '[id]/programs/[programId]/tasks/[taskId]': { id: 'test-id', programId: 'test-program-id', taskId: 'test-task-id' },
};

// Find all route test files
const routeTestFiles = glob.sync('src/**/__tests__/route.test.{ts,tsx}');

let totalFixed = 0;

routeTestFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Determine expected params based on file path
  const dirPath = path.dirname(path.dirname(file));
  let expectedParams = null;
  
  // Check each pattern
  for (const [pattern, params] of Object.entries(paramMappings)) {
    if (dirPath.includes(pattern)) {
      expectedParams = params;
      break;
    }
  }
  
  if (!expectedParams) {
    expectedParams = {};
  }
  
  // Create the params string
  const paramsString = JSON.stringify(expectedParams).replace(/"/g, "'");
  
  // Fix all occurrences of params: Promise.resolve
  content = content.replace(
    /params: Promise\.resolve\(\{[^}]*\}\)/g,
    `params: Promise.resolve(${paramsString})`
  );
  
  // Also fix params: Promise<{...}> type declarations if they exist
  const typeString = Object.keys(expectedParams).map(key => `${key}: string`).join('; ');
  if (typeString) {
    content = content.replace(
      /params: Promise<\{[^}]*\}>/g,
      `params: Promise<{ ${typeString} }>`
    );
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed ${file}`);
    totalFixed++;
  }
});

// Fix translate route specifically
const translateTest = 'src/app/api/discovery/translate/__tests__/route.test.ts';
if (fs.existsSync(translateTest)) {
  let content = fs.readFileSync(translateTest, 'utf8');
  let originalContent = content;
  
  // Check if GET and POST are imported
  if (content.includes('import { GET, POST }') || content.includes('import { POST, GET }')) {
    // They are imported, so calls should have 2 params
    // Keep as is with context parameter
  } else if (content.includes('import { GET }') && content.includes('import { POST }')) {
    // Both imported separately
  } else {
    // Check actual exports from the route file
    const routeFile = translateTest.replace('/__tests__/route.test.ts', '/route.ts');
    if (fs.existsSync(routeFile)) {
      const routeContent = fs.readFileSync(routeFile, 'utf8');
      if (!routeContent.includes('export async function GET') && !routeContent.includes('export function GET')) {
        // GET doesn't exist, remove GET tests
        content = content.replace(/describe\('GET'[^}]+\}\);[\s\n]+\}\);/gs, '');
      }
      if (!routeContent.includes('export async function POST') && !routeContent.includes('export function POST')) {
        // POST doesn't exist, remove POST tests
        content = content.replace(/describe\('POST'[^}]+\}\);[\s\n]+\}\);/gs, '');
      }
    }
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(translateTest, content, 'utf8');
    console.log(`Fixed ${translateTest}`);
    totalFixed++;
  }
}

// Fix hook import issues
const hookTests = glob.sync('src/hooks/__tests__/*.test.{ts,tsx}');
hookTests.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Fix default imports to named imports
  content = content.replace(
    /import\s+(\w+)\s+from\s+'([^']+)'/g,
    (match, importName, importPath) => {
      if (importPath.startsWith('../') && !importPath.includes('.css')) {
        // Check if it's a hook import
        const hookName = path.basename(importPath);
        if (hookName.startsWith('use')) {
          return `import { ${hookName} } from '${importPath}'`;
        }
      }
      return match;
    }
  );
  
  // Specific fixes for known hooks
  content = content.replace(
    /import useDiscoveryData from '..\/useDiscoveryData'/g,
    "import { useDiscoveryData } from '../useDiscoveryData'"
  );
  content = content.replace(
    /import useUserData from '..\/useUserData'/g,
    "import { useUserData } from '../useUserData'"
  );
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed ${file}`);
    totalFixed++;
  }
});

console.log(`\nTotal files fixed: ${totalFixed}`);