import type { IInteraction } from '../unified-learning';

// Extended interaction type for assessment answers
interface AssessmentInteraction extends Omit<IInteraction, 'type' | 'content'> {
  type: 'assessment_answer';
  context: {
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
    ksa_mapping?: Record<string, unknown>;
  };
}

describe('AssessmentInteraction', () => {
  it('should create valid assessment interaction', () => {
    const interaction: AssessmentInteraction = {
      timestamp: new Date().toISOString(),
      type: 'assessment_answer',
      context: {
        questionId: 'q1',
        selectedAnswer: 'A',
        isCorrect: true,
        timeSpent: 30
      }
    };

    expect(interaction.type).toBe('assessment_answer');
    expect(interaction.context.questionId).toBe('q1');
    expect(interaction.context.isCorrect).toBe(true);
  });

  it('should support optional ksa_mapping', () => {
    const interaction: AssessmentInteraction = {
      timestamp: new Date().toISOString(),
      type: 'assessment_answer',
      context: {
        questionId: 'q2',
        selectedAnswer: 'B',
        isCorrect: false,
        timeSpent: 45,
        ksa_mapping: {
          knowledge: ['K1', 'K2'],
          skills: ['S1']
        }
      }
    };

    expect(interaction.context.ksa_mapping).toBeDefined();
    expect(interaction.context.ksa_mapping?.knowledge).toEqual(['K1', 'K2']);
  });

  it('should be assignable to IInteraction array with proper type casting', () => {
    const assessmentInteraction: AssessmentInteraction = {
      timestamp: new Date().toISOString(),
      type: 'assessment_answer',
      context: {
        questionId: 'q3',
        selectedAnswer: 'C',
        isCorrect: true,
        timeSpent: 20
      }
    };

    // This should work with proper type casting
    const interactions: IInteraction[] = [assessmentInteraction as unknown as IInteraction];
    
    expect(interactions).toHaveLength(1);
    expect(interactions[0].timestamp).toBe(assessmentInteraction.timestamp);
  });

  it('should handle type checking with type guards', () => {
    const isAssessmentInteraction = (
      interaction: IInteraction | AssessmentInteraction
    ): interaction is AssessmentInteraction => {
      return (interaction as AssessmentInteraction).type === 'assessment_answer' &&
        'context' in interaction &&
        typeof (interaction as AssessmentInteraction).context === 'object';
    };

    const mixedInteractions: (IInteraction | AssessmentInteraction)[] = [
      {
        timestamp: new Date().toISOString(),
        type: 'user_input',
        content: 'test'
      },
      {
        timestamp: new Date().toISOString(),
        type: 'assessment_answer',
        context: {
          questionId: 'q4',
          selectedAnswer: 'D',
          isCorrect: false,
          timeSpent: 60
        }
      } as AssessmentInteraction
    ];

    const assessmentOnly = mixedInteractions.filter(isAssessmentInteraction);
    expect(assessmentOnly).toHaveLength(1);
    expect(assessmentOnly[0].context.questionId).toBe('q4');
  });
});