'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, CheckCircle, XCircle, MessageSquare, FileText, Video, Brain } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  type: 'question' | 'conversation' | 'task' | 'reflection';
  content: string;
  options?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  correct_answer?: string;
  explanation?: string;
  userResponse?: string;
  isCorrect?: boolean;
  timestamp?: Date;
  metadata?: {
    duration?: number;
    turns?: number;
    score?: number;
  };
}

interface TaskReviewProps {
  tasks: Task[];
  selectedTaskIds: string[];
  onClose: () => void;
  title?: string;
  nodeType?: string;
}

export function TaskReview({ 
  tasks, 
  selectedTaskIds,
  onClose,
  title = "Related Tasks",
  nodeType = "KSA"
}: TaskReviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter tasks based on selected IDs
  const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));
  
  if (selectedTasks.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-center text-gray-500 py-8">
          <div className="mb-3">
            <FileText className="w-12 h-12 text-gray-300 mx-auto" />
          </div>
          <p>No tasks available for this {nodeType} node</p>
        </div>
      </div>
    );
  }

  const currentTask = selectedTasks[currentIndex];

  const handleNext = () => {
    if (currentIndex < selectedTasks.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'question':
        return <MessageSquare className="w-5 h-5" />;
      case 'conversation':
        return <MessageSquare className="w-5 h-5" />;
      case 'task':
        return <FileText className="w-5 h-5" />;
      case 'reflection':
        return <Brain className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'question':
        return 'bg-blue-100 text-blue-800';
      case 'conversation':
        return 'bg-green-100 text-green-800';
      case 'task':
        return 'bg-purple-100 text-purple-800';
      case 'reflection':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOptionClass = (optionKey: string) => {
    if (currentTask.type !== 'question' || !currentTask.userResponse) {
      return 'border-gray-300 hover:bg-gray-50';
    }
    
    const isUserChoice = currentTask.userResponse === optionKey;
    const isCorrect = currentTask.correct_answer === optionKey;
    
    if (isUserChoice && isCorrect) {
      return 'border-green-500 bg-green-50 text-green-900';
    } else if (isUserChoice && !isCorrect) {
      return 'border-red-500 bg-red-50 text-red-900';
    } else if (!isUserChoice && isCorrect) {
      return 'border-green-300 bg-green-25 text-green-700';
    }
    return 'border-gray-300';
  };

  const getOptionIcon = (optionKey: string) => {
    if (currentTask.type !== 'question' || !currentTask.userResponse) return null;
    
    const isUserChoice = currentTask.userResponse === optionKey;
    const isCorrect = currentTask.correct_answer === optionKey;
    
    if (isUserChoice && isCorrect) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else if (isUserChoice && !isCorrect) {
      return <XCircle className="w-5 h-5 text-red-600" />;
    } else if (!isUserChoice && isCorrect) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return null;
  };

  const renderTaskContent = () => {
    switch (currentTask.type) {
      case 'question':
        return (
          <>
            {/* Question Content */}
            <div className="mb-6">
              <h4 className="text-base font-medium text-gray-900 mb-4 leading-relaxed">
                {currentTask.content}
              </h4>
              
              {/* Answer Status */}
              {currentTask.userResponse && currentTask.isCorrect !== undefined && (
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                  currentTask.isCorrect 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {currentTask.isCorrect ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Correct
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Incorrect
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Options */}
            {currentTask.options && (
              <div className="space-y-3 mb-6">
                {Object.entries(currentTask.options).map(([optionKey, optionText]) => (
                  <div
                    key={optionKey}
                    className={`p-4 rounded-lg border-2 transition-colors ${getOptionClass(optionKey)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-sm font-medium flex items-center justify-center mt-0.5">
                        {optionKey.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">{optionText}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {getOptionIcon(optionKey)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        );

      case 'conversation':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Conversation Summary
              </h5>
              <p className="text-sm text-blue-800 leading-relaxed">
                {currentTask.content}
              </p>
              {currentTask.metadata?.turns && (
                <div className="mt-2 text-xs text-blue-600">
                  Total turns: {currentTask.metadata.turns}
                </div>
              )}
            </div>
            
            {currentTask.userResponse && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Your Response</h5>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {currentTask.userResponse}
                </p>
              </div>
            )}
          </div>
        );

      case 'task':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h5 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Task Description
              </h5>
              <p className="text-sm text-purple-800 leading-relaxed">
                {currentTask.content}
              </p>
              {currentTask.metadata?.score && (
                <div className="mt-2 text-xs text-purple-600">
                  Score: {currentTask.metadata.score}%
                </div>
              )}
            </div>
            
            {currentTask.userResponse && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Your Work</h5>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {currentTask.userResponse}
                </p>
              </div>
            )}
          </div>
        );

      case 'reflection':
        return (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h5 className="font-medium text-orange-900 mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Reflection Prompt
              </h5>
              <p className="text-sm text-orange-800 leading-relaxed">
                {currentTask.content}
              </p>
            </div>
            
            {currentTask.userResponse && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Your Reflection</h5>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {currentTask.userResponse}
                </p>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-gray-500">
            Unknown task type: {currentTask.type}
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Task Navigation */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">
              Task {currentIndex + 1} of {selectedTasks.length}
            </div>
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTaskTypeColor(currentTask.type)}`}>
              {getTaskIcon(currentTask.type)}
              {currentTask.type.charAt(0).toUpperCase() + currentTask.type.slice(1)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className={`p-2 rounded-lg transition-colors ${
                currentIndex === 0
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === selectedTasks.length - 1}
              className={`p-2 rounded-lg transition-colors ${
                currentIndex === selectedTasks.length - 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Task Content */}
      <div className="p-6">
        {/* Task Title */}
        <div className="mb-4">
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            {currentTask.title}
          </h4>
          {currentTask.timestamp && (
            <div className="text-sm text-gray-500">
              Completed: {currentTask.timestamp.toLocaleString()}
            </div>
          )}
        </div>

        {/* Task Content */}
        {renderTaskContent()}

        {/* Explanation */}
        {currentTask.explanation && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-medium text-blue-900 mb-2">Explanation</h5>
            <p className="text-sm text-blue-800 leading-relaxed">
              {currentTask.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Progress Indicators */}
      <div className="px-6 py-3 bg-gray-50 border-t">
        <div className="flex gap-1">
          {selectedTasks.map((task, index) => (
            <button
              key={task.id}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentIndex
                  ? 'bg-blue-600'
                  : index < currentIndex
                  ? 'bg-blue-300'
                  : 'bg-gray-300'
              }`}
              title={task.title}
            />
          ))}
        </div>
      </div>
    </div>
  );
}