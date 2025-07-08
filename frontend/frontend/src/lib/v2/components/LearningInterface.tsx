'use client';

import { useState, useEffect } from 'react';
import { TaskPanel } from './TaskPanel';
import { ContentPanel } from './ContentPanel';
import { ActionPanel } from './ActionPanel';
import { useProgram } from '@/lib/v2/hooks/useProgram';
import { useLogs } from '@/lib/v2/hooks/useLogs';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

interface LearningInterfaceProps {
  scenarioId: string;
  programId: string;
}

export function LearningInterface({ scenarioId, programId }: LearningInterfaceProps) {
  const { program, loading, error, updateProgram } = useProgram(scenarioId, programId);
  const { logAction, logTaskCompletion, logProgramCompletion } = useLogs(scenarioId, programId);
  const { t } = useTranslation();
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [taskStatuses, setTaskStatuses] = useState<Record<string, 'pending' | 'in-progress' | 'completed'>>({});

  useEffect(() => {
    if (program?.tasks && program.tasks.length > 0 && !currentTaskId) {
      // Set first incomplete task as current
      const firstIncompleteTask = program.tasks.find(task => 
        !taskStatuses[task.id] || taskStatuses[task.id] === 'pending'
      );
      if (firstIncompleteTask) {
        setCurrentTaskId(firstIncompleteTask.id);
        setTaskStatuses(prev => ({ ...prev, [firstIncompleteTask.id]: 'in-progress' }));
      }
    }
  }, [program, currentTaskId, taskStatuses]);

  const handleTaskSelect = (taskId: string) => {
    setCurrentTaskId(taskId);
    if (!taskStatuses[taskId] || taskStatuses[taskId] === 'pending') {
      setTaskStatuses(prev => ({ ...prev, [taskId]: 'in-progress' }));
    }
  };

  const handleTaskComplete = async (taskId: string, evaluation: any) => {
    setTaskStatuses(prev => ({ ...prev, [taskId]: 'completed' }));
    await logTaskCompletion(taskId, evaluation);
    
    // Check if all tasks are completed
    if (program?.tasks) {
      const allCompleted = program.tasks.every(task => 
        taskStatuses[task.id] === 'completed' || (task.id === taskId)
      );
      
      if (allCompleted) {
        await logProgramCompletion();
        await updateProgram({ status: 'completed' });
      }
    }
    
    // Move to next task if available
    const currentIndex = program?.tasks?.findIndex(t => t.id === taskId) || 0;
    if (program?.tasks && currentIndex < program.tasks.length - 1) {
      const nextTask = program.tasks[currentIndex + 1];
      handleTaskSelect(nextTask.id);
    }
  };

  const handleAction = async (action: any) => {
    await logAction(currentTaskId || '', action);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="text-center text-red-600 py-8">
        {t('v2.error.loadProgram', 'Failed to load program')}
      </div>
    );
  }

  const currentTask = program.tasks?.find(t => t.id === currentTaskId);

  return (
    <div className="flex h-[calc(100vh-60px)]">
      {/* Left Panel - Task List */}
      <div className="w-80 bg-white border-r overflow-y-auto">
        <TaskPanel
          tasks={program.tasks || []}
          currentTaskId={currentTaskId}
          taskStatuses={taskStatuses}
          onTaskSelect={handleTaskSelect}
        />
      </div>

      {/* Middle Panel - Content */}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        {currentTask ? (
          <ContentPanel task={currentTask} scenarioType={program.type} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            {t('v2.selectTask', 'Select a task to begin')}
          </div>
        )}
      </div>

      {/* Right Panel - Actions */}
      <div className="w-96 bg-white border-l overflow-y-auto">
        {currentTask && (
          <ActionPanel
            task={currentTask}
            scenarioType={program.type}
            onAction={handleAction}
            onComplete={(evaluation) => handleTaskComplete(currentTask.id, evaluation)}
          />
        )}
      </div>
    </div>
  );
}