#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all test files
const testFiles = glob.sync('src/**/*.test.{ts,tsx}');

console.log(`Found ${testFiles.length} test files`);

let fixedCount = 0;

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // Fix 1: Replace @ts-ignore with @ts-expect-error
  if (content.includes('// @ts-ignore')) {
    content = content.replace(/\/\/ @ts-ignore/g, '// @ts-expect-error');
    modified = true;
  }

  // Fix 2: Fix Next.js 15 dynamic route params
  if (content.includes('{ params: { ') && content.includes('route.test')) {
    content = content.replace(
      /\{ params: \{ ([^}]+) \} \}/g,
      '{ params: Promise.resolve({ $1 }) }'
    );
    modified = true;
  }

  // Fix 3: Fix mockReturnValue for localStorage
  if (content.includes('mockLocalStorage.getItem.mockReturnValue')) {
    // This needs more careful handling per file
  }

  // Fix 4: Remove clearCache imports that don't exist
  if (content.includes("import { GET, clearCache }") && content.includes('discovery')) {
    content = content.replace(
      "import { GET, clearCache }",
      "import { GET }"
    );
    content = content.replace(/clearCache\(\);?/g, '');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(file, content);
    fixedCount++;
    console.log(`Fixed: ${file}`);
  }
});

console.log(`\nFixed ${fixedCount} files`);