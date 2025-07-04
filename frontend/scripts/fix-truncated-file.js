const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the complete file from git
const gitContent = execSync('git show HEAD:frontend/src/components/discovery/ExplorationWorkspace.tsx', { encoding: 'utf8' });

// Find where the truncation occurred - at generateSimpleFallbackResponse
const truncationPoint = '  };  // Workspace data loading is handled before early return';
const truncationIndex = gitContent.lastIndexOf(truncationPoint);

if (truncationIndex === -1) {
  console.error('Could not find truncation point');
  process.exit(1);
}

// Get everything after the truncation point from the original
const missingContent = gitContent.substring(truncationIndex + truncationPoint.length);

// Read current truncated file
const filePath = path.join(__dirname, '..', 'src', 'components', 'discovery', 'ExplorationWorkspace.tsx');
let currentContent = fs.readFileSync(filePath, 'utf8');

// Remove the duplicate/misplaced comments at the end
currentContent = currentContent.replace(/\s*\/\/ Workspace data loading is handled before early return\s*\n\s*\/\/ Dynamic task status update is handled before early return\s*$/, '');

// Find the generateSimpleFallbackResponse function and ensure it ends properly
const funcEndMatch = currentContent.match(/(\s*)return `我了解你的訊息[^`]*`;(\s*)\};/);
if (funcEndMatch) {
  const endIndex = currentContent.indexOf(funcEndMatch[0]) + funcEndMatch[0].length;
  currentContent = currentContent.substring(0, endIndex);
}

// Now append the missing content
const completeContent = currentContent + missingContent;

// Write the fixed file
fs.writeFileSync(filePath, completeContent, 'utf8');
console.log('✅ Fixed truncated ExplorationWorkspace.tsx');