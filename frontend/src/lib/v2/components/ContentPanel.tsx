'use client';

import { Task } from '@/lib/v2/types';
import { BookOpen, FileText, Video, Link as LinkIcon } from 'lucide-react';

interface ContentPanelProps {
  task: Task;
  learningType: string;
  language: string;
}

export function ContentPanel({ task, learningType, language }: ContentPanelProps) {
  const getTaskTypeLabel = () => {
    switch (task.task_type) {
      case 'learning':
        return 'Learning Module';
      case 'practice':
        return 'Practice Activity';
      case 'assessment':
        return 'Assessment';
      default:
        return 'Task';
    }
  };

  const getTaskTypeIcon = () => {
    switch (task.task_type) {
      case 'learning':
        return <BookOpen className="w-5 h-5" />;
      case 'practice':
        return <FileText className="w-5 h-5" />;
      case 'assessment':
        return <FileText className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const renderResource = (resource: any) => {
    const icons: Record<string, any> = {
      video: <Video className="w-4 h-4" />,
      article: <FileText className="w-4 h-4" />,
      link: <LinkIcon className="w-4 h-4" />
    };

    return (
      <a
        key={resource.title}
        href={resource.url}
        className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        {icons[resource.type] || <LinkIcon className="w-4 h-4" />}
        <span className="text-sm">{resource.title}</span>
      </a>
    );
  };

  return (
    <div className="h-full p-6">
      {/* Task Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          {getTaskTypeIcon()}
          <span>{getTaskTypeLabel()}</span>
          {task.estimated_minutes && (
            <>
              <span>•</span>
              <span>~{task.estimated_minutes} minutes</span>
            </>
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
        <p className="text-gray-600 mt-2">{task.description}</p>
      </div>

      {/* Instructions */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Instructions</h2>
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap">{task.instructions}</p>
        </div>
      </div>

      {/* Learning Objectives (if available) */}
      {task.metadata?.learning_objectives && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Learning Objectives</h2>
          <ul className="space-y-2">
            {task.metadata.learning_objectives.map((objective: string, index: number) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span className="text-gray-700">{objective}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Practice Steps (if available) */}
      {task.metadata?.practice_steps && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Practice Steps</h2>
          <ol className="space-y-3">
            {task.metadata.practice_steps.map((step: string, index: number) => (
              <li key={index} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <span className="text-gray-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Resources (if available) */}
      {task.metadata?.resources && task.metadata.resources.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Resources</h2>
          <div className="space-y-2">
            {task.metadata.resources.map(renderResource)}
          </div>
        </div>
      )}

      {/* Task-specific content based on type */}
      {task.task_type === 'assessment' && task.metadata?.questions && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Assessment Questions</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              Complete the questions in the action panel on the right.
              {task.metadata.time_limit && (
                <span className="block mt-1">
                  Time limit: {task.metadata.time_limit} minutes
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Additional Metadata Display */}
      {task.metadata?.ai_modules && (
        <div className="mt-8 pt-6 border-t">
          <h3 className="text-sm font-medium text-gray-600 mb-2">AI Assistance Available</h3>
          <div className="flex flex-wrap gap-2">
            {task.metadata.ai_modules.map((module: string) => (
              <span
                key={module}
                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
              >
                {module.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}