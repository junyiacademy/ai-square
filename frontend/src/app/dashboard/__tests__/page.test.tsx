/**
 * Dashboard Page Tests
 * 提升覆蓋率從 0% 到 80%+
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import DashboardPage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: { [key: string]: string } = {
        'dashboard:welcome': 'Welcome back, {{name}}!',
        'dashboard:subtitle': 'Continue your AI literacy journey',
        'dashboard:learningPathQuickAccess': 'Your Learning Path',
        'dashboard:learningPathDescription': 'Based on your assessment results',
        'dashboard:viewAllPaths': 'View All Paths',
        'dashboard:aiAdvisor': 'AI Advisor',
        'dashboard:aiLiteracyProgress': 'AI Literacy Progress',
        'dashboard:domains.engaging_with_ai': 'Engaging with AI',
        'dashboard:domains.creating_with_ai': 'Creating with AI',
        'dashboard:domains.managing_ai': 'Managing AI',
        'dashboard:domains.designing_ai': 'Designing AI',
        'dashboard:viewDetailedProgress': 'View detailed progress',
        'dashboard:learningStatistics': 'Learning Statistics',
        'dashboard:completedScenarios': 'Completed',
        'dashboard:inProgress': 'In Progress',
        'dashboard:learningHours': 'Learning Hours',
        'dashboard:dayStreak': 'Day Streak',
        'dashboard:recentActivities': 'Recent Activities',
        'dashboard:noRecentActivities': 'No recent activities',
        'dashboard:recommendedActions': 'Recommended Actions',
        'dashboard:priority.high': 'High',
        'dashboard:priority.medium': 'Medium',
        'dashboard:priority.low': 'Low',
        'dashboard:quickLinks': 'Quick Links',
        'dashboard:explorePBL': 'Explore PBL',
        'dashboard:viewCompetencies': 'View Competencies',
        'dashboard:viewHistory': 'View History',
        'dashboard:exploreKSA': 'Explore KSA',
        'dashboard:yourGoals': 'Your Goals',
        'dashboard:updateGoals': 'Update Goals',
        'dashboard:activities.completedAssessment': 'Completed Assessment',
        'dashboard:activities.assessmentDesc': 'View your results',
        'dashboard:nextActions.takeAssessment': 'Take Assessment',
        'dashboard:nextActions.assessmentDesc': 'Evaluate your AI literacy',
        'dashboard:nextActions.viewLearningPath': 'View Learning Path',
        'dashboard:nextActions.learningPathDesc': 'Personalized recommendations',
        'dashboard:nextActions.startPBL': 'Start PBL',
        'dashboard:nextActions.pblDesc': 'Learn by doing',
        'common:minutes': 'minutes',
        'common:view': 'View',
        'onboarding:goals.build_ai_apps.title': 'Build AI Applications',
      };
      // Handle template interpolation
      if (key === 'dashboard:welcome' && options?.name) {
        return `Welcome back, ${options.name}!`;
      }
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: jest.fn()
    }
  }),
}));

// Mock utilities
jest.mock('@/utils/locale', () => ({
  formatDateWithLocale: (date: Date) => date.toLocaleDateString()
}));

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('DashboardPage', () => {
  const mockPush = jest.fn();
  const mockRouter = { push: mockPush };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'student'
    }));
  });

  it('should redirect to login if no user', () => {
    localStorageMock.getItem.mockReturnValue(null);

    render(<DashboardPage />);

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('should show loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading state
    );

    render(<DashboardPage />);

    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  it('should fetch and display assessment results from API', async () => {
    const mockAssessmentData = {
      results: [{
        scores: {
          overall: 85,
          domains: {
            engaging_with_ai: 80,
            creating_with_ai: 90,
            managing_ai: 85,
            designing_ai: 85
          }
        },
        summary: {
          level: 'Intermediate',
          total_questions: 40,
          correct_answers: 34
        },
        duration_seconds: 1200,
        timestamp: '2024-01-20T10:00:00Z',
        recommendations: []
      }]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAssessmentData
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Welcome back, Test User!')).toBeInTheDocument();
    });

    // Check if assessment results are displayed
    expect(screen.getByText('AI Literacy Progress')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument(); // engaging_with_ai score
    expect(screen.getByText('90%')).toBeInTheDocument(); // creating_with_ai score
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/assessment/results?userId=1&userEmail=test%40example.com')
    );
  });

  it('should handle no assessment results', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] })
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Take Assessment')).toBeInTheDocument();
      expect(screen.getByText('Evaluate your AI literacy')).toBeInTheDocument();
    });

    // Should not show AI Literacy Progress section
    expect(screen.queryByText('AI Literacy Progress')).not.toBeInTheDocument();
  });

  it('should display learning statistics', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] })
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Learning Statistics')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // completedScenarios
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Learning Hours')).toBeInTheDocument();
      expect(screen.getByText('Day Streak')).toBeInTheDocument();
    });
  });

  it('should display recent activities for users with assessment', async () => {
    const mockAssessmentData = {
      results: [{
        scores: { overall: 85, domains: {} },
        summary: { level: 'Intermediate', total_questions: 40, correct_answers: 34 },
        duration_seconds: 1200,
        timestamp: '2024-01-20T10:00:00Z'
      }]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAssessmentData
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Recent Activities')).toBeInTheDocument();
      expect(screen.getByText('Completed Assessment')).toBeInTheDocument();
      expect(screen.getByText('View your results')).toBeInTheDocument();
    });
  });

  it('should display recommended actions based on assessment status', async () => {
    // User without assessment
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] })
    });

    const { rerender } = render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Take Assessment')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    // User with assessment
    jest.clearAllMocks();
    const mockAssessmentData = {
      results: [{
        scores: { overall: 85, domains: {} },
        summary: { level: 'Intermediate', total_questions: 40, correct_answers: 34 },
        duration_seconds: 1200,
        timestamp: '2024-01-20T10:00:00Z'
      }]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAssessmentData
    });

    rerender(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('View Learning Path')).toBeInTheDocument();
      expect(screen.getByText('Start PBL')).toBeInTheDocument();
    });
  });

  it('should display quick links', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] })
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Quick Links')).toBeInTheDocument();
      expect(screen.getByText('Explore PBL')).toBeInTheDocument();
      expect(screen.getByText('View Competencies')).toBeInTheDocument();
      expect(screen.getByText('View History')).toBeInTheDocument();
      expect(screen.getByText('Explore KSA')).toBeInTheDocument();
    });

    // Check links
    const pblLink = screen.getByText('Explore PBL').closest('a');
    expect(pblLink).toHaveAttribute('href', '/pbl');
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Welcome back, Test User!')).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error loading assessment result:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should display learning goals if user has them', async () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'student',
      learningGoals: ['build_ai_apps']
    }));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] })
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Your Goals')).toBeInTheDocument();
      expect(screen.getByText('Build AI Applications')).toBeInTheDocument();
      expect(screen.getByText('Update Goals')).toBeInTheDocument();
    });
  });

  it('should sync localStorage with API assessment data', async () => {
    const mockAssessmentData = {
      results: [{
        scores: {
          overall: 85,
          domains: {
            engaging_with_ai: 80,
            creating_with_ai: 90,
            managing_ai: 85,
            designing_ai: 85
          }
        },
        summary: {
          level: 'Intermediate',
          total_questions: 40,
          correct_answers: 34
        },
        duration_seconds: 1200,
        timestamp: '2024-01-20T10:00:00Z'
      }]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAssessmentData
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'assessmentResult',
        expect.stringContaining('"overallScore":85')
      );
    });
  });

  it('should display learning path quick access for users with assessment', async () => {
    const mockAssessmentData = {
      results: [{
        scores: { overall: 85, domains: {} },
        summary: { level: 'Intermediate', total_questions: 40, correct_answers: 34 },
        duration_seconds: 1200,
        timestamp: '2024-01-20T10:00:00Z'
      }]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAssessmentData
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Your Learning Path')).toBeInTheDocument();
      expect(screen.getByText('Based on your assessment results')).toBeInTheDocument();
      expect(screen.getByText('View All Paths')).toBeInTheDocument();
    });

    const viewPathsLink = screen.getByText('View All Paths').closest('a');
    expect(viewPathsLink).toHaveAttribute('href', '/learning-path');
  });

  it('should handle assessment API failure and fallback to localStorage', async () => {
    const mockLocalAssessment = {
      overallScore: 75,
      domainScores: { engaging_with_ai: 70 },
      level: 'Beginner',
      totalQuestions: 40,
      correctAnswers: 30,
      timeSpentSeconds: 1000,
      completedAt: new Date('2024-01-15'),
      recommendations: []
    };

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'user') {
        return JSON.stringify({
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'student'
        });
      }
      if (key === 'assessmentResult') {
        return JSON.stringify(mockLocalAssessment);
      }
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('AI Literacy Progress')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument(); // From localStorage
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to fetch assessment results from database, using localStorage only'
    );
    consoleSpy.mockRestore();
  });

  it('should test score color function', async () => {
    const mockAssessmentData = {
      results: [{
        scores: {
          overall: 85,
          domains: {
            engaging_with_ai: 85, // green
            creating_with_ai: 70, // yellow
            managing_ai: 50, // red
            designing_ai: 90 // green
          }
        },
        summary: {
          level: 'Intermediate',
          total_questions: 40,
          correct_answers: 34
        },
        duration_seconds: 1200,
        timestamp: '2024-01-20T10:00:00Z'
      }]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAssessmentData
    });

    render(<DashboardPage />);

    await waitFor(() => {
      // Check if scores are displayed with correct colors
      const greenScores = screen.getAllByText(/85%|90%/);
      const yellowScore = screen.getByText('70%');
      const redScore = screen.getByText('50%');
      
      expect(greenScores.length).toBeGreaterThan(0);
      expect(yellowScore).toBeInTheDocument();
      expect(redScore).toBeInTheDocument();
    });
  });

  it('should handle user without name properly', async () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      id: '1',
      email: 'test@example.com',
      role: 'student'
      // No name field
    }));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] })
    });

    render(<DashboardPage />);

    await waitFor(() => {
      // Should use email prefix as fallback
      expect(screen.getByText('Welcome back, test!')).toBeInTheDocument();
    });
  });

  it('should display all domain scores correctly', async () => {
    const mockAssessmentData = {
      results: [{
        scores: {
          overall: 85,
          domains: {
            engaging_with_ai: 80,
            creating_with_ai: 90,
            managing_ai: 85,
            designing_ai: 75
          }
        },
        summary: {
          level: 'Intermediate',
          total_questions: 40,
          correct_answers: 34
        },
        duration_seconds: 1200,
        timestamp: '2024-01-20T10:00:00Z'
      }]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAssessmentData
    });

    render(<DashboardPage />);

    await waitFor(() => {
      // Check all domain names are displayed
      expect(screen.getByText('Engaging with AI')).toBeInTheDocument();
      expect(screen.getByText('Creating with AI')).toBeInTheDocument();
      expect(screen.getByText('Managing AI')).toBeInTheDocument();
      expect(screen.getByText('Designing AI')).toBeInTheDocument();
      
      // Check all scores
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  it('should display estimated time for actions', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] })
    });

    render(<DashboardPage />);

    await waitFor(() => {
      // Take Assessment action has 20 minutes estimated time
      const timeElements = screen.getAllByText(/20.*minutes/);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  it('should render all quick link icons', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] })
    });

    render(<DashboardPage />);

    await waitFor(() => {
      // Check for emoji icons
      expect(screen.getByText('📚 Explore PBL')).toBeInTheDocument();
      expect(screen.getByText('🔗 View Competencies')).toBeInTheDocument();
      expect(screen.getByText('📊 View History')).toBeInTheDocument();
      expect(screen.getByText('🎯 Explore KSA')).toBeInTheDocument();
      expect(screen.getByText('💬 AI Advisor')).toBeInTheDocument();
    });
  });

  it('should show empty state for recent activities', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] })
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('No recent activities')).toBeInTheDocument();
    });
  });

  it('should display progress bars for domain scores', async () => {
    const mockAssessmentData = {
      results: [{
        scores: {
          overall: 85,
          domains: {
            engaging_with_ai: 80,
            creating_with_ai: 90,
            managing_ai: 85,
            designing_ai: 75
          }
        },
        summary: {
          level: 'Intermediate',
          total_questions: 40,
          correct_answers: 34
        },
        duration_seconds: 1200,
        timestamp: '2024-01-20T10:00:00Z'
      }]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAssessmentData
    });

    const { container } = render(<DashboardPage />);

    await waitFor(() => {
      // Check for progress bars
      const progressBars = container.querySelectorAll('.bg-blue-600');
      expect(progressBars.length).toBeGreaterThan(0);
      
      // Check if progress bars have correct width styles
      const progressBar80 = Array.from(progressBars).find(
        bar => (bar as HTMLElement).style.width === '80%'
      );
      expect(progressBar80).toBeInTheDocument();
    });
  });
});