/**
 * V2 Task List Component
 * Displays tasks within a program
 */

import React from 'react';
import { Task } from '@/lib/v2/interfaces/base';
import { 
  CheckCircle2, 
  Circle, 
  PlayCircle,
  MessageSquare,
  Code,
  FileQuestion,
  FileText,
  Users,
  Clock,
  ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

interface TaskListProps {
  tasks: Task[];
  activeTask?: Task;
  onSelectTask: (task: Task) => void;
  showDetails?: boolean;
}

export function TaskList({
  tasks,
  activeTask,
  onSelectTask,
  showDetails = false
}: TaskListProps) {
  // Get icon for task type
  const getTaskIcon = (type: Task['type']) => {
    switch (type) {
      case 'chat':
        return <MessageSquare className="w-4 h-4" />;
      case 'code':
        return <Code className="w-4 h-4" />;
      case 'quiz':
        return <FileQuestion className="w-4 h-4" />;
      case 'submission':
        return <FileText className="w-4 h-4" />;
      case 'discussion':
        return <Users className="w-4 h-4" />;
    }
  };

  // Get status icon
  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'active':
        return <PlayCircle className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'pending':
        return <Circle className="w-5 h-5 text-gray-400" />;
      case 'skipped':
        return <Circle className="w-5 h-5 text-gray-300" />;
    }
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-600 bg-green-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'hard':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-2">
      {tasks.map((task, index) => {
        const isActive = activeTask?.id === task.id;
        const isSelectable = task.status !== 'pending' || index === 0 || 
                            tasks[index - 1].status === 'completed';

        return (
          <div
            key={task.id}
            onClick={() => isSelectable && onSelectTask(task)}
            className={clsx(
              'group relative rounded-lg border p-4 transition-all cursor-pointer',
              {
                'border-blue-500 bg-blue-50': isActive,
                'border-gray-200 hover:border-gray-300 hover:bg-gray-50': 
                  !isActive && isSelectable,
                'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed': 
                  !isSelectable
              }
            )}
          >
            <div className="flex items-start space-x-3">
              {getStatusIcon(task.status)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">
                    {getTaskIcon(task.type)}
                  </span>
                  <h4 className="font-medium text-gray-900 truncate">
                    {task.title}
                  </h4>
                </div>

                {showDetails && task.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}

                <div className="flex items-center space-x-3 mt-2">
                  {/* Task type badge */}
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    {task.type}
                  </span>

                  {/* Difficulty badge */}
                  {task.metadata?.difficulty && (
                    <span className={clsx(
                      'text-xs px-2 py-1 rounded-full',
                      getDifficultyColor(task.metadata.difficulty)
                    )}>
                      {task.metadata.difficulty}
                    </span>
                  )}

                  {/* Duration */}
                  {task.metadata?.estimated_duration && (
                    <span className="text-xs text-gray-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {task.metadata.estimated_duration} min
                    </span>
                  )}

                  {/* XP reward for Discovery */}
                  {task.config?.xp_reward && (
                    <span className="text-xs text-purple-600 font-medium">
                      +{task.config.xp_reward} XP
                    </span>
                  )}

                  {/* Points for Assessment */}
                  {task.config?.points && (
                    <span className="text-xs text-gray-600">
                      {task.config.points} pts
                    </span>
                  )}
                </div>

                {/* Required KSA */}
                {task.required_ksa.length > 0 && showDetails && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {task.required_ksa.map(ksa => (
                        <span
                          key={ksa}
                          className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded"
                        >
                          {ksa}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action indicator */}
              <ChevronRight className={clsx(
                'w-5 h-5 transition-transform',
                {
                  'text-blue-500 group-hover:translate-x-1': isSelectable,
                  'text-gray-300': !isSelectable
                }
              )} />
            </div>

            {/* Dynamic task indicator */}
            {task.metadata?.is_generated && (
              <div className="absolute top-2 right-2">
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded-full">
                  AI Generated
                </span>
              </div>
            )}

            {/* Progress bar for active task */}
            {isActive && task.status === 'active' && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="text-xs text-blue-700 font-medium">
                  In Progress...
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No tasks available</p>
        </div>
      )}
    </div>
  );
}