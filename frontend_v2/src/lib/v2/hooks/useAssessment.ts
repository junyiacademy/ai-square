/**
 * V2 useAssessment Hook
 * Specialized hook for assessment scenarios
 */

import { useState, useCallback } from 'react';
import { Scenario, Program, Task, Evaluation } from '@/lib/v2/interfaces/base';

interface AssessmentAttempt {
  scenario: Scenario;
  program: Program;
  firstTask: Task;
  totalQuestions: number;
}

interface AssessmentResult {
  program: Program;
  summary: {
    score: number;
    level: string;
    timeSpent: number;
    questionsAnswered: number;
    correctAnswers: number;
  };
  byDomain: Record<string, { correct: number; total: number; percentage: number }>;
  questions: Array<{
    question: string;
    selected: string;
    correct: string;
    isCorrect: boolean;
    points: number;
    domain?: string;
  }>;
}

interface UseAssessmentReturn {
  loading: boolean;
  error: string | null;
  currentAttempt: AssessmentAttempt | null;
  startAssessment: (
    sourceCode: string,
    attemptType: 'practice' | 'formal',
    config?: any
  ) => Promise<AssessmentAttempt>;
  submitAnswer: (
    taskId: string,
    answer: string,
    timeSpent?: number
  ) => Promise<{
    evaluation: Evaluation;
    feedback?: string;
    nextTask?: Task;
  }>;
  getResults: (programId: string) => Promise<AssessmentResult>;
  getHistory: (sourceCode: string) => Promise<any>;
}

export function useAssessment(): UseAssessmentReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<AssessmentAttempt | null>(null);

  const startAssessment = useCallback(async (
    sourceCode: string,
    attemptType: 'practice' | 'formal' = 'practice',
    config?: any
  ): Promise<AssessmentAttempt> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v2/assessment/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCode,
          attemptType,
          config
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start assessment');
      }

      const data = await response.json();
      const attempt: AssessmentAttempt = {
        scenario: data.scenario,
        program: data.program,
        firstTask: data.firstTask,
        totalQuestions: data.totalQuestions
      };

      setCurrentAttempt(attempt);
      return attempt;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start assessment';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const submitAnswer = useCallback(async (
    taskId: string,
    answer: string,
    timeSpent?: number
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v2/tasks/${taskId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: { answer, time_spent: timeSpent }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit answer');
      }

      const data = await response.json();
      
      // Update current attempt if next task is provided
      if (data.nextTask && currentAttempt) {
        setCurrentAttempt({
          ...currentAttempt,
          firstTask: data.nextTask
        });
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit answer';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [currentAttempt]);

  const getResults = useCallback(async (programId: string): Promise<AssessmentResult> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v2/assessment/results/${programId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get results');
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get results';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getHistory = useCallback(async (sourceCode: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/v2/assessment/history?sourceCode=${encodeURIComponent(sourceCode)}`
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get history');
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get history';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    currentAttempt,
    startAssessment,
    submitAnswer,
    getResults,
    getHistory
  };
}