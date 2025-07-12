import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InterestAssessment from '../InterestAssessment';
import { useTranslation } from 'react-i18next';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

describe('InterestAssessment', () => {
  const mockOnComplete = jest.fn();
  const mockQuestions = [
    {
      id: 'q1',
      text: 'What interests you most?',
      options: [
        { id: 'opt1', text: 'Building apps', weight: { tech: 1, creative: 0, business: 0 } },
        { id: 'opt2', text: 'Creating content', weight: { tech: 0, creative: 1, business: 0 } },
        { id: 'opt3', text: 'Business strategy', weight: { tech: 0, creative: 0, business: 1 } }
      ]
    },
    {
      id: 'q2',
      text: 'How do you prefer to work?',
      options: [
        { id: 'opt4', text: 'Writing code', weight: { tech: 1, creative: 0, business: 0 } },
        { id: 'opt5', text: 'Designing interfaces', weight: { tech: 0, creative: 1, business: 0 } },
        { id: 'opt6', text: 'Managing projects', weight: { tech: 0, creative: 0, business: 1 } }
      ]
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslation as jest.Mock).mockReturnValue({
      t: (key: string) => {
        if (key === 'interestAssessment.questions') {
          return mockQuestions;
        }
        // Mock translation keys
        const translations: Record<string, string> = {
          'interestAssessment.title': 'AI Interest Analysis',
          'interestAssessment.subtitle': 'Discover your AI learning path',
          'interestAssessment.next': 'Next',
          'interestAssessment.back': 'Back',
          'interestAssessment.complete': 'Complete',
          'interestAssessment.calculating': 'Calculating...'
        };
        return translations[key] || key;
      }
    });
  });

  it('should render the first question', () => {
    render(<InterestAssessment onComplete={mockOnComplete} />);

    expect(screen.getByText('What interests you most?')).toBeInTheDocument();
    expect(screen.getByText('Building apps')).toBeInTheDocument();
    expect(screen.getByText('Creating content')).toBeInTheDocument();
    expect(screen.getByText('Business strategy')).toBeInTheDocument();
  });

  it('should show progress indicator', () => {
    render(<InterestAssessment onComplete={mockOnComplete} />);

    // Progress is shown as percentage
    expect(screen.getByText('50%')).toBeInTheDocument();
    // Current question number is shown in the progress circle
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should disable next button when no option selected', () => {
    render(<InterestAssessment onComplete={mockOnComplete} />);

    const nextButton = screen.getByText('下一題');
    expect(nextButton.closest('button')).toBeDisabled();
  });

  it('should enable next button when option is selected', () => {
    render(<InterestAssessment onComplete={mockOnComplete} />);

    const option = screen.getByText('Building apps');
    fireEvent.click(option);

    const nextButton = screen.getByText('下一題');
    expect(nextButton.closest('button')).not.toBeDisabled();
  });

  it('should move to next question', async () => {
    render(<InterestAssessment onComplete={mockOnComplete} />);

    // Select first option
    fireEvent.click(screen.getByText('Building apps'));
    
    // Click next
    fireEvent.click(screen.getByText('下一題'));

    // Wait for animation and check second question
    await waitFor(() => {
      expect(screen.getByText('How do you prefer to work?')).toBeInTheDocument();
    });
    
    // Check progress
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should allow going back to previous question', async () => {
    render(<InterestAssessment onComplete={mockOnComplete} />);

    // Move to second question
    fireEvent.click(screen.getByText('Building apps'));
    fireEvent.click(screen.getByText('下一題'));

    // Wait for second question
    await waitFor(() => {
      expect(screen.getByText('How do you prefer to work?')).toBeInTheDocument();
    });

    // Click back
    fireEvent.click(screen.getByText('上一題'));

    // Wait for first question to appear again
    await waitFor(() => {
      expect(screen.getByText('What interests you most?')).toBeInTheDocument();
    });
  });

  it('should calculate results and call onComplete', async () => {
    render(<InterestAssessment onComplete={mockOnComplete} />);

    // Answer first question (tech)
    fireEvent.click(screen.getByText('Building apps'));
    fireEvent.click(screen.getByText('下一題'));
    
    // Wait for second question
    await waitFor(() => {
      expect(screen.getByText('How do you prefer to work?')).toBeInTheDocument();
    });

    // Answer second question (tech)
    fireEvent.click(screen.getByText('Writing code'));
    fireEvent.click(screen.getByText('完成分析'));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(
        {
          tech: 100,
          creative: 0,
          business: 0
        },
        {
          q1: ['opt1'],
          q2: ['opt4']
        }
      );
    });
  });

  it('should calculate mixed results correctly', async () => {
    render(<InterestAssessment onComplete={mockOnComplete} />);

    // Answer first question (creative)
    fireEvent.click(screen.getByText('Creating content'));
    fireEvent.click(screen.getByText('下一題'));
    
    // Wait for second question
    await waitFor(() => {
      expect(screen.getByText('How do you prefer to work?')).toBeInTheDocument();
    });

    // Answer second question (business)
    fireEvent.click(screen.getByText('Managing projects'));
    fireEvent.click(screen.getByText('完成分析'));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(
        {
          tech: 0,
          creative: 50,
          business: 50
        },
        {
          q1: ['opt2'],
          q2: ['opt6']
        }
      );
    });
  });

  it('should complete assessment flow', async () => {
    render(<InterestAssessment onComplete={mockOnComplete} />);

    // Answer first question
    fireEvent.click(screen.getByText('Building apps'));
    fireEvent.click(screen.getByText('下一題'));
    
    // Wait for second question
    await waitFor(() => {
      expect(screen.getByText('How do you prefer to work?')).toBeInTheDocument();
    });
    
    // Answer second question
    fireEvent.click(screen.getByText('Writing code'));
    fireEvent.click(screen.getByText('完成分析'));

    // Should call onComplete with results
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });
});