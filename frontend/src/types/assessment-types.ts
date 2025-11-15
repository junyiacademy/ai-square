/**
 * Assessment-specific type definitions
 * Extends unified learning types for assessment module
 */

import type { IInteraction } from './unified-learning';

/**
 * Assessment Answer Interaction
 * Used when users submit answers to assessment questions
 */
export interface AssessmentInteraction extends Omit<IInteraction, 'type' | 'content'> {
  type: 'assessment_answer';
  context: {
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
    ksa_mapping?: Record<string, unknown>;
  };
}

/**
 * Assessment Question Definition
 */
export interface AssessmentQuestion {
  id: string;
  domain: string;
  question: string;
  options: Record<string, string>;
  difficulty: string;
  correct_answer: string;
  explanation: string;
  ksa_mapping?: {
    knowledge?: string[];
    skills?: string[];
    attitudes?: string[];
  };
}

/**
 * Domain Score for Assessment Results
 */
export interface DomainScore {
  domain: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  competencies: Set<string>;
  ksa: {
    knowledge: Set<string>;
    skills: Set<string>;
    attitudes: Set<string>;
  };
}

/**
 * Type guard to check if an interaction is an assessment answer
 */
export function isAssessmentInteraction(
  interaction: IInteraction | AssessmentInteraction
): interaction is AssessmentInteraction {
  return (interaction as AssessmentInteraction).type === 'assessment_answer' &&
    'context' in interaction &&
    typeof (interaction as AssessmentInteraction).context === 'object';
}

/**
 * Convert AssessmentInteraction to IInteraction for storage
 */
export function toIInteraction(assessment: AssessmentInteraction): IInteraction {
  return {
    timestamp: assessment.timestamp,
    type: 'system_event' as const,
    content: {
      eventType: 'assessment_answer',
      ...assessment.context
    },
    metadata: assessment.metadata
  };
}

/**
 * Convert IInteraction to AssessmentInteraction for type safety
 */
export function fromIInteraction(interaction: IInteraction): AssessmentInteraction | null {
  if (interaction.type === 'system_event' &&
      typeof interaction.content === 'object' &&
      interaction.content !== null &&
      'eventType' in interaction.content &&
      interaction.content.eventType === 'assessment_answer') {
    const content = interaction.content as Record<string, unknown>;
    return {
      timestamp: interaction.timestamp,
      type: 'assessment_answer',
      context: {
        questionId: content.questionId as string || '',
        selectedAnswer: content.selectedAnswer as string || '',
        isCorrect: content.isCorrect as boolean || false,
        timeSpent: content.timeSpent as number || 0,
        ksa_mapping: content.ksa_mapping as Record<string, unknown> | undefined
      },
      metadata: interaction.metadata
    };
  }
  return null;
}
