import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import HistoryPage from '../page';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' }
  }),
}));

jest.mock('@/components/ui/history-skeletons', () => ({
  HistoryPageSkeleton: () => <div data-testid="history-skeleton">Loading...</div>,
}));

jest.mock('@/utils/locale', () => ({
  formatDateWithLocale: jest.fn((date: string) => new Date(date).toLocaleDateString()),
}));

jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com' },
    isLoading: false,
    isAuthenticated: true,
  }),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock implementations
const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('HistoryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    } as any);

    // Default API responses
    mockFetch.mockImplementation((url) => {
      if (url === '/api/assessment/history') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            history: [],
            success: true
          })
        });
      }
      if (url === '/api/pbl/history') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            history: [],
            success: true
          })
        });
      }
      if (url === '/api/discovery/history') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            history: [],
            success: true
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  describe('Component Rendering', () => {
    it('should render loading skeleton initially', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<HistoryPage />);

      expect(screen.getByTestId('history-skeleton')).toBeInTheDocument();
    });

    it('should render main layout after loading', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Learning History')).toBeInTheDocument();
        expect(screen.getByText('Track your progress across all learning modules')).toBeInTheDocument();
      });
    });

    it('should render filter tabs', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('All')).toBeInTheDocument();
        expect(screen.getByText('Assessment')).toBeInTheDocument();
        expect(screen.getByText('PBL')).toBeInTheDocument();
        expect(screen.getByText('Discovery')).toBeInTheDocument();
      });
    });

    it('should render sort dropdown', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Newest First')).toBeInTheDocument();
      });
    });

    it('should show empty state when no history', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('No learning history yet')).toBeInTheDocument();
        expect(screen.getByText('Start your AI literacy journey today!')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('should load assessment history', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/assessment/history');
      });
    });

    it('should load PBL history', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/pbl/history');
      });
    });

    it('should load Discovery history', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/discovery/history');
      });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/assessment/history') {
          return Promise.reject(new Error('API Error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ history: [], success: true })
        });
      });

      console.error = jest.fn();

      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error loading assessment history:', expect.any(Error));
      });
    });

    it('should handle failed API responses', async () => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/pbl/history') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ success: false, error: 'Not found' })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ history: [], success: true })
        });
      });

      console.error = jest.fn();

      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error loading PBL history:', expect.any(Object));
      });
    });

    it('should merge and sort history items', async () => {
      const assessmentHistory = [{
        assessment_id: 'assess1',
        timestamp: '2024-01-02T00:00:00Z',
        scores: {
          overall: 85,
          domains: {
            engaging_with_ai: 80,
            creating_with_ai: 85,
            managing_with_ai: 90,
            designing_with_ai: 85
          }
        },
        summary: {
          total_questions: 10,
          correct_answers: 8,
          level: 'intermediate'
        },
        duration_seconds: 600,
        language: 'en'
      }];

      const pblHistory = [{
        id: 'pbl1',
        logId: 'log1',
        scenarioId: 'scenario1',
        scenarioTitle: 'PBL Scenario',
        status: 'completed',
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T01:00:00Z',
        duration: 3600,
        progress: {
          percentage: 100,
          completedTasks: 5,
          totalTaskCount: 5
        },
        score: 90
      }];

      mockFetch.mockImplementation((url) => {
        if (url === '/api/assessment/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: assessmentHistory, success: true })
          });
        }
        if (url === '/api/pbl/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: pblHistory, success: true })
          });
        }
        if (url === '/api/discovery/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: [], success: true })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        // Should show newer assessment first (2024-01-02)
        const historyItems = screen.getAllByTestId(/history-item-/);
        expect(historyItems).toHaveLength(2);
        expect(screen.getByText('Assessment')).toBeInTheDocument();
        expect(screen.getByText('PBL Scenario')).toBeInTheDocument();
      });
    });
  });

  describe('Assessment History Display', () => {
    const mockAssessmentHistory = [{
      assessment_id: 'assess1',
      timestamp: '2024-01-01T12:00:00Z',
      scores: {
        overall: 85,
        domains: {
          engaging_with_ai: 80,
          creating_with_ai: 85,
          managing_with_ai: 90,
          designing_with_ai: 85
        }
      },
      summary: {
        total_questions: 20,
        correct_answers: 17,
        level: 'intermediate'
      },
      duration_seconds: 1200,
      language: 'en'
    }];

    beforeEach(() => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/assessment/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: mockAssessmentHistory, success: true })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ history: [], success: true })
        });
      });
    });

    it('should display assessment items', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Assessment')).toBeInTheDocument();
        expect(screen.getByText('85%')).toBeInTheDocument();
        expect(screen.getByText('17/20 correct')).toBeInTheDocument();
        expect(screen.getByText('intermediate')).toBeInTheDocument();
      });
    });

    it('should display domain scores', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Engaging: 80%')).toBeInTheDocument();
        expect(screen.getByText('Creating: 85%')).toBeInTheDocument();
        expect(screen.getByText('Managing: 90%')).toBeInTheDocument();
        expect(screen.getByText('Designing: 85%')).toBeInTheDocument();
      });
    });

    it('should display duration', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('20 min')).toBeInTheDocument();
      });
    });

    it('should handle click on assessment item', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Assessment')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const assessmentItem = screen.getByTestId('history-item-assess1');

      await user.click(assessmentItem);

      expect(mockPush).toHaveBeenCalledWith('/assessment');
    });
  });

  describe('PBL History Display', () => {
    const mockPBLHistory = [{
      id: 'pbl1',
      logId: 'log1',
      scenarioId: 'scenario1',
      scenarioTitle: 'Digital Marketing Assistant',
      currentTaskId: 'task1',
      currentTaskTitle: 'Market Analysis',
      status: 'completed',
      startedAt: '2024-01-01T10:00:00Z',
      completedAt: '2024-01-01T12:00:00Z',
      duration: 7200,
      progress: {
        percentage: 100,
        completedTasks: 8,
        totalTaskCount: 8
      },
      score: 92,
      totalInteractions: 45,
      averageScore: 88,
      domainScores: {
        engaging_with_ai: 90,
        creating_with_ai: 95,
        managing_with_ai: 88,
        designing_with_ai: 92
      },
      ksaScores: {
        knowledge: 85,
        skills: 90,
        attitudes: 95
      }
    }];

    beforeEach(() => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/pbl/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: mockPBLHistory, success: true })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ history: [], success: true })
        });
      });
    });

    it('should display PBL scenario details', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Digital Marketing Assistant')).toBeInTheDocument();
        expect(screen.getByText('PBL')).toBeInTheDocument();
        expect(screen.getByText('92%')).toBeInTheDocument();
        expect(screen.getByText('8/8 tasks')).toBeInTheDocument();
        expect(screen.getByText('45 interactions')).toBeInTheDocument();
      });
    });

    it('should display completion status', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
      });
    });

    it('should display duration in hours and minutes', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('2h 0m')).toBeInTheDocument();
      });
    });

    it('should display KSA scores', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Knowledge: 85%')).toBeInTheDocument();
        expect(screen.getByText('Skills: 90%')).toBeInTheDocument();
        expect(screen.getByText('Attitudes: 95%')).toBeInTheDocument();
      });
    });

    it('should handle click on PBL item', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Digital Marketing Assistant')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const pblItem = screen.getByTestId('history-item-pbl1');

      await user.click(pblItem);

      expect(mockPush).toHaveBeenCalledWith('/pbl/scenarios/scenario1');
    });

    it('should handle in-progress PBL sessions', async () => {
      const inProgressHistory = [{
        ...mockPBLHistory[0],
        status: 'in_progress',
        completedAt: undefined,
        progress: {
          percentage: 60,
          completedTasks: 5,
          totalTaskCount: 8
        }
      }];

      mockFetch.mockImplementation((url) => {
        if (url === '/api/pbl/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: inProgressHistory, success: true })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ history: [], success: true })
        });
      });

      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('In Progress')).toBeInTheDocument();
        expect(screen.getByText('5/8 tasks')).toBeInTheDocument();
      });
    });
  });

  describe('Discovery History Display', () => {
    const mockDiscoveryHistory = [{
      id: 'discovery1',
      programId: 'program1',
      scenarioId: 'scenario1',
      scenarioTitle: 'Data Scientist Career Path',
      careerType: 'Data Science',
      currentTaskId: 'task1',
      currentTaskTitle: 'Skill Assessment',
      status: 'completed',
      startedAt: '2024-01-01T09:00:00Z',
      completedAt: '2024-01-01T11:30:00Z',
      duration: 9000,
      progress: {
        percentage: 100,
        completedTasks: 6,
        totalTaskCount: 6
      },
      totalInteractions: 32,
      averageScore: 87,
      domainScores: {
        engaging_with_ai: 85,
        creating_with_ai: 90,
        managing_with_ai: 88,
        designing_with_ai: 85
      },
      ksaScores: {
        knowledge: 90,
        skills: 85,
        attitudes: 88
      }
    }];

    beforeEach(() => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/discovery/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: mockDiscoveryHistory, success: true })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ history: [], success: true })
        });
      });
    });

    it('should display Discovery career path details', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Data Scientist Career Path')).toBeInTheDocument();
        expect(screen.getByText('Discovery')).toBeInTheDocument();
        expect(screen.getByText('Data Science')).toBeInTheDocument();
        expect(screen.getByText('6/6 tasks')).toBeInTheDocument();
        expect(screen.getByText('32 interactions')).toBeInTheDocument();
      });
    });

    it('should display average score', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('87%')).toBeInTheDocument();
      });
    });

    it('should display duration', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('2h 30m')).toBeInTheDocument();
      });
    });

    it('should handle click on Discovery item', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Data Scientist Career Path')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const discoveryItem = screen.getByTestId('history-item-discovery1');

      await user.click(discoveryItem);

      expect(mockPush).toHaveBeenCalledWith('/discovery');
    });

    it('should handle active Discovery sessions', async () => {
      const activeHistory = [{
        ...mockDiscoveryHistory[0],
        status: 'active',
        completedAt: undefined,
        progress: {
          percentage: 75,
          completedTasks: 4,
          totalTaskCount: 6
        }
      }];

      mockFetch.mockImplementation((url) => {
        if (url === '/api/discovery/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: activeHistory, success: true })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ history: [], success: true })
        });
      });

      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('4/6 tasks')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    const mixedHistory = {
      assessment: [{
        assessment_id: 'assess1',
        timestamp: '2024-01-03T00:00:00Z',
        scores: { overall: 85, domains: {} },
        summary: { total_questions: 10, correct_answers: 8, level: 'intermediate' },
        duration_seconds: 600,
        language: 'en'
      }],
      pbl: [{
        id: 'pbl1',
        logId: 'log1',
        scenarioId: 'scenario1',
        scenarioTitle: 'PBL Test',
        status: 'completed',
        startedAt: '2024-01-02T00:00:00Z',
        completedAt: '2024-01-02T01:00:00Z',
        duration: 3600,
        progress: { percentage: 100, completedTasks: 5, totalTaskCount: 5 }
      }],
      discovery: [{
        id: 'discovery1',
        programId: 'program1',
        scenarioId: 'scenario1',
        scenarioTitle: 'Discovery Test',
        careerType: 'Tech',
        status: 'completed',
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T01:00:00Z',
        duration: 3600,
        progress: { percentage: 100, completedTasks: 3, totalTaskCount: 3 }
      }]
    };

    beforeEach(() => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/assessment/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: mixedHistory.assessment, success: true })
          });
        }
        if (url === '/api/pbl/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: mixedHistory.pbl, success: true })
          });
        }
        if (url === '/api/discovery/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: mixedHistory.discovery, success: true })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });
    });

    it('should show all items by default', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        const historyItems = screen.getAllByTestId(/history-item-/);
        expect(historyItems).toHaveLength(3);
        expect(screen.getByText('Assessment')).toBeInTheDocument();
        expect(screen.getByText('PBL Test')).toBeInTheDocument();
        expect(screen.getByText('Discovery Test')).toBeInTheDocument();
      });
    });

    it('should filter by assessment type', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getAllByTestId(/history-item-/)).toHaveLength(3);
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('Assessment'));

      await waitFor(() => {
        const historyItems = screen.getAllByTestId(/history-item-/);
        expect(historyItems).toHaveLength(1);
        expect(screen.getByText('Assessment')).toBeInTheDocument();
        expect(screen.queryByText('PBL Test')).not.toBeInTheDocument();
        expect(screen.queryByText('Discovery Test')).not.toBeInTheDocument();
      });
    });

    it('should filter by PBL type', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getAllByTestId(/history-item-/)).toHaveLength(3);
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('PBL'));

      await waitFor(() => {
        const historyItems = screen.getAllByTestId(/history-item-/);
        expect(historyItems).toHaveLength(1);
        expect(screen.getByText('PBL Test')).toBeInTheDocument();
        expect(screen.queryByText('Assessment')).not.toBeInTheDocument();
        expect(screen.queryByText('Discovery Test')).not.toBeInTheDocument();
      });
    });

    it('should filter by Discovery type', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getAllByTestId(/history-item-/)).toHaveLength(3);
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('Discovery'));

      await waitFor(() => {
        const historyItems = screen.getAllByTestId(/history-item-/);
        expect(historyItems).toHaveLength(1);
        expect(screen.getByText('Discovery Test')).toBeInTheDocument();
        expect(screen.queryByText('Assessment')).not.toBeInTheDocument();
        expect(screen.queryByText('PBL Test')).not.toBeInTheDocument();
      });
    });

    it('should return to all items when clicking All tab', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getAllByTestId(/history-item-/)).toHaveLength(3);
      });

      const user = userEvent.setup();
      
      // Filter to PBL first
      await user.click(screen.getByText('PBL'));
      await waitFor(() => {
        expect(screen.getAllByTestId(/history-item-/)).toHaveLength(1);
      });

      // Return to all
      await user.click(screen.getByText('All'));
      await waitFor(() => {
        expect(screen.getAllByTestId(/history-item-/)).toHaveLength(3);
      });
    });

    it('should update active tab styling', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('All')).toHaveClass('border-blue-500');
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('PBL'));

      await waitFor(() => {
        expect(screen.getByText('PBL')).toHaveClass('border-blue-500');
        expect(screen.getByText('All')).not.toHaveClass('border-blue-500');
      });
    });
  });

  describe('Sorting', () => {
    const sortableHistory = {
      assessment: [
        {
          assessment_id: 'assess1',
          timestamp: '2024-01-01T00:00:00Z',
          scores: { overall: 85, domains: {} },
          summary: { total_questions: 10, correct_answers: 8, level: 'intermediate' },
          duration_seconds: 600,
          language: 'en'
        },
        {
          assessment_id: 'assess2',
          timestamp: '2024-01-03T00:00:00Z',
          scores: { overall: 92, domains: {} },
          summary: { total_questions: 15, correct_answers: 14, level: 'advanced' },
          duration_seconds: 900,
          language: 'en'
        }
      ],
      pbl: [],
      discovery: []
    };

    beforeEach(() => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/assessment/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: sortableHistory.assessment, success: true })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ history: [], success: true })
        });
      });
    });

    it('should sort by newest first by default', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        const historyItems = screen.getAllByTestId(/history-item-/);
        expect(historyItems).toHaveLength(2);
        // First item should be assess2 (newer)
        expect(historyItems[0]).toHaveTextContent('92%');
        expect(historyItems[1]).toHaveTextContent('85%');
      });
    });

    it('should change sort order when dropdown clicked', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Newest First')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const sortDropdown = screen.getByText('Newest First');
      await user.click(sortDropdown);

      expect(screen.getByText('Oldest First')).toBeInTheDocument();
      expect(screen.getByText('Highest Score')).toBeInTheDocument();
      expect(screen.getByText('Lowest Score')).toBeInTheDocument();
    });

    it('should sort by oldest first', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Newest First')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const sortDropdown = screen.getByText('Newest First');
      await user.click(sortDropdown);
      await user.click(screen.getByText('Oldest First'));

      await waitFor(() => {
        const historyItems = screen.getAllByTestId(/history-item-/);
        expect(historyItems).toHaveLength(2);
        // First item should be assess1 (older)
        expect(historyItems[0]).toHaveTextContent('85%');
        expect(historyItems[1]).toHaveTextContent('92%');
      });
    });

    it('should sort by highest score', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Newest First')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const sortDropdown = screen.getByText('Newest First');
      await user.click(sortDropdown);
      await user.click(screen.getByText('Highest Score'));

      await waitFor(() => {
        const historyItems = screen.getAllByTestId(/history-item-/);
        expect(historyItems).toHaveLength(2);
        // First item should be assess2 (92%)
        expect(historyItems[0]).toHaveTextContent('92%');
        expect(historyItems[1]).toHaveTextContent('85%');
      });
    });

    it('should sort by lowest score', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Newest First')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const sortDropdown = screen.getByText('Newest First');
      await user.click(sortDropdown);
      await user.click(screen.getByText('Lowest Score'));

      await waitFor(() => {
        const historyItems = screen.getAllByTestId(/history-item-/);
        expect(historyItems).toHaveLength(2);
        // First item should be assess1 (85%)
        expect(historyItems[0]).toHaveTextContent('85%');
        expect(historyItems[1]).toHaveTextContent('92%');
      });
    });
  });

  describe('Statistics Display', () => {
    const statsHistory = {
      assessment: [
        {
          assessment_id: 'assess1',
          timestamp: '2024-01-01T00:00:00Z',
          scores: { overall: 85, domains: {} },
          summary: { total_questions: 10, correct_answers: 8, level: 'intermediate' },
          duration_seconds: 600,
          language: 'en'
        },
        {
          assessment_id: 'assess2',
          timestamp: '2024-01-02T00:00:00Z',
          scores: { overall: 90, domains: {} },
          summary: { total_questions: 20, correct_answers: 18, level: 'advanced' },
          duration_seconds: 1200,
          language: 'en'
        }
      ],
      pbl: [
        {
          id: 'pbl1',
          logId: 'log1',
          scenarioId: 'scenario1',
          scenarioTitle: 'PBL Test',
          status: 'completed',
          startedAt: '2024-01-01T00:00:00Z',
          completedAt: '2024-01-01T02:00:00Z',
          duration: 7200,
          progress: { percentage: 100, completedTasks: 5, totalTaskCount: 5 },
          score: 88
        }
      ],
      discovery: [
        {
          id: 'discovery1',
          programId: 'program1',
          scenarioId: 'scenario1',
          scenarioTitle: 'Discovery Test',
          careerType: 'Tech',
          status: 'completed',
          startedAt: '2024-01-01T00:00:00Z',
          completedAt: '2024-01-01T01:30:00Z',
          duration: 5400,
          progress: { percentage: 100, completedTasks: 3, totalTaskCount: 3 }
        }
      ]
    };

    beforeEach(() => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/assessment/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: statsHistory.assessment, success: true })
          });
        }
        if (url === '/api/pbl/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: statsHistory.pbl, success: true })
          });
        }
        if (url === '/api/discovery/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: statsHistory.discovery, success: true })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });
    });

    it('should display total sessions count', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('4 sessions')).toBeInTheDocument();
      });
    });

    it('should display total time spent', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        // Total: 600 + 1200 + 7200 + 5400 = 14400 seconds = 4 hours
        expect(screen.getByText('4h 0m total')).toBeInTheDocument();
      });
    });

    it('should display average score', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        // Average: (85 + 90 + 88) / 3 = 87.67 ≈ 88%
        expect(screen.getByText('88% avg')).toBeInTheDocument();
      });
    });

    it('should display completion rate', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        // All 4 sessions are completed
        expect(screen.getByText('100% completion')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile layout', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Learning History')).toBeInTheDocument();
      });

      // Mobile-specific elements should be visible
      const tabs = screen.getByRole('tablist');
      expect(tabs).toHaveClass('flex-wrap');
    });

    it('should handle tablet layout', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Learning History')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('tablist')).toBeInTheDocument();
        expect(screen.getAllByRole('tab')).toHaveLength(4);
      });
    });

    it('should support keyboard navigation', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('All')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      
      // Tab to first tab
      await user.tab();
      expect(screen.getByText('All')).toHaveFocus();

      // Navigate with arrow keys
      await user.keyboard('[ArrowRight]');
      expect(screen.getByText('Assessment')).toHaveFocus();
    });

    it('should have proper semantic structure', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('navigation')).toBeInTheDocument();
        expect(screen.getAllByRole('article')).toHaveLength(0); // No articles when empty
      });
    });
  });

  describe('Search and Refresh', () => {
    it('should handle page refresh', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/assessment/history');
        expect(mockFetch).toHaveBeenCalledWith('/api/pbl/history');
        expect(mockFetch).toHaveBeenCalledWith('/api/discovery/history');
      });

      // Simulate refresh
      mockFetch.mockClear();
      
      await act(async () => {
        fireEvent(window, new Event('focus'));
      });

      // Should not reload automatically unless explicitly programmed to do so
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle empty search results', async () => {
      // This test assumes search functionality exists
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('No learning history yet')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeAssessmentHistory = Array.from({ length: 100 }, (_, i) => ({
        assessment_id: `assess${i}`,
        timestamp: new Date(2024, 0, i + 1).toISOString(),
        scores: { overall: 80 + i % 20, domains: {} },
        summary: { total_questions: 10, correct_answers: 8, level: 'intermediate' },
        duration_seconds: 600,
        language: 'en'
      }));

      mockFetch.mockImplementation((url) => {
        if (url === '/api/assessment/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: largeAssessmentHistory, success: true })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ history: [], success: true })
        });
      });

      const startTime = performance.now();
      
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(screen.getAllByTestId(/history-item-/)).toHaveLength(100);
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should not make unnecessary API calls', async () => {
      await act(async () => {
        render(<HistoryPage />);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3); // One for each API
      });

      // Should not make additional calls on re-render
      mockFetch.mockClear();
      
      const user = userEvent.setup();
      await user.click(screen.getByText('Assessment'));

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});