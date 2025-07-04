const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, '..', 'src', 'components', 'discovery', 'ExplorationWorkspace.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Split into lines
const lines = content.split('\n');
const seenDeclarations = new Set();
const filteredLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Check for duplicate declarations
  if (trimmed.startsWith('const currentTask = typedPathData.tasks[currentTaskIndex]') ||
      trimmed.startsWith('const isLastTask = currentTaskIndex === typedPathData.tasks.length - 1')) {
    
    if (seenDeclarations.has(trimmed)) {
      console.log(`Removing duplicate at line ${i + 1}: ${trimmed}`);
      continue; // Skip this line
    }
    seenDeclarations.add(trimmed);
  }
  
  filteredLines.push(line);
}

// Join back
const newContent = filteredLines.join('\n');

// Write the fixed content
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('✅ Removed duplicate declarations');