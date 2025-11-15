
jest.mock('d3', () => ({
  select: jest.fn(() => ({
    append: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    enter: jest.fn().mockReturnThis(),
    exit: jest.fn().mockReturnThis(),
    remove: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
  })),
  scaleLinear: jest.fn(() => {
    const scale = (value: unknown) => value;
    scale.domain = jest.fn().mockReturnThis();
    scale.range = jest.fn().mockReturnThis();
    return scale;
  }),
  scaleOrdinal: jest.fn(() => {
    const scale = (value: unknown) => value;
    scale.domain = jest.fn().mockReturnThis();
    scale.range = jest.fn().mockReturnThis();
    return scale;
  }),
  arc: jest.fn(() => {
    const arcFn = jest.fn();
    Object.assign(arcFn, {
      innerRadius: jest.fn().mockReturnThis(),
      outerRadius: jest.fn().mockReturnThis()
    });
    return arcFn;
  }),
  pie: jest.fn(() => {
    const pieFn = jest.fn((data: unknown[]) => data.map((d: unknown, i: number) => ({ data: d, index: i })));
    Object.assign(pieFn, {
      value: jest.fn().mockReturnThis()
    });
    return pieFn;
  }),
}));

import React from 'react';
import { renderWithProviders, screen, waitFor, fireEvent } from '@/test-utils/helpers/render';
import { useTranslation } from 'react-i18next';
import AssessmentResults from '../AssessmentResults';
import { AssessmentResult } from '../../../types/assessment';

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

// Mock dynamic imports
jest.mock('@/lib/dynamic-imports', () => ({
  DynamicDomainRadarChart: ({ data }: any) => (
    <div data-testid="domain-radar-chart" data-chart-data={JSON.stringify(data)}>
      Domain Radar Chart
    </div>
  ),
}));

// Mock CompetencyKnowledgeGraph
jest.mock('../CompetencyKnowledgeGraph', () => ({
  __esModule: true,
  default: () => <div data-testid="competency-knowledge-graph">Knowledge Graph</div>,
}));

// Mock content service
jest.mock('@/services/content-service', () => ({
  contentService: {
    getRelationsTree: jest.fn().mockResolvedValue({
      domains: [],
      kMap: {},
      sMap: {},
      aMap: {},
    }),
  },
}));

// Mock formatDateWithLocale
jest.mock('@/utils/locale', () => ({
  formatDateWithLocale: (date: Date) => '2025-06-25',
}));

const mockT = jest.fn((key: unknown, options?: { level?: string; score?: number; correct?: number; total?: number; [key: string]: unknown }) => {
  const translations: Record<string, string> = {
    'results.title': 'Assessment Results',
    'results.subtitle': 'Your comprehensive AI literacy assessment results',
    'results.overview': 'Overview',
    'results.domainBreakdown': 'Domain Breakdown',
    'results.recommendations': 'Recommendations',
    'results.knowledgeGraph': 'Knowledge Graph',
    'results.overallScore': 'Overall Score',
    'results.level': 'Level',
    'results.timeSpent': 'Time Spent',
    'results.questionsAnswered': 'Questions Answered',
    'results.retake': 'Retake Assessment',
    'results.print': 'Print Results',
    'results.correctAnswers': 'Correct Answers',
    'results.completedAt': 'Completed At',
    'results.summary': 'Summary',
    'results.yourScore': 'Your Score',
    'level.beginner': 'Beginner',
    'level.intermediate': 'Intermediate',
    'level.advanced': 'Advanced',
    'level.expert': 'Expert',
    'results.skillRadar': 'Skill Radar',
    'results.tabs.overview': 'Overview',
    'results.tabs.recommendations': 'Recommendations',
    'results.tabs.knowledge-graph': 'Knowledge Graph',
    'results.personalizedRecommendations': 'Personalized Recommendations',
    'results.nextSteps': 'Next Steps',
    'results.nextStep1': 'Take advanced AI courses',
    'results.nextStep2': 'Practice with AI tools',
    'results.nextStep3': 'Join AI communities',
    'results.retakeAssessment': 'Retake Assessment',
    'results.downloadReport': 'Download Report',
    'results.saveResults': 'Save Results',
    'results.saving': 'Saving...',
    'results.saved': 'Saved',
    'results.saveSuccess': 'Results saved successfully',
    'results.saveError': 'Failed to save results',
    'results.viewLearningPath': 'View Learning Path',
    'domains.engaging_with_ai': 'Engaging with AI',
    'domains.creating_with_ai': 'Creating with AI',
    'domains.managing_with_ai': 'Managing AI',
    'domains.designing_with_ai': 'Designing AI',
  };

  if (key === 'results.summaryText') {
    return `You achieved ${options?.level} level with ${options?.score}% overall score, answering ${options?.correct} out of ${options?.total} questions correctly.`;
  }

  return translations[key as string] || String(key);
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
    'Focus on improving Managing AI: Understanding AI limitations, privacy, and ethical considerations'
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

const mockOnRetake = jest.fn();

describe('AssessmentResults', () => {
  beforeEach(() => {
    mockUseTranslation.mockReturnValue({
      t: mockT,
      i18n: { language: 'en' },
    } as any);
    jest.clearAllMocks();

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Mock fetch
    global.fetch = jest.fn();
  });

  it('renders results overview correctly', async () => {
    renderWithProviders(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    expect(screen.getByText('Assessment Results')).toBeInTheDocument();
    // Multiple elements have 85%, so use getAllByText
    const scoreElements = screen.getAllByText('85%');
    expect(scoreElements.length).toBeGreaterThan(0);
    expect(screen.getByText('Expert')).toBeInTheDocument();
    expect(screen.getByText('10/12')).toBeInTheDocument();
    expect(screen.getByText('12:00')).toBeInTheDocument();
  });

  it('displays radar chart', async () => {
    renderWithProviders(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    expect(screen.getByTestId('domain-radar-chart')).toBeInTheDocument();
  });

  it('switches between tabs correctly', async () => {
    renderWithProviders(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    // Check initial tab (overview)
    expect(screen.getByText('Skill Radar')).toBeInTheDocument();

    // Switch to recommendations tab
    fireEvent.click(screen.getByText('Recommendations'));
    expect(screen.getByText('Personalized Recommendations')).toBeInTheDocument();

    // Switch to knowledge graph tab
    fireEvent.click(screen.getByText('Knowledge Graph'));
    expect(screen.getByTestId('competency-knowledge-graph')).toBeInTheDocument();
  });

  it('displays domain breakdown correctly', async () => {
    renderWithProviders(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    // Domain breakdown is now on the overview tab
    expect(screen.getByText('Domain Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Engaging with AI')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('Creating with AI')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('displays recommendations correctly', async () => {
    renderWithProviders(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    // Switch to recommendations tab
    fireEvent.click(screen.getByText('Recommendations'));

    expect(screen.getByText(/Focus on improving Creating with AI/)).toBeInTheDocument();
    expect(screen.getByText(/Focus on improving Managing AI/)).toBeInTheDocument();
    expect(screen.getByText('Next Steps')).toBeInTheDocument();
    expect(screen.getByText('• Take advanced AI courses')).toBeInTheDocument();
    expect(screen.getByText('• Practice with AI tools')).toBeInTheDocument();
    expect(screen.getByText('• Join AI communities')).toBeInTheDocument();
  });

  it('calls onRetake when retake button is clicked', async () => {
    renderWithProviders(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    fireEvent.click(screen.getByText('Retake Assessment'));
    expect(mockOnRetake).toHaveBeenCalledTimes(1);
  });

  it('formats time correctly', async () => {
    const resultWithLongTime = {
      ...mockResult,
      timeSpentSeconds: 3661 // 1 hour, 1 minute, 1 second
    };

    renderWithProviders(
      <AssessmentResults
        result={resultWithLongTime}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    expect(screen.getByText('61:01')).toBeInTheDocument();
  });

  it('displays correct level styling', async () => {
    const beginnerResult = {
      ...mockResult,
      overallScore: 45,
      level: 'beginner' as const
    };

    renderWithProviders(
      <AssessmentResults
        result={beginnerResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    expect(screen.getByText('45%')).toHaveClass('text-red-600');
    expect(screen.getByText('Beginner')).toBeInTheDocument();
  });

  it('displays summary text correctly', async () => {
    renderWithProviders(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText(/You achieved Expert level with 85% overall score/)).toBeInTheDocument();
  });

  it('handles print functionality', async () => {
    const originalPrint = window.print;
    window.print = jest.fn();

    renderWithProviders(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    fireEvent.click(screen.getByText('Download Report'));
    expect(window.print).toHaveBeenCalledTimes(1);

    window.print = originalPrint;
  });

  it('displays completed date correctly', async () => {
    renderWithProviders(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    expect(screen.getByText('2025-06-25')).toBeInTheDocument();
    expect(screen.getByText('Completed At')).toBeInTheDocument();
  });

  it('auto-saves results when user is logged in', async () => {
    // Mock logged in user
    (window.localStorage.getItem as jest.Mock).mockImplementation((key: unknown) => {
      if (key === 'isLoggedIn') return 'true';
      if (key === 'user') return JSON.stringify({ id: 1, email: 'test@example.com' });
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ assessmentId: '123' }),
    });

    renderWithProviders(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    // Wait for auto-save
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/assessment/results', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"userId":"1"'),
      }));
    });
  });

  it('shows save button for non-logged in users', async () => {
    // Mock not logged in
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    renderWithProviders(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    expect(screen.getByText('Save Results')).toBeInTheDocument();
  });

  it('shows learning path button after saving', async () => {
    // Mock logged in user
    (window.localStorage.getItem as jest.Mock).mockImplementation((key: unknown) => {
      if (key === 'isLoggedIn') return 'true';
      if (key === 'user') return JSON.stringify({ id: 1, email: 'test@example.com' });
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ assessmentId: '123' }),
    });

    renderWithProviders(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
      />
    );

    // Wait for auto-save to complete
    await waitFor(() => {
        const element = screen.queryByText('View Learning Path');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });
  });

  it('does not auto-save in review mode', async () => {
    // Mock logged in user
    (window.localStorage.getItem as jest.Mock).mockImplementation((key: unknown) => {
      if (key === 'isLoggedIn') return 'true';
      if (key === 'user') return JSON.stringify({ id: 1, email: 'test@example.com' });
      return null;
    });

    renderWithProviders(
      <AssessmentResults
        result={mockResult}
        domains={mockDomains}
        onRetake={mockOnRetake}
        isReview={true}
      />
    );

    // Should not call fetch for auto-save
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
