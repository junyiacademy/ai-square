/**
 * V2 Task Panel Component
 * Main task interaction area
 */

import React, { useState } from 'react';
import { Task, Program, Scenario, Evaluation } from '@/lib/v2/interfaces/base';
import { ChatInterface } from './ChatInterface';
import { QuizInterface } from './QuizInterface';
import { SubmissionInterface } from './SubmissionInterface';
import { Loader2 } from 'lucide-react';

interface TaskPanelProps {
  task: Task;
  program: Program;
  scenario: Scenario;
  onSubmit: (taskId: string, response: any) => Promise<Evaluation>;
}

export function TaskPanel({
  task,
  program,
  scenario,
  onSubmit
}: TaskPanelProps) {
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (response: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await onSubmit(task.id, response);
      setEvaluation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setLoading(false);
    }
  };

  // Render appropriate interface based on task type
  const renderInterface = () => {
    switch (task.type) {
      case 'chat':
      case 'discussion':
        return (
          <ChatInterface
            task={task}
            onSubmit={handleSubmit}
            loading={loading}
            evaluation={evaluation}
          />
        );
      
      case 'quiz':
        return (
          <QuizInterface
            task={task}
            program={program}
            onSubmit={handleSubmit}
            loading={loading}
            evaluation={evaluation}
          />
        );
      
      case 'submission':
      case 'code':
        return (
          <SubmissionInterface
            task={task}
            taskType={task.type}
            onSubmit={handleSubmit}
            loading={loading}
            evaluation={evaluation}
          />
        );
      
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-600">
              Task type "{task.type}" is not yet implemented
            </p>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Task header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
          {task.description && (
            <p className="mt-1 text-gray-600">{task.description}</p>
          )}
          
          {/* Task metadata */}
          <div className="flex items-center space-x-4 mt-3 text-sm">
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
              {task.type}
            </span>
            {task.metadata?.difficulty && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                {task.metadata.difficulty}
              </span>
            )}
            {task.config?.points && (
              <span className="text-gray-600">
                {task.config.points} points
              </span>
            )}
            {task.config?.xp_reward && (
              <span className="text-purple-600 font-medium">
                +{task.config.xp_reward} XP
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Task content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          {task.instructions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-1">Instructions</h3>
              <p className="text-blue-800">{task.instructions}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {renderInterface()}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <p className="mt-2 text-gray-600">Evaluating your response...</p>
          </div>
        </div>
      )}
    </div>
  );
}