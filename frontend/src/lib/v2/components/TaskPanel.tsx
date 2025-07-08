'use client';

import { Task } from '@/lib/v2/types';
import { CheckCircle, Circle, PlayCircle, Lock } from 'lucide-react';

interface TaskPanelProps {
  tasks: Task[];
  currentTaskId: string | null;
  onTaskSelect: (taskId: string) => void;
  onProgramComplete: () => void;
}

export function TaskPanel({ tasks, currentTaskId, onTaskSelect, onProgramComplete }: TaskPanelProps) {
  const getTaskStatus = (task: Task, index: number) => {
    if (task.metadata?.status === 'completed') return 'completed';
    if (task.id === currentTaskId) return 'current';
    
    // Check if previous tasks are completed
    const previousCompleted = tasks
      .slice(0, index)
      .every(t => t.metadata?.status === 'completed');
    
    return previousCompleted ? 'available' : 'locked';
  };

  const getTaskIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'current':
        return <PlayCircle className="w-5 h-5 text-blue-500" />;
      case 'available':
        return <Circle className="w-5 h-5 text-gray-400" />;
      case 'locked':
        return <Lock className="w-5 h-5 text-gray-300" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const allTasksCompleted = tasks.every(t => t.metadata?.status === 'completed');
  const completedCount = tasks.filter(t => t.metadata?.status === 'completed').length;
  const progressPercentage = (completedCount / tasks.length) * 100;

  return (
    <div className="h-full flex flex-col">
      {/* Progress Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-2">Tasks</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{completedCount}/{tasks.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {tasks.map((task, index) => {
            const status = getTaskStatus(task, index);
            const isClickable = status !== 'locked';
            
            return (
              <div
                key={task.id}
                onClick={() => isClickable && onTaskSelect(task.id)}
                className={`
                  p-3 rounded-lg border transition-all
                  ${currentTaskId === task.id 
                    ? 'bg-blue-50 border-blue-300' 
                    : 'bg-white border-gray-200'
                  }
                  ${isClickable 
                    ? 'cursor-pointer hover:shadow-sm' 
                    : 'cursor-not-allowed opacity-60'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getTaskIcon(status)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{task.title}</h3>
                    <p className="text-xs text-gray-600 mt-0.5">{task.description}</p>
                    {task.estimated_minutes && (
                      <p className="text-xs text-gray-500 mt-1">
                        ~{task.estimated_minutes} min
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Complete Program Button */}
      {allTasksCompleted && (
        <div className="p-4 border-t">
          <button
            onClick={onProgramComplete}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Complete Program
          </button>
        </div>
      )}
    </div>
  );
}