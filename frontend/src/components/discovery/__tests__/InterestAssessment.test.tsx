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
        { id: 'opt1', text: 'Building apps', category: 'tech' },
        { id: 'opt2', text: 'Creating content', category: 'creative' },
        { id: 'opt3', text: 'Business strategy', category: 'business' }
      ]
    },
    {
      id: 'q2',
      text: 'How do you prefer to work?',
      options: [
        { id: 'opt4', text: 'Writing code', category: 'tech' },
        { id: 'opt5', text: 'Designing interfaces', category: 'creative' },
        { id: 'opt6', text: 'Managing projects', category: 'business' }
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
        return key;
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

    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('should disable next button when no option selected', () => {
    render(<InterestAssessment onComplete={mockOnComplete} />);

    const nextButton = screen.getByText('interestAssessment.next');
    expect(nextButton).toBeDisabled();
  });

  it('should enable next button when option is selected', () => {
    render(<InterestAssessment onComplete={mockOnComplete} />);

    const option = screen.getByText('Building apps');
    fireEvent.click(option);

    const nextButton = screen.getByText('interestAssessment.next');
    expect(nextButton).not.toBeDisabled();
  });

  it('should move to next question', () => {
    render(<InterestAssessment onComplete={mockOnComplete} />);

    // Select first option
    fireEvent.click(screen.getByText('Building apps'));
    
    // Click next
    fireEvent.click(screen.getByText('interestAssessment.next'));

    // Should show second question
    expect(screen.getByText('How do you prefer to work?')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('should allow going back to previous question', () => {
    render(<InterestAssessment onComplete={mockOnComplete} />);

    // Move to second question
    fireEvent.click(screen.getByText('Building apps'));
    fireEvent.click(screen.getByText('interestAssessment.next'));

    // Click back
    fireEvent.click(screen.getByText('interestAssessment.back'));

    // Should show first question again
    expect(screen.getByText('What interests you most?')).toBeInTheDocument();
  });

  it('should calculate results and call onComplete', async () => {
    render(<InterestAssessment onComplete={mockOnComplete} />);

    // Answer first question (tech)
    fireEvent.click(screen.getByText('Building apps'));
    fireEvent.click(screen.getByText('interestAssessment.next'));

    // Answer second question (tech)
    fireEvent.click(screen.getByText('Writing code'));
    fireEvent.click(screen.getByText('interestAssessment.complete'));

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
    fireEvent.click(screen.getByText('interestAssessment.next'));

    // Answer second question (business)
    fireEvent.click(screen.getByText('Managing projects'));
    fireEvent.click(screen.getByText('interestAssessment.complete'));

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

  it('should show calculating state', async () => {
    render(<InterestAssessment onComplete={mockOnComplete} />);

    // Answer questions
    fireEvent.click(screen.getByText('Building apps'));
    fireEvent.click(screen.getByText('interestAssessment.next'));
    fireEvent.click(screen.getByText('Writing code'));
    fireEvent.click(screen.getByText('interestAssessment.complete'));

    // Should show calculating message
    expect(screen.getByText('interestAssessment.calculating')).toBeInTheDocument();
  });
});