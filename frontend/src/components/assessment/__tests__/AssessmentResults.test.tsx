import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import AssessmentResults from '../AssessmentResults';
import { AssessmentResult } from '../../../types/assessment';

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

// Mock recharts to avoid canvas issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  RadarChart: ({ children }: any) => <div data-testid="radar-chart">{children}</div>,
  Radar: () => <div data-testid="radar" />,
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: () => <div data-testid="polar-angle-axis" />,
  PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
  Legend: () => <div data-testid="legend" />,
}));

const mockT = jest.fn((key, options) => {
  if (key === 'results.summaryText') {
    return `You achieved ${options?.level} level with ${options?.score}% overall score, answering ${options?.correct} out of ${options?.total} questions correctly.`;
  }
  return key;
});

const mockUseTranslation = useTranslation as jest.MockedFunction<typeof useTranslation>;

const mockResult: AssessmentResult = {
  overallScore: 85,
  domainScores: {
    engaging_with_ai: 90,
    creating_with_ai: 80,
    managing_with_ai: 85,
    designing_with_ai: 85
  },
  totalQuestions: 12,
  correctAnswers: 10,
  timeSpentSeconds: 720,
  completedAt: new Date('2025-06-25T12:00:00Z'),
  level: 'expert',
  recommendations: [
    'Focus on improving Creating with AI: Using AI tools to enhance creativity and productivity',
    'Focus on improving Managing with AI: Understanding AI limitations, privacy, and ethical considerations'
  ]
};

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
    name: 'Managing with AI',
    description: 'Understanding AI limitations, privacy, and ethical considerations',
    questions: 3
  },
  designing_with_ai: {
    name: 'Designing with AI',
    description: 'Strategic thinking about AI implementation and innovation',
    questions: 3
  }
};

const mockOnRetake = jest.fn();

describe('AssessmentResults', () => {
  beforeEach(() => {
    mockUseTranslation.mockReturnValue({
      t: mockT,
      i18n: { language: 'en' },
    } as any);
    jest.clearAllMocks();
  });

  it('renders results overview correctly', () => {
    render(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    expect(screen.getByText('results.title')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('level.expert')).toBeInTheDocument();
    expect(screen.getByText('10/12')).toBeInTheDocument();
    expect(screen.getByText('12:00')).toBeInTheDocument();
  });

  it('displays radar chart', () => {
    render(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
  });

  it('switches between tabs correctly', () => {
    render(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    // Check initial tab (overview)
    expect(screen.getByText('results.skillRadar')).toBeInTheDocument();

    // Switch to domains tab
    fireEvent.click(screen.getByText('results.tabs.domains'));
    expect(screen.getByText('results.domainBreakdown')).toBeInTheDocument();

    // Switch to recommendations tab
    fireEvent.click(screen.getByText('results.tabs.recommendations'));
    expect(screen.getByText('results.personalizedRecommendations')).toBeInTheDocument();
  });

  it('displays domain breakdown correctly', () => {
    render(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    // Switch to domains tab
    fireEvent.click(screen.getByText('results.tabs.domains'));

    expect(screen.getByText('Engaging with AI')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('Creating with AI')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('displays recommendations correctly', () => {
    render(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    // Switch to recommendations tab
    fireEvent.click(screen.getByText('results.tabs.recommendations'));

    expect(screen.getByText(/Focus on improving Creating with AI/)).toBeInTheDocument();
    expect(screen.getByText(/Focus on improving Managing with AI/)).toBeInTheDocument();
    expect(screen.getByText('• results.nextStep1')).toBeInTheDocument();
  });

  it('calls onRetake when retake button is clicked', () => {
    render(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    fireEvent.click(screen.getByText('results.retakeAssessment'));
    expect(mockOnRetake).toHaveBeenCalledTimes(1);
  });

  it('formats time correctly', () => {
    const resultWithLongTime = {
      ...mockResult,
      timeSpentSeconds: 3661 // 1 hour, 1 minute, 1 second
    };

    render(
      <AssessmentResults
        result={resultWithLongTime}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    expect(screen.getByText('61:01')).toBeInTheDocument();
  });

  it('displays correct level styling', () => {
    const beginnerResult = {
      ...mockResult,
      overallScore: 45,
      level: 'beginner' as const
    };

    render(
      <AssessmentResults
        result={beginnerResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    expect(screen.getByText('45%')).toHaveClass('text-red-600');
    expect(screen.getByText('level.beginner')).toBeInTheDocument();
  });

  it('displays summary text correctly', () => {
    render(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    expect(screen.getByText(/You achieved expert level with 85% overall score/)).toBeInTheDocument();
  });

  it('handles print functionality', () => {
    const originalPrint = window.print;
    window.print = jest.fn();

    render(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    fireEvent.click(screen.getByText('results.downloadReport'));
    expect(window.print).toHaveBeenCalledTimes(1);

    window.print = originalPrint;
  });
});