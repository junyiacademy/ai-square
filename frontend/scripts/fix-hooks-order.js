const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, '..', 'src', 'components', 'discovery', 'ExplorationWorkspace.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find and remove the duplicate handleProgressUpdate at line ~808
content = content.replace(/\n\s*const handleProgressUpdate = React\.useCallback\(\(progress: number\) => \{\s*\n\s*setTaskProgress\(progress\);\s*\n\s*\}, \[\]\);(?=\s*\n\s*const generateNextTask)/, '');

// Remove the duplicate auto-scroll useEffect at line ~759
content = content.replace(/\n\s*\/\/ Auto-scroll chat to bottom\s*\n\s*useEffect\(\(\) => \{\s*\n\s*if \(chatContainerRef\.current\) \{\s*\n\s*chatContainerRef\.current\.scrollTop = chatContainerRef\.current\.scrollHeight;\s*\n\s*\}\s*\n\s*\}, \[chatMessages\]\);(?=\s*\n\s*const handleStartTask)/, '');

// Now we need to move hooks that are after the early return to before it
// First, let's find where typedPathData is checked (the early return)
const earlyReturnRegex = /if \(!typedPathData\) \{[\s\S]*?return \([\s\S]*?\);\s*\}/;
const earlyReturnMatch = content.match(earlyReturnRegex);

if (earlyReturnMatch) {
  const earlyReturnIndex = content.indexOf(earlyReturnMatch[0]);
  
  // Extract hooks that are after the early return and need to be moved
  // 1. Load task answers useEffect
  const loadTaskAnswersRegex = /\/\/ Load task answers when workspace ID is available[\s\S]*?useEffect\(\(\) => \{[\s\S]*?loadTaskAnswers\(\);\s*\}, \[workspaceId, pathId, currentTaskIndex\]\);/;
  const loadTaskAnswersMatch = content.match(loadTaskAnswersRegex);
  
  // 2. Initialize AI greeting useEffect  
  const aiGreetingRegex = /\/\/ Initialize AI greeting - only when pathId changes[\s\S]*?useEffect\(\(\) => \{[\s\S]*?\}, \[pathId, t\]\); \/\/ Remove typedPathData from dependencies/;
  const aiGreetingMatch = content.match(aiGreetingRegex);
  
  if (loadTaskAnswersMatch || aiGreetingMatch) {
    // Remove these hooks from their current position
    if (loadTaskAnswersMatch) {
      content = content.replace(loadTaskAnswersMatch[0], '  // Task answers loading is now handled before the early return');
    }
    if (aiGreetingMatch) {
      content = content.replace(aiGreetingMatch[0], '  // AI greeting initialization is now handled before the early return');
    }
    
    // Add a new implementation that handles these hooks properly before the early return
    const newHooksImplementation = `
  // Defer loading until we have typedPathData
  const [deferredLoadTasks, setDeferredLoadTasks] = useState(false);
  const [deferredInitGreeting, setDeferredInitGreeting] = useState(false);

  // Enhanced character-driven career paths with rich worldbuilding`;

    content = content.replace('  // Enhanced character-driven career paths with rich worldbuilding', newHooksImplementation);
    
    // Add the logic after typedPathData is determined
    const afterTypedPathDataLogic = `
  const currentTask = typedPathData.tasks[currentTaskIndex];
  const isLastTask = currentTaskIndex === typedPathData.tasks.length - 1;

  // Now that we have typedPathData, handle deferred operations
  useEffect(() => {
    if (typedPathData && !deferredLoadTasks) {
      setDeferredLoadTasks(true);
    }
    if (typedPathData && !deferredInitGreeting) {
      setDeferredInitGreeting(true);
    }
  }, [typedPathData, deferredLoadTasks, deferredInitGreeting]);

  // Load task answers when deferred flag is set
  useEffect(() => {
    const loadTaskAnswers = async () => {
      if (deferredLoadTasks && workspaceId && typedPathData) {
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
  }, [deferredLoadTasks, workspaceId, currentTaskIndex, typedPathData, currentTask, userDataService]);

  // Initialize AI greeting when deferred flag is set
  useEffect(() => {
    if (deferredInitGreeting && typedPathData) {
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
  }, [deferredInitGreeting, typedPathData, pathId, t]);`;

    content = content.replace(
      '  const currentTask = typedPathData.tasks[currentTaskIndex];\n  const isLastTask = currentTaskIndex === typedPathData.tasks.length - 1;',
      afterTypedPathDataLogic
    );
  }
}

// Write the fixed content
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed React Hooks order in ExplorationWorkspace.tsx');