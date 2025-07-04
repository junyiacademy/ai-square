const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, '..', 'src', 'components', 'discovery', 'ExplorationWorkspace.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the early return position
const earlyReturnMatch = content.match(/(\s*)if \(!typedPathData\) \{[\s\S]*?return \([\s\S]*?\);\s*\}/);
if (!earlyReturnMatch) {
  console.error('Could not find early return statement');
  process.exit(1);
}

const earlyReturnIndex = content.indexOf(earlyReturnMatch[0]);
const beforeReturn = content.substring(0, earlyReturnIndex);
const afterReturn = content.substring(earlyReturnIndex);

// Extract all hooks that are after the early return
const hooksAfterReturn = [];
const hookPatterns = [
  /(\s*)\/\/ Now that we have typedPathData, handle deferred operations[\s\S]*?useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\);/,
  /(\s*)\/\/ Load task answers when deferred flag is set[\s\S]*?useEffect\(\(\) => \{[\s\S]*?loadTaskAnswers\(\);\s*\}, \[[^\]]*\]\);/,
  /(\s*)\/\/ Initialize AI greeting when deferred flag is set[\s\S]*?useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\);/
];

// Remove these hooks from after the return
let cleanedAfterReturn = afterReturn;
hookPatterns.forEach(pattern => {
  const match = cleanedAfterReturn.match(pattern);
  if (match) {
    hooksAfterReturn.push(match[0]);
    cleanedAfterReturn = cleanedAfterReturn.replace(match[0], '');
  }
});

// Now we need to restructure the component to handle conditional logic properly
// Add a wrapper component that handles the early return case
const newStructure = `${beforeReturn}
  // Early return case - no path data
  if (!typedPathData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Path data not found for: {pathId}</p>
          <p className="text-sm text-gray-500 mb-4">Available paths: content_creator, youtuber, app_developer, game_designer, tech_entrepreneur, startup_founder, data_analyst, ux_designer, product_manager, ai_developer</p>
          <button
            onClick={onBackToPaths}
            className="inline-flex items-center space-x-2 text-purple-600 hover:text-purple-700 font-medium"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>{t('workspace.backToPaths')}</span>
          </button>
        </div>
      </div>
    );
  }

  // Now we have typedPathData, so we can safely access it
  const currentTask = typedPathData.tasks[currentTaskIndex];
  const isLastTask = currentTaskIndex === typedPathData.tasks.length - 1;

  // Handle deferred operations now that we have typedPathData
  useEffect(() => {
    if (!deferredLoadTasks) {
      setDeferredLoadTasks(true);
    }
    if (!deferredInitGreeting) {
      setDeferredInitGreeting(true);
    }
  }, [deferredLoadTasks, deferredInitGreeting]);

  // Load task answers when deferred flag is set and we have typedPathData
  useEffect(() => {
    const loadTaskAnswers = async () => {
      if (deferredLoadTasks && workspaceId) {
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
        if (currentTask && answers[currentTask.id]) {
          setCurrentTaskAnswer(answers[currentTask.id].answer);
        } else {
          setCurrentTaskAnswer(''); // Clear if no answer exists
        }
      }
    };
    
    loadTaskAnswers();
  }, [deferredLoadTasks, workspaceId, currentTaskIndex, currentTask, userDataService]);

  // Initialize AI greeting when deferred flag is set and we have typedPathData
  useEffect(() => {
    if (deferredInitGreeting) {
      const greetingMessage: ChatMessage = {
        id: '1',
        sender: 'ai',
        text: t('aiAssistant.greeting', {
          role: typedPathData.aiAssistants[0] || 'Assistant',
          path: typedPathData.title
        }),
        timestamp: new Date()
      };
      setChatMessages([greetingMessage]);
    }
  }, [deferredInitGreeting, pathId, t]);
${cleanedAfterReturn.replace(/^\s*if \(!typedPathData\) \{[\s\S]*?\);\s*\}\s*/, '')}`;

// Write the fixed content
fs.writeFileSync(filePath, newStructure, 'utf8');
console.log('✅ Fixed React Hooks order properly');