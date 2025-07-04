const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, '..', 'src', 'components', 'discovery', 'ExplorationWorkspace.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Extract the hooks that are after the early return (lines 1158 and 1209)
const hook1Regex = /(\s*)\/\/ Get completed tasks for this specific workspace from localStorage\s*\n\s*\n\s*useEffect\(\(\) => \{[\s\S]*?\}, \[workspaceId, typedPathData\.tasks\.length\]\);/;
const hook2Regex = /(\s*)\/\/ Additional check when dynamic tasks are loaded or updated\s*\n\s*useEffect\(\(\) => \{[\s\S]*?\}, \[workspaceId, dynamicTasks\.length, userDataService\]\);/;

// Find and remove these hooks
const hook1Match = content.match(hook1Regex);
const hook2Match = content.match(hook2Regex);

if (hook1Match) {
  content = content.replace(hook1Match[0], '  // Workspace data loading is handled before early return');
}
if (hook2Match) {
  content = content.replace(hook2Match[0], '  // Dynamic task status update is handled before early return');
}

// Now we need to add logic to handle these operations in the main effect before the early return
// Find the effect that handles typedPathData operations
const mainEffectRegex = /(\s*)\/\/ Effect to handle operations after typedPathData is determined\s*\n\s*useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\);/;
const mainEffectMatch = content.match(mainEffectRegex);

if (mainEffectMatch) {
  // Extract the dependencies from the current effect
  const depsMatch = mainEffectMatch[0].match(/\}, \[([^\]]*)\]\);$/);
  const currentDeps = depsMatch ? depsMatch[1] : '';
  
  // Create updated effect with workspace loading logic
  const updatedEffect = `  // Effect to handle operations after typedPathData is determined
  useEffect(() => {
    const performOperations = async () => {
      if (typedPathData) {
        // Load task answers
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
          
          // Load workspace data and update completed tasks
          const userData = await userDataService.loadUserData();
          if (userData) {
            const workspace = userData.workspaceSessions.find(ws => ws.id === workspaceId);
            if (workspace) {
              // Filter out empty task IDs
              const cleanedTasks = (workspace.completedTasks || []).filter(taskId => taskId && taskId.trim() !== '');
              setWorkspaceCompletedTasks(cleanedTasks);
              
              // Check and update workspace status based on task completion
              const baseTasks = typedPathData.tasks.length;
              const dynamicTasksCount = dynamicTasks.length;
              const totalTasks = baseTasks + dynamicTasksCount;
              const completedCount = cleanedTasks.length;
              
              // Determine the correct status
              let newStatus = workspace.status;
              if (completedCount === 0) {
                newStatus = 'active';
              } else if (completedCount >= baseTasks && dynamicTasksCount === 0) {
                newStatus = 'completed';
              } else if (completedCount >= totalTasks && dynamicTasksCount > 0) {
                newStatus = 'completed';
              } else {
                newStatus = 'active';
              }
              
              // Update status if it changed
              if (newStatus !== workspace.status) {
                console.log('Updating workspace status from', workspace.status, 'to', newStatus);
                const workspaceIndex = userData.workspaceSessions.findIndex(ws => ws.id === workspaceId);
                if (workspaceIndex !== -1) {
                  userData.workspaceSessions[workspaceIndex].status = newStatus;
                  userData.workspaceSessions[workspaceIndex].lastActiveAt = new Date().toISOString();
                  await userDataService.saveUserData(userData);
                }
              }
            }
          }
        }
        
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
    };
    
    performOperations();
  }, [typedPathData, workspaceId, currentTaskIndex, userDataService, t, dynamicTasks.length]);`;
  
  content = content.replace(mainEffectMatch[0], updatedEffect);
}

// Remove the duplicate/unused deferred state variables
content = content.replace(/\s*const \[deferredLoadTasks, setDeferredLoadTasks\] = useState\(false\);\s*\n/, '');
content = content.replace(/\s*const \[deferredInitGreeting, setDeferredInitGreeting\] = useState\(false\);\s*\n/, '');

// Write the fixed content
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed remaining React Hooks issues');