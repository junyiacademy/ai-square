import type { IInteraction } from '../unified-learning';
import { 
  AssessmentInteraction, 
  isAssessmentInteraction, 
  toIInteraction, 
  fromIInteraction 
} from '../assessment-types';

describe('Assessment Types', () => {
  describe('isAssessmentInteraction', () => {
    it('should identify assessment interactions correctly', () => {
      const assessment: AssessmentInteraction = {
        timestamp: '2024-01-01T00:00:00Z',
        type: 'assessment_answer',
        context: {
          questionId: 'q1',
          selectedAnswer: 'A',
          isCorrect: true,
          timeSpent: 30
        }
      };

      const regular: IInteraction = {
        timestamp: '2024-01-01T00:00:00Z',
        type: 'user_input',
        content: 'test'
      };

      expect(isAssessmentInteraction(assessment)).toBe(true);
      expect(isAssessmentInteraction(regular)).toBe(false);
    });
  });

  describe('toIInteraction', () => {
    it('should convert AssessmentInteraction to IInteraction', () => {
      const assessment: AssessmentInteraction = {
        timestamp: '2024-01-01T00:00:00Z',
        type: 'assessment_answer',
        context: {
          questionId: 'q1',
          selectedAnswer: 'A',
          isCorrect: true,
          timeSpent: 30,
          ksa_mapping: { knowledge: ['K1'] }
        },
        metadata: { testId: 'test123' }
      };

      const interaction = toIInteraction(assessment);

      expect(interaction.type).toBe('system_event');
      expect(interaction.content).toEqual({
        eventType: 'assessment_answer',
        questionId: 'q1',
        selectedAnswer: 'A',
        isCorrect: true,
        timeSpent: 30,
        ksa_mapping: { knowledge: ['K1'] }
      });
      expect(interaction.metadata).toEqual({ testId: 'test123' });
    });
  });

  describe('fromIInteraction', () => {
    it('should convert IInteraction to AssessmentInteraction when valid', () => {
      const interaction: IInteraction = {
        timestamp: '2024-01-01T00:00:00Z',
        type: 'system_event',
        content: {
          eventType: 'assessment_answer',
          questionId: 'q1',
          selectedAnswer: 'A',
          isCorrect: true,
          timeSpent: 30
        }
      };

      const assessment = fromIInteraction(interaction);

      expect(assessment).not.toBeNull();
      expect(assessment?.type).toBe('assessment_answer');
      expect(assessment?.context.questionId).toBe('q1');
      expect(assessment?.context.isCorrect).toBe(true);
    });

    it('should return null for non-assessment interactions', () => {
      const interaction: IInteraction = {
        timestamp: '2024-01-01T00:00:00Z',
        type: 'user_input',
        content: 'test'
      };

      const assessment = fromIInteraction(interaction);
      expect(assessment).toBeNull();
    });

    it('should handle missing fields gracefully', () => {
      const interaction: IInteraction = {
        timestamp: '2024-01-01T00:00:00Z',
        type: 'system_event',
        content: {
          eventType: 'assessment_answer'
          // Missing other fields
        }
      };

      const assessment = fromIInteraction(interaction);

      expect(assessment).not.toBeNull();
      expect(assessment?.context.questionId).toBe('');
      expect(assessment?.context.selectedAnswer).toBe('');
      expect(assessment?.context.isCorrect).toBe(false);
      expect(assessment?.context.timeSpent).toBe(0);
    });
  });
});