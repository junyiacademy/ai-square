const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, '..', 'src', 'components', 'discovery', 'ExplorationWorkspace.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Split content into lines
const lines = content.split('\n');

// Find the early return line
let earlyReturnLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('if (!typedPathData) {')) {
    earlyReturnLine = i;
    break;
  }
}

console.log('Found early return at line:', earlyReturnLine + 1);

// Find all hooks after the early return
const hooksAfterReturn = [];
for (let i = earlyReturnLine; i < lines.length; i++) {
  if (lines[i].includes('useEffect(') || 
      lines[i].includes('useState(') || 
      lines[i].includes('useCallback(') ||
      lines[i].includes('useMemo(') ||
      lines[i].includes('useRef(')) {
    hooksAfterReturn.push({
      line: i + 1,
      content: lines[i].trim()
    });
  }
}

console.log('\nHooks found after early return:');
hooksAfterReturn.forEach(hook => {
  console.log(`Line ${hook.line}: ${hook.content}`);
});

console.log('\nTo fix this issue, all hooks must be moved before the early return.');
console.log('The component needs to be restructured to ensure hooks are always called in the same order.');