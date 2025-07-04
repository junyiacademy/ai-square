const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, '..', 'src', 'components', 'discovery', 'ExplorationWorkspace.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Split into lines
const lines = content.split('\n');
const newLines = [];
let skipMode = false;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Check if we're at line 1190 (0-indexed would be 1189)
  if (i === 1189 && line.includes('// Additional check when dynamic tasks are loaded or updated')) {
    // Start skipping from the comment
    skipMode = true;
    newLines.push('  // Dynamic task status update is handled before early return');
    continue;
  }
  
  if (skipMode) {
    // Count braces to know when the useEffect ends
    for (const char of line) {
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
    }
    
    // If we've closed all braces and see the closing of useEffect
    if (braceCount === 0 && line.includes('});')) {
      skipMode = false;
      continue; // Skip this line too
    }
    
    continue; // Skip all lines while in skip mode
  }
  
  newLines.push(line);
}

// Join back
const newContent = newLines.join('\n');

// Write the fixed content
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('✅ Removed the last conditional hook');