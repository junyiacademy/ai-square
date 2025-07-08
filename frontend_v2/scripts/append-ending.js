const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the ending from git starting from the main return statement
const gitContent = execSync('git show HEAD:frontend/src/components/discovery/ExplorationWorkspace.tsx', { encoding: 'utf8' });

// Find the main return statement - we need everything from the component's return
const returnMatch = gitContent.match(/(\s+)\/\/ Calculate completed tasks count for progress[\s\S]*?return \(/);
if (!returnMatch) {
  console.error('Could not find return statement pattern');
  process.exit(1);
}

const returnIndex = gitContent.indexOf(returnMatch[0]);
const componentEnding = gitContent.substring(returnIndex);

// Read current file
const filePath = path.join(__dirname, '..', 'src', 'components', 'discovery', 'ExplorationWorkspace.tsx');
let currentContent = fs.readFileSync(filePath, 'utf8');

// Remove any trailing incomplete content
currentContent = currentContent.replace(/\s*\/\/ Workspace data loading is handled before early return\s*\n\s*\/\/ Dynamic task status update is handled before early return\s*$/, '');

// Ensure the generateSimpleFallbackResponse function is properly closed
if (!currentContent.includes('// Calculate completed tasks count for progress')) {
  // Append the missing ending part
  currentContent = currentContent.trimEnd() + '\n\n' + componentEnding;
}

// Write the complete file
fs.writeFileSync(filePath, currentContent, 'utf8');
console.log('✅ Appended missing ending to ExplorationWorkspace.tsx');