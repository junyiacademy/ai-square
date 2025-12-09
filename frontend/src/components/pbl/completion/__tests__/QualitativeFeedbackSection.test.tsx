import { render, screen, fireEvent } from '@testing-library/react';
import { QualitativeFeedbackSection } from '../QualitativeFeedbackSection';
import type { QualitativeFeedback } from '@/types/pbl-completion';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'complete.generatingFeedback': 'Generating feedback...',
        'complete.qualitativeFeedback': 'Personalized Feedback',
        'complete.strengths': 'Strengths',
        'complete.areasForImprovement': 'Areas for Improvement',
        'complete.nextSteps': 'Next Steps',
      };
      return translations[key] || key;
    }
  })
}));

describe('QualitativeFeedbackSection', () => {
  const mockFeedback: QualitativeFeedback = {
    overallAssessment: 'Great work on this scenario!',
    strengths: [
      {
        area: 'Problem Solving',
        description: 'You demonstrated excellent problem-solving skills.',
        example: 'You broke down complex problems effectively.'
      }
    ],
    areasForImprovement: [
      {
        area: 'Time Management',
        description: 'Consider planning your approach before starting.',
        suggestion: 'Try creating an outline first.'
      }
    ],
    nextSteps: ['Practice more scenarios', 'Review AI fundamentals'],
    encouragement: 'Keep up the great work!'
  };

  it('returns null when no feedback and not generating', () => {
    const { container } = render(
      <QualitativeFeedbackSection
        feedback={undefined}
        generatingFeedback={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows loading state when generating feedback', () => {
    render(
      <QualitativeFeedbackSection
        feedback={undefined}
        generatingFeedback={true}
      />
    );
    expect(screen.getByText('Generating feedback...')).toBeInTheDocument();
  });

  it('renders overall assessment', () => {
    render(
      <QualitativeFeedbackSection
        feedback={mockFeedback}
        generatingFeedback={false}
      />
    );
    expect(screen.getByText('Great work on this scenario!')).toBeInTheDocument();
  });

  it('renders strengths section', () => {
    render(
      <QualitativeFeedbackSection
        feedback={mockFeedback}
        generatingFeedback={false}
      />
    );
    expect(screen.getByText('Problem Solving')).toBeInTheDocument();
    expect(screen.getByText('You demonstrated excellent problem-solving skills.')).toBeInTheDocument();
  });

  it('renders strength examples when provided', () => {
    render(
      <QualitativeFeedbackSection
        feedback={mockFeedback}
        generatingFeedback={false}
      />
    );
    // Component uses curly quotes (&ldquo; and &rdquo;), which render as " and "
    expect(screen.getByText(/You broke down complex problems effectively\./)).toBeInTheDocument();
  });

  it('renders areas for improvement', () => {
    render(
      <QualitativeFeedbackSection
        feedback={mockFeedback}
        generatingFeedback={false}
      />
    );
    expect(screen.getByText('Time Management')).toBeInTheDocument();
    expect(screen.getByText('Consider planning your approach before starting.')).toBeInTheDocument();
  });

  it('renders suggestions when provided', () => {
    render(
      <QualitativeFeedbackSection
        feedback={mockFeedback}
        generatingFeedback={false}
      />
    );
    expect(screen.getByText('Try creating an outline first.')).toBeInTheDocument();
  });

  it('renders next steps section', () => {
    render(
      <QualitativeFeedbackSection
        feedback={mockFeedback}
        generatingFeedback={false}
      />
    );
    expect(screen.getByText('Practice more scenarios')).toBeInTheDocument();
    expect(screen.getByText('Review AI fundamentals')).toBeInTheDocument();
  });

  it('renders encouragement message', () => {
    render(
      <QualitativeFeedbackSection
        feedback={mockFeedback}
        generatingFeedback={false}
      />
    );
    expect(screen.getByText(/Keep up the great work!/)).toBeInTheDocument();
  });

  it('shows regenerate button in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    const mockRegenerate = jest.fn();

    render(
      <QualitativeFeedbackSection
        feedback={mockFeedback}
        generatingFeedback={false}
        onRegenerateFeedback={mockRegenerate}
      />
    );

    const regenerateButton = screen.getByTitle('Regenerate feedback (Dev only)');
    expect(regenerateButton).toBeInTheDocument();

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });

  it('calls onRegenerateFeedback when regenerate button clicked', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    const mockRegenerate = jest.fn();

    render(
      <QualitativeFeedbackSection
        feedback={mockFeedback}
        generatingFeedback={false}
        onRegenerateFeedback={mockRegenerate}
      />
    );

    const regenerateButton = screen.getByTitle('Regenerate feedback (Dev only)');
    fireEvent.click(regenerateButton);
    expect(mockRegenerate).toHaveBeenCalledTimes(1);

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });

  it('does not show next steps when empty', () => {
    const feedbackWithoutNextSteps = { ...mockFeedback, nextSteps: [] };
    render(
      <QualitativeFeedbackSection
        feedback={feedbackWithoutNextSteps}
        generatingFeedback={false}
      />
    );
    expect(screen.queryByText('Next Steps')).not.toBeInTheDocument();
  });

  it('does not show encouragement when not provided', () => {
    const feedbackWithoutEncouragement = { ...mockFeedback, encouragement: undefined };
    render(
      <QualitativeFeedbackSection
        feedback={feedbackWithoutEncouragement}
        generatingFeedback={false}
      />
    );
    expect(screen.queryByText(/Keep up the great work!/)).not.toBeInTheDocument();
  });
});
