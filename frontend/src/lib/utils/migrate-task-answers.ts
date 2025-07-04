/**
 * Migration utility to add placeholder answers for completed tasks
 * that don't have saved answers (completed before save functionality)
 */
export function migrateTaskAnswers() {
  try {
    const savedData = localStorage.getItem('discoveryData');
    if (!savedData) return;
    
    const data = JSON.parse(savedData);
    let modified = false;
    
    // Check each workspace session
    data.workspaceSessions?.forEach((session: any) => {
      // Only process sessions with completed tasks
      if (session.completedTasks && session.completedTasks.length > 0) {
        // Initialize taskAnswers if not exists
        if (!session.taskAnswers) {
          session.taskAnswers = [];
          modified = true;
        }
        
        // Check each completed task
        session.completedTasks.forEach((taskId: string) => {
          // Check if answer exists for this task
          const hasAnswer = session.taskAnswers.some((a: any) => a.taskId === taskId);
          
          if (!hasAnswer) {
            // Add placeholder answer with structured format
            const placeholderAnswer = {
              steps: {
                understand: '此任務在答案保存功能實施前完成',
                plan: '暫無保存的計劃內容',
                execute: '暫無保存的執行內容'
              },
              finalAnswer: '此任務在答案保存功能實施前完成，暫無保存的答案內容。',
              timestamp: session.lastActiveAt || new Date().toISOString(),
              isMigrated: true
            };
            
            session.taskAnswers.push({
              taskId: taskId,
              answer: JSON.stringify(placeholderAnswer),
              submittedAt: session.lastActiveAt || new Date().toISOString(),
              isMigrated: true
            });
            modified = true;
            console.log(`Added placeholder answer for task ${taskId} in session ${session.id}`);
          }
        });
      }
    });
    
    // Save back if modified
    if (modified) {
      localStorage.setItem('discoveryData', JSON.stringify(data));
      console.log('Migration completed - task answers added');
    } else {
      console.log('No migration needed - all completed tasks have answers');
    }
  } catch (error) {
    console.error('Error during task answer migration:', error);
  }
}