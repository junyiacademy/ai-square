/* istanbul ignore file */
// PBL Evaluation Types

import { Task } from './pbl';

export interface EvaluateRequestBody {
  conversations: Conversation[];
  task: Task;
  targetDomains?: string[];
  focusKSA?: string[];
  language?: string;
}

export interface Conversation {
  type: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  detailedScores: {
    relevance: number;
    depth: number;
    criticalThinking: number;
    ethicalConsideration: number;
    practicalApplication: number;
  };
  strengths: string[];
  areasForImprovement: string[];
  nextSteps: string[];
  overallAssessment: string;
}

export interface EvaluateResponse {
  success: boolean;
  evaluation?: EvaluationResult;
  error?: string;
}