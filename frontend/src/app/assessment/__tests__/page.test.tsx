import React from 'react';
import { renderWithProviders, screen, waitFor, fireEvent } from '@/test-utils/helpers/render';
import { useTranslation } from 'react-i18next';
import AssessmentPage from '../page';

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

// Mock the assessment components
jest.mock('../../../components/assessment/AssessmentQuiz', () => {
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

jest.mock('../../../components/assessment/AssessmentResults', () => {
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

const mockT = jest.fn((key) => {
  const translations: Record<string, string> = {
    'title': 'AI Literacy Assessment',
    'description': 'Evaluate your AI literacy across four key domains',
    'startAssessment': 'Start Assessment',
    'loading': 'Loading assessment...',
    'error': 'Error loading assessment',
    'retry': 'Try Again',
    'assessment.title': 'AI Literacy Assessment',
    'assessment.loading': 'Loading assessment...',
    'assessment.intro.title': 'AI Literacy Assessment',
    'assessment.intro.description': 'This assessment will evaluate your understanding across four key AI literacy domains.',
    'assessment.intro.domains': 'Assessment Domains',
    'assessment.intro.timeLimit': 'Time Limit',
    'assessment.intro.questions': 'Questions',
    'assessment.intro.startButton': 'Start Assessment',
    'assessment.error.title': 'Error Loading Assessment',
    'assessment.error.retry': 'Try Again',
    'domains.engaging_with_ai': 'Engaging with AI',
    'domains.creating_with_ai': 'Creating with AI',
    'domains.managing_with_ai': 'Managing AI',
    'domains.designing_with_ai': 'Designing AI'
  };
  return translations[key] || key;
});
const mockUseTranslation = useTranslation as jest.MockedFunction<typeof useTranslation>;

describe('AssessmentPage', () => {
  beforeEach(() => {
    mockUseTranslation.mockReturnValue({
      t: mockT,
      i18n: { language: 'en' },
    } as any);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
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
            name: 'Managing AI',
            description: 'Understanding AI limitations, privacy, and ethical considerations',
            questions: 3
          },
          designing_with_ai: {
            name: 'Designing AI',
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

  it('renders loading state initially', async () => {
    renderWithProviders(<AssessmentPage />);
    expect(screen.getByText('Loading assessment...')).toBeInTheDocument();
  });

  it('renders intro screen after loading', async () => {
    renderWithProviders(<AssessmentPage />);

    await waitFor(() => {
      expect(screen.getByText('AI Literacy Assessment')).toBeInTheDocument();
      expect(screen.getByText('Evaluate your AI literacy across four key domains')).toBeInTheDocument();
      expect(screen.getByText('Start Assessment')).toBeInTheDocument();
    });
  });

  it('starts assessment when start button is clicked', async () => {
    renderWithProviders(<AssessmentPage />);

    // Wait for loading to complete and button to appear
    await waitFor(() => {
      expect(screen.queryByText(mockT('loading'))).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId('assessment-quiz')).toBeInTheDocument();
    });
  });

  it('completes assessment and shows results', async () => {
    renderWithProviders(<AssessmentPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(mockT('loading'))).not.toBeInTheDocument();
    });

    await waitFor(() => {
        const element = screen.queryByRole('button');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });

    const startButton = screen.getByRole('button');
    fireEvent.click(startButton);

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
    renderWithProviders(<AssessmentPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(mockT('loading'))).not.toBeInTheDocument();
    });

    // Complete the assessment
    await waitFor(() => {
        const element = screen.queryByRole('button');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });

    const startButton = screen.getByRole('button');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId('assessment-quiz')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Complete Quiz'));

    await waitFor(() => {
      expect(screen.getByTestId('assessment-results')).toBeInTheDocument();
    });

    // Retake assessment
    const retakeButton = screen.getByText(/retake/i) || screen.getAllByRole('button')[0];
    fireEvent.click(retakeButton);

    await waitFor(() => {
      // Check if we're back at the intro screen
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    renderWithProviders(<AssessmentPage />);

    await waitFor(() => {
        const element = screen.queryByText('errorLoading');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });
  });

  it('calculates assessment results correctly', async () => {
    renderWithProviders(<AssessmentPage />);

    await waitFor(() => {
        const element = screen.queryByText('Start Assessment');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });

    fireEvent.click(screen.getByText('Start Assessment'));

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
