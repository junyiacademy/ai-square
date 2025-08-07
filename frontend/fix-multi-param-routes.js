const fs = require('fs');
const path = require('path');

// Function to extract all param names from a route path
function extractParamsFromPath(filePath) {
  const params = [];
  const matches = filePath.matchAll(/\[([^\]]+)\]/g);
  for (const match of matches) {
    params.push(match[1]);
  }
  return params;
}

// Function to fix test file
function fixTestFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Extract all parameters from the file path
  const params = extractParamsFromPath(filePath);
  
  if (params.length === 0) return false;
  
  // Build the params object string
  const paramsObject = params.map(p => `'${p}':'test-id'`).join(',');
  
  // Pattern to match params in test calls
  const patterns = [
    // Match incomplete params objects
    /params: Promise\.resolve\(\{[^}]*\}\)/g
  ];
  
  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Replace with correct params
        const newParams = `params: Promise.resolve({${paramsObject}})`;
        if (match !== newParams) {
          content = content.replace(match, newParams);
          modified = true;
          console.log(`  Fixed params in: ${filePath}`);
          console.log(`    From: ${match}`);
          console.log(`    To: ${newParams}`);
        }
      });
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  return modified;
}

// Find all test files with multiple parameters in their path
function findAndFixMultiParamTests(dir) {
  let count = 0;
  
  function traverse(currentDir) {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        traverse(fullPath);
      } else if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
        // Check if this is a route test with multiple params
        const params = extractParamsFromPath(fullPath);
        if (params.length > 1) {
          if (fixTestFile(fullPath)) {
            count++;
          }
        }
      }
    }
  }
  
  traverse(dir);
  return count;
}

// Run the fix
console.log('Fixing multi-parameter route tests...');
const srcDir = path.join(__dirname, 'src');
const fixedCount = findAndFixMultiParamTests(srcDir);
console.log(`\nFixed ${fixedCount} test files with multiple parameters`);