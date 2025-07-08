/**
 * V2 Submission Interface Component
 * For text submission and code tasks
 */

import React, { useState } from 'react';
import { Task, Evaluation } from '@/lib/v2/interfaces/base';
import { FileText, Code as CodeIcon, Upload } from 'lucide-react';
import { EvaluationDisplay } from './EvaluationDisplay';

interface SubmissionInterfaceProps {
  task: Task;
  taskType: 'submission' | 'code';
  onSubmit: (response: any) => Promise<void>;
  loading: boolean;
  evaluation: Evaluation | null;
}

export function SubmissionInterface({
  task,
  taskType,
  onSubmit,
  loading,
  evaluation
}: SubmissionInterfaceProps) {
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || loading || submitted) return;
    
    setSubmitted(true);
    await onSubmit({
      content,
      type: taskType,
      ...(taskType === 'code' && { language })
    });
  };

  return (
    <div className="space-y-6">
      {/* Task specific instructions */}
      {taskType === 'code' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-purple-900 mb-2">
            <CodeIcon className="w-5 h-5" />
            <h4 className="font-medium">Code Submission</h4>
          </div>
          <p className="text-purple-800 text-sm">
            Write your code solution below. Make sure to test your code before submitting.
          </p>
        </div>
      )}

      {/* Language selector for code */}
      {taskType === 'code' && !submitted && (
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">
            Language:
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="csharp">C#</option>
          </select>
        </div>
      )}

      {/* Submission area */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-2 bg-gray-50">
          <div className="flex items-center space-x-2 text-gray-700">
            {taskType === 'code' ? (
              <>
                <CodeIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Code Editor</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Text Submission</span>
              </>
            )}
          </div>
        </div>
        
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            taskType === 'code' 
              ? '// Write your code here...' 
              : 'Type your response here...'
          }
          className={`w-full p-4 focus:outline-none resize-none ${
            taskType === 'code' ? 'font-mono text-sm' : ''
          }`}
          rows={15}
          disabled={submitted}
        />
        
        <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 text-sm text-gray-600">
          {content.length} characters
        </div>
      </div>

      {/* Resources or hints */}
      {task.config?.resources && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Resources</h4>
          <ul className="space-y-1">
            {task.config.resources.map((resource: string, index: number) => (
              <li key={index} className="text-blue-800 text-sm">
                • {resource}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Evaluation display */}
      {evaluation && (
        <EvaluationDisplay evaluation={evaluation} />
      )}

      {/* Submit button */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center space-x-2"
        >
          <Upload className="w-5 h-5" />
          <span>Submit {taskType === 'code' ? 'Code' : 'Response'}</span>
        </button>
      )}

      {/* Retry button (for practice) */}
      {submitted && task.metadata?.can_repeat && (
        <button
          onClick={() => {
            setSubmitted(false);
            setContent('');
          }}
          className="w-full py-2 text-blue-600 hover:text-blue-700"
        >
          Try Again
        </button>
      )}
    </div>
  );
}