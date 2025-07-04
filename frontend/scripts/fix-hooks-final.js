const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, '..', 'src', 'components', 'discovery', 'ExplorationWorkspace.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find where the early return starts
const earlyReturnStartMatch = content.match(/(\s*)\/\/ If still no data, show error\s*\n\s*\/\/ Early return case - no path data\s*\n\s*if \(!typedPathData\)/);
if (!earlyReturnStartMatch) {
  console.error('Could not find early return start');
  process.exit(1);
}

const earlyReturnStartIndex = content.indexOf(earlyReturnStartMatch[0]);

// Find where the early return ends (closing brace)
let braceCount = 0;
let inReturn = false;
let earlyReturnEndIndex = -1;

for (let i = earlyReturnStartIndex; i < content.length; i++) {
  if (content[i] === '{') {
    braceCount++;
    inReturn = true;
  } else if (content[i] === '}' && inReturn) {
    braceCount--;
    if (braceCount === 0) {
      earlyReturnEndIndex = i + 1;
      break;
    }
  }
}

if (earlyReturnEndIndex === -1) {
  console.error('Could not find early return end');
  process.exit(1);
}

// Extract parts
const beforeEarlyReturn = content.substring(0, earlyReturnStartIndex);
const earlyReturn = content.substring(earlyReturnStartIndex, earlyReturnEndIndex);
const afterEarlyReturn = content.substring(earlyReturnEndIndex);

// Remove all hooks that appear after the early return
const cleanedAfterReturn = afterEarlyReturn
  .replace(/\s*\/\/ Handle deferred operations now that we have typedPathData[\s\S]*?}, \[[^\]]*\]\);/, '')
  .replace(/\s*\/\/ Load task answers when deferred flag is set and we have typedPathData[\s\S]*?}, \[[^\]]*\]\);/, '')
  .replace(/\s*\/\/ Initialize AI greeting when deferred flag is set and we have typedPathData[\s\S]*?}, \[[^\]]*\]\);/, '')
  .replace(/\s*\/\/ Initialize AI greeting - only when pathId changes[\s\S]*?}, \[[^\]]*\]\);/, '')
  .replace(/\s*\/\/ Auto-scroll is handled by the hook before early return/, '');

// Create new content with hooks before early return
const newContent = `${beforeEarlyReturn}
  // Effect to handle operations after typedPathData is determined
  useEffect(() => {
    if (typedPathData) {
      // Load task answers
      const loadTaskAnswers = async () => {
        if (workspaceId) {
          // Run migration once on first load
          const { migrateTaskAnswers } = await import('@/lib/utils/migrate-task-answers');
          migrateTaskAnswers();
          
          const answers: Record<string, any> = {};
          
          // Load all task answers for this workspace
          for (const task of typedPathData.tasks) {
            const answer = await userDataService.getTaskAnswer(workspaceId, task.id);
            if (answer) {
              answers[task.id] = answer;
            }
          }
          
          setTaskAnswers(answers);
          
          // Set current task answer if exists
          const currentTask = typedPathData.tasks[currentTaskIndex];
          if (currentTask && answers[currentTask.id]) {
            setCurrentTaskAnswer(answers[currentTask.id].answer);
          } else {
            setCurrentTaskAnswer(''); // Clear if no answer exists
          }
        }
      };
      
      loadTaskAnswers();
      
      // Initialize AI greeting
      const greetingMessage: ChatMessage = {
        id: '1',
        sender: 'ai',
        text: t('aiAssistant.greeting', {
          role: typedPathData.aiAssistants?.[0] || 'Assistant',
          path: typedPathData.title
        }),
        timestamp: new Date()
      };
      setChatMessages([greetingMessage]);
    }
  }, [typedPathData, workspaceId, currentTaskIndex, userDataService, t]);

${earlyReturn}
  
  // TypeScript now knows typedPathData is not null after this point
  const currentTask = typedPathData.tasks[currentTaskIndex];
  const isLastTask = currentTaskIndex === typedPathData.tasks.length - 1;
${cleanedAfterReturn}`;

// Write the fixed content
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('✅ Fixed React Hooks order - final version');