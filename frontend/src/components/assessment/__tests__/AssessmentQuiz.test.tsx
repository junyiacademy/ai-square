import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import AssessmentQuiz from '../AssessmentQuiz';
import { AssessmentQuestion, AssessmentDomain } from '../../../types/assessment';

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

const mockT = jest.fn((key) => {
  const translations: Record<string, string> = {
    'quiz.title': 'AI Literacy Assessment',
    'quiz.question': 'Question',
    'quiz.timeLeft': 'Time Left',
    'quiz.selectAnswer': 'Please select an answer',
    'quiz.selectAnswerToSeeExplanation': 'Select an answer to see explanation',
    'quiz.submit': 'Submit',
    'quiz.next': 'Next',
    'quiz.complete': 'Complete Assessment',
    'quiz.finish': 'Complete Assessment',
    'domains.engaging_with_ai': 'Engaging with AI',
    'domains.creating_with_ai': 'Creating with AI',
    'domains.managing_with_ai': 'Managing AI',
    'domains.designing_with_ai': 'Designing AI',
    'difficulty.basic': 'Basic',
    'difficulty.intermediate': 'Intermediate',
    'difficulty.advanced': 'Advanced',
    'quiz.correct': 'Correct!',
    'quiz.incorrect': 'Incorrect',
    'quiz.tryAgain': 'Try Again'
  };
  return translations[key] || key;
});
const mockUseTranslation = useTranslation as jest.MockedFunction<typeof useTranslation>;

const mockQuestions: AssessmentQuestion[] = [
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
  },
  {
    id: 'C001',
    domain: 'creating_with_ai',
    difficulty: 'basic',
    type: 'multiple_choice',
    question: 'Which approach is most effective when using AI for creative writing?',
    options: {
      a: 'Let AI write everything without human input',
      b: 'Use AI as a collaborative partner for brainstorming and refinement',
      c: 'Only use AI to fix grammar and spelling',
      d: 'Avoid AI completely in creative processes'
    },
    correct_answer: 'b',
    explanation: 'AI works best as a creative partner.',
    ksa_mapping: {
      knowledge: ['K1.3', 'K2.1'],
      skills: ['S1.2', 'S1.3'],
      attitudes: ['A1.2']
    }
  }
];

const mockDomains = {
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
};

const mockOnComplete = jest.fn();

describe('AssessmentQuiz', () => {
  beforeEach(() => {
    mockUseTranslation.mockReturnValue({
      t: mockT,
      i18n: { language: 'en' },
    } as any);
    jest.clearAllMocks();
  });

  it('renders quiz interface correctly', () => {
    render(
      <AssessmentQuiz
        questions={mockQuestions}
        domains={mockDomains}
        onComplete={mockOnComplete}
        timeLimit={15}
      />
    );

    expect(screen.getByText('AI Literacy Assessment')).toBeInTheDocument();
    expect(screen.getByText('What is the most effective way to get better results from an AI chatbot?')).toBeInTheDocument();
    expect(screen.getByText('Ask very general questions')).toBeInTheDocument();
    expect(screen.getByText('Provide clear, specific prompts with context')).toBeInTheDocument();
  });

  it('displays progress correctly', () => {
    render(
      <AssessmentQuiz
        questions={mockQuestions}
        domains={mockDomains}
        onComplete={mockOnComplete}
        timeLimit={15}
      />
    );

    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();
  });

  it('allows selecting answers', () => {
    render(
      <AssessmentQuiz
        questions={mockQuestions}
        domains={mockDomains}
        onComplete={mockOnComplete}
        timeLimit={15}
      />
    );

    const optionB = screen.getByText('Provide clear, specific prompts with context');
    fireEvent.click(optionB);

    expect(optionB.closest('button')).toHaveClass('border-indigo-500');
  });

  it('progresses to next question when answer is selected and next is clicked', () => {
    render(
      <AssessmentQuiz
        questions={mockQuestions}
        domains={mockDomains}
        onComplete={mockOnComplete}
        timeLimit={15}
      />
    );

    // Select answer for first question
    fireEvent.click(screen.getByText('Provide clear, specific prompts with context'));
    fireEvent.click(screen.getByText('Submit'));
    fireEvent.click(screen.getByText('Next'));

    // Should show second question
    expect(screen.getByText('Which approach is most effective when using AI for creative writing?')).toBeInTheDocument();
    expect(screen.getByText(/2 \/ 2/)).toBeInTheDocument();
  });

  it('completes quiz on last question', () => {
    render(
      <AssessmentQuiz
        questions={mockQuestions}
        domains={mockDomains}
        onComplete={mockOnComplete}
        timeLimit={15}
      />
    );

    // Answer first question
    fireEvent.click(screen.getByText('Provide clear, specific prompts with context'));
    fireEvent.click(screen.getByText('Submit'));
    fireEvent.click(screen.getByText('Next'));

    // Answer second question
    fireEvent.click(screen.getByText('Use AI as a collaborative partner for brainstorming and refinement'));
    fireEvent.click(screen.getByText('Submit'));
    fireEvent.click(screen.getByText('Complete Assessment'));

    expect(mockOnComplete).toHaveBeenCalledWith([
      {
        questionId: 'E001',
        selectedAnswer: 'b',
        timeSpent: expect.any(Number),
        isCorrect: true
      },
      {
        questionId: 'C001',
        selectedAnswer: 'b',
        timeSpent: expect.any(Number),
        isCorrect: true
      }
    ]);
  });

  it('disables next button when no answer is selected', () => {
    render(
      <AssessmentQuiz
        questions={mockQuestions}
        domains={mockDomains}
        onComplete={mockOnComplete}
        timeLimit={15}
      />
    );

    const nextButton = screen.getByText('Submit');
    expect(nextButton).toBeDisabled();
  });

  it('enables next button when answer is selected', () => {
    render(
      <AssessmentQuiz
        questions={mockQuestions}
        domains={mockDomains}
        onComplete={mockOnComplete}
        timeLimit={15}
      />
    );

    fireEvent.click(screen.getByText('Ask very general questions'));
    
    const nextButton = screen.getByText('Submit');
    expect(nextButton).not.toBeDisabled();
  });

  it('displays timer countdown', async () => {
    render(
      <AssessmentQuiz
        questions={mockQuestions}
        domains={mockDomains}
        onComplete={mockOnComplete}
        timeLimit={1} // 1 minute
      />
    );

    expect(screen.getByText(/1:00/)).toBeInTheDocument();
  });

  it('auto-completes when timer reaches zero', async () => {
    jest.useFakeTimers();
    
    render(
      <AssessmentQuiz
        questions={mockQuestions}
        domains={mockDomains}
        onComplete={mockOnComplete}
        timeLimit={0.02} // Very short time limit (1.2 seconds)
      />
    );

    // Fast-forward time within act
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    // Wait for auto-completion
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    }, { timeout: 3000 });

    jest.useRealTimers();
  });

  it('displays domain badges correctly', () => {
    render(
      <AssessmentQuiz
        questions={mockQuestions}
        domains={mockDomains}
        onComplete={mockOnComplete}
        timeLimit={15}
      />
    );

    expect(screen.getByText('Engaging with AI')).toBeInTheDocument();
    expect(screen.getByText('Basic')).toBeInTheDocument();
  });
});