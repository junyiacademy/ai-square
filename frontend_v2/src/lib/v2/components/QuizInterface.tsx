/**
 * V2 Quiz Interface Component
 * For assessment quiz questions
 */

import React, { useState, useEffect } from 'react';
import { Task, Program, Evaluation } from '@/lib/v2/interfaces/base';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { EvaluationDisplay } from './EvaluationDisplay';
import clsx from 'clsx';

interface QuizInterfaceProps {
  task: Task;
  program: Program;
  onSubmit: (response: any) => Promise<void>;
  loading: boolean;
  evaluation: Evaluation | null;
}

export function QuizInterface({
  task,
  program,
  onSubmit,
  loading,
  evaluation
}: QuizInterfaceProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Timer
  useEffect(() => {
    if (!submitted && !evaluation) {
      const interval = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [submitted, evaluation]);

  const handleSubmit = async () => {
    if (!selectedAnswer || loading || submitted) return;
    
    setSubmitted(true);
    await onSubmit({
      answer: selectedAnswer,
      time_spent: timeSpent
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show feedback immediately if enabled and evaluated
  const showFeedback = program.config.instant_feedback && evaluation;

  return (
    <div className="space-y-6">
      {/* Timer and question info */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4" />
          <span>Time: {formatTime(timeSpent)}</span>
        </div>
        {task.config?.time_limit && (
          <span>Time limit: {task.config.time_limit} min</span>
        )}
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {task.config?.question_text || task.description}
        </h3>

        {/* Options */}
        <div className="space-y-3">
          {task.config?.options?.map((option: any, index: number) => {
            const optionId = option.id || String.fromCharCode(65 + index);
            const isSelected = selectedAnswer === optionId;
            const isCorrect = showFeedback && evaluation?.result?.correct_answer === optionId;
            const isIncorrect = showFeedback && isSelected && !evaluation?.result?.is_correct;

            return (
              <label
                key={optionId}
                className={clsx(
                  'block p-4 rounded-lg border-2 cursor-pointer transition-all',
                  {
                    'border-blue-500 bg-blue-50': isSelected && !showFeedback,
                    'border-green-500 bg-green-50': isCorrect,
                    'border-red-500 bg-red-50': isIncorrect,
                    'border-gray-200 hover:border-gray-300': !isSelected && !showFeedback,
                    'opacity-50 cursor-not-allowed': submitted
                  }
                )}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="answer"
                    value={optionId}
                    checked={isSelected}
                    onChange={(e) => setSelectedAnswer(e.target.value)}
                    disabled={submitted}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3">
                      <span className={clsx(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                        {
                          'bg-blue-600 text-white': isSelected && !showFeedback,
                          'bg-green-600 text-white': isCorrect,
                          'bg-red-600 text-white': isIncorrect,
                          'bg-gray-200 text-gray-700': !isSelected && !showFeedback
                        }
                      )}>
                        {optionId}
                      </span>
                      <span className={clsx(
                        'text-gray-900',
                        {
                          'font-medium': isSelected || isCorrect
                        }
                      )}>
                        {option.text}
                      </span>
                    </div>
                    {isCorrect && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {isIncorrect && <XCircle className="w-5 h-5 text-red-600" />}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Explanation (if instant feedback is enabled) */}
        {showFeedback && evaluation?.result?.explanation && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-1">Explanation</h4>
            <p className="text-blue-800">{evaluation.result.explanation}</p>
          </div>
        )}
      </div>

      {/* Full evaluation display (if not instant feedback) */}
      {evaluation && !program.config.instant_feedback && (
        <EvaluationDisplay evaluation={evaluation} />
      )}

      {/* Submit button */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!selectedAnswer || loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Submit Answer
        </button>
      )}

      {/* Skip button (if allowed) */}
      {!submitted && program.config.allow_skip && (
        <button
          onClick={() => onSubmit({ answer: null, skipped: true, time_spent: timeSpent })}
          className="w-full py-2 text-gray-600 hover:text-gray-800"
        >
          Skip Question
        </button>
      )}
    </div>
  );
}