import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import AssessmentPage from '../page';

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

// Mock the assessment components
jest.mock('../../components/assessment/AssessmentQuiz', () => {
  return function MockAssessmentQuiz({ onComplete, questions }: any) {
    return (
      <div data-testid="assessment-quiz">
        <button 
          onClick={() => onComplete([
            { questionId: 'E001', selectedAnswer: 'b', timeSpent: 30, isCorrect: true }
          ])}
        >
          Complete Quiz
        </button>
      </div>
    );
  };
});

jest.mock('../../components/assessment/AssessmentResults', () => {
  return function MockAssessmentResults({ result, onRetake }: any) {
    return (
      <div data-testid="assessment-results">
        <div>Score: {result.overallScore}%</div>
        <button onClick={onRetake}>Retake</button>
      </div>
    );
  };
});

// Mock fetch
global.fetch = jest.fn();

const mockT = jest.fn((key) => key);
const mockUseTranslation = useTranslation as jest.MockedFunction<typeof useTranslation>;

describe('AssessmentPage', () => {
  beforeEach(() => {
    mockUseTranslation.mockReturnValue({
      t: mockT,
      i18n: { language: 'en' },
    } as any);

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        assessment_config: {
          total_questions: 12,
          time_limit_minutes: 15,
          passing_score: 60,
          domains: ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai']
        },
        domains: {
          engaging_with_ai: {
            name: 'Engaging with AI',
            description: 'Understanding and effectively communicating with AI systems',
            questions: 3
          },
          creating_with_ai: {
            name: 'Creating with AI',
            description: 'Using AI tools to enhance creativity and productivity',
            questions: 3
          },
          managing_with_ai: {
            name: 'Managing with AI',
            description: 'Understanding AI limitations, privacy, and ethical considerations',
            questions: 3
          },
          designing_with_ai: {
            name: 'Designing with AI',
            description: 'Strategic thinking about AI implementation and innovation',
            questions: 3
          }
        },
        questions: [
          {
            id: 'E001',
            domain: 'engaging_with_ai',
            difficulty: 'basic',
            type: 'multiple_choice',
            question: 'What is the most effective way to get better results from an AI chatbot?',
            options: {
              a: 'Ask very general questions',
              b: 'Provide clear, specific prompts with context',
              c: 'Use only yes/no questions',
              d: 'Always ask multiple questions at once'
            },
            correct_answer: 'b',
            explanation: 'Clear, specific prompts with context help AI understand exactly what you need.',
            ksa_mapping: {
              knowledge: ['K1.1', 'K1.2'],
              skills: ['S1.1'],
              attitudes: ['A1.1']
            }
          }
        ]
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<AssessmentPage />);
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('renders intro screen after loading', async () => {
    render(<AssessmentPage />);
    
    await waitFor(() => {
      expect(screen.getByText('title')).toBeInTheDocument();
      expect(screen.getByText('description')).toBeInTheDocument();
      expect(screen.getByText('startAssessment')).toBeInTheDocument();
    });
  });

  it('starts assessment when start button is clicked', async () => {
    render(<AssessmentPage />);
    
    await waitFor(() => {
      expect(screen.getByText('startAssessment')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('startAssessment'));
    
    await waitFor(() => {
      expect(screen.getByTestId('assessment-quiz')).toBeInTheDocument();
    });
  });

  it('completes assessment and shows results', async () => {
    render(<AssessmentPage />);
    
    await waitFor(() => {
      expect(screen.getByText('startAssessment')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('startAssessment'));
    
    await waitFor(() => {
      expect(screen.getByTestId('assessment-quiz')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Complete Quiz'));
    
    await waitFor(() => {
      expect(screen.getByTestId('assessment-results')).toBeInTheDocument();
      expect(screen.getByText('Score: 100%')).toBeInTheDocument();
    });
  });

  it('allows retaking assessment', async () => {
    render(<AssessmentPage />);
    
    // Complete the assessment
    await waitFor(() => {
      expect(screen.getByText('startAssessment')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('startAssessment'));
    
    await waitFor(() => {
      expect(screen.getByTestId('assessment-quiz')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Complete Quiz'));
    
    await waitFor(() => {
      expect(screen.getByTestId('assessment-results')).toBeInTheDocument();
    });

    // Retake assessment
    fireEvent.click(screen.getByText('Retake'));
    
    await waitFor(() => {
      expect(screen.getByText('title')).toBeInTheDocument();
      expect(screen.getByText('startAssessment')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(<AssessmentPage />);
    
    await waitFor(() => {
      expect(screen.getByText('errorLoading')).toBeInTheDocument();
    });
  });

  it('calculates assessment results correctly', async () => {
    render(<AssessmentPage />);
    
    await waitFor(() => {
      expect(screen.getByText('startAssessment')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('startAssessment'));
    
    await waitFor(() => {
      expect(screen.getByTestId('assessment-quiz')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Complete Quiz'));
    
    await waitFor(() => {
      expect(screen.getByTestId('assessment-results')).toBeInTheDocument();
      // Should show 100% since the mock answer is correct
      expect(screen.getByText('Score: 100%')).toBeInTheDocument();
    });
  });
});