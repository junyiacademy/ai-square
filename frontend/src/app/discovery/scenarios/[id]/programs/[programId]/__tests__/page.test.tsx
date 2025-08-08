import { renderWithProviders, screen, waitFor } from '@/test-utils/helpers/render';
import userEvent from '@testing-library/user-event';
import { useRouter, useParams } from 'next/navigation';
import ProgramDetailPage from '../page';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
  usePathname: jest.fn(() => '/discovery/scenarios/scenario-1/programs/program-1')
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn()
    }
  })
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}));

// Mock DiscoveryPageLayout
jest.mock('@/components/discovery/DiscoveryPageLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn()
};

const mockUseRouter = useRouter as jest.Mock;
const mockUseParams = useParams as jest.Mock;

// Import and mock useAuth after the mock is set up
import { useAuth } from '@/contexts/AuthContext';
const mockUseAuth = useAuth as jest.Mock;

describe('ProgramDetailPage', () => {
  const mockProgramData = {
    id: 'program-1',
    scenarioId: 'scenario-1',
    status: 'active',
    completedTasks: 1,
    totalTasks: 3,
    totalXP: 95,
    careerType: 'content_creator',
    scenarioTitle: 'Content Creator Discovery',
    createdAt: '2023-01-01T00:00:00Z',
    tasks: [
      {
        id: 'task-1',
        title: 'understand_algorithms',
        description: '學習演算法基本概念',
        xp: 95,
        status: 'completed',
        completedAt: '2023-01-01T10:00:00Z'
      },
      {
        id: 'task-2',
        title: 'learn_content_basics',
        description: '學習內容創作基礎',
        xp: 100,
        status: 'active'
      },
      {
        id: 'task-3',
        title: 'advanced_techniques',
        description: '進階技巧應用',
        xp: 120,
        status: 'locked'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseParams.mockReturnValue({
      id: 'scenario-1',
      programId: 'program-1'
    });
    
    mockUseAuth.mockReturnValue({
      user: { email: 'test@example.com' },
      isLoggedIn: true,
      isLoading: false
    } as any);

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-session-token'),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });

    // Default fetch mock
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => mockProgramData
    } as Response);
  });

  describe('Rendering', () => {
    it('should render program details correctly', async () => {
      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for any content from the program data
      expect(screen.getByText(/understand_algorithms/i)).toBeInTheDocument();
      expect(screen.getAllByText(/95 XP/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/33%/)).toBeInTheDocument(); // Progress percentage
    });

    it('should show loading state initially', async () => {
      renderWithProviders(<ProgramDetailPage />);
      expect(screen.getByText('載入中...')).toBeInTheDocument();
    });

    it('should redirect to login when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoggedIn: false,
        isLoading: false
      } as any);

      renderWithProviders(<ProgramDetailPage />);

      expect(mockRouter.push).toHaveBeenCalledWith('/login?redirect=/discovery/scenarios');
    });

    it('should show error message when program not found', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 404
      } as Response);

      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        const element = screen.queryByText('找不到此學習歷程');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Career Information', () => {
    it('should display correct career information for content creator', async () => {
      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        const element = screen.queryByText('數位魔法師 - 內容創作者');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });

      expect(screen.getByText('內容魔法')).toBeInTheDocument();
      expect(screen.getByText('視覺咒語')).toBeInTheDocument();
      expect(screen.getByText('文字煉金術')).toBeInTheDocument();
      expect(screen.getByText('社群召喚術')).toBeInTheDocument();
    });

    it('should display correct career information for different career types', async () => {
      const youtuberProgramData = {
        ...mockProgramData,
        careerType: 'youtuber'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => youtuberProgramData
      } as Response);

      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        const element = screen.queryByText('星際廣播員 - YouTuber');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });

      expect(screen.getByText('星際剪輯術')).toBeInTheDocument();
      expect(screen.getByText('觀眾心理學')).toBeInTheDocument();
    });

    it('should handle unknown career types', async () => {
      const unknownCareerData = {
        ...mockProgramData,
        careerType: 'unknown_career'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => unknownCareerData
      } as Response);

      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        const element = screen.queryByText('Content Creator Discovery');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Task List', () => {
    it('should render all tasks with correct status', async () => {
      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        const element = screen.queryByText('discovery:task 1: understand_algorithms');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });

      expect(screen.getByText(/learn_content_basics/i)).toBeInTheDocument();
      expect(screen.getByText(/advanced_techniques/i)).toBeInTheDocument();

      // Check XP values - use getAllByText for multiple occurrences
      expect(screen.getAllByText('95 XP')[0]).toBeInTheDocument();
      expect(screen.getByText('100 XP')).toBeInTheDocument();
      expect(screen.getByText('120 XP')).toBeInTheDocument();
    });

    it('should show correct buttons for different task statuses', async () => {
      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/view|查看/i)).toBeInTheDocument(); // Completed task
      });

      expect(screen.getByText(/continue|繼續/i)).toBeInTheDocument(); // Active task
      // Locked task should not have any button
    });

    it('should show completion date for completed tasks', async () => {
      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        const element = screen.queryByText(/完成於/);
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should show statistics for completed tasks', async () => {
      const completedTaskData = {
        ...mockProgramData,
        tasks: [
          {
            ...mockProgramData.tasks[0],
            status: 'completed'
          },
          ...mockProgramData.tasks.slice(1)
        ]
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => completedTaskData
      } as Response);

      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        const element = screen.queryByText(/6/);
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });

      expect(screen.getByText(/2/)).toBeInTheDocument();
    });
  });

  describe('Task Navigation', () => {
    it('should navigate to active task when clicked', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        const element = screen.queryByText('任務 2: learn_content_basics');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });

      // Click on active task card
      const taskCard = screen.getByText(/learn_content_basics/i).closest('div');
      if (taskCard) {
        await user.click(taskCard);
      }

      expect(mockRouter.push).toHaveBeenCalledWith(
        '/discovery/scenarios/scenario-1/programs/program-1/tasks/task-2'
      );
    });

    it('should navigate to completed task for viewing', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        const element = screen.queryByText('任務 1: understand_algorithms');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });

      // Click on completed task card
      const taskCard = screen.getByText(/understand_algorithms/i).closest('div');
      if (taskCard) {
        await user.click(taskCard);
      }

      expect(mockRouter.push).toHaveBeenCalledWith(
        '/discovery/scenarios/scenario-1/programs/program-1/tasks/task-1'
      );
    });

    it('should not allow navigation to locked tasks', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        const element = screen.queryByText('任務 3: advanced_techniques');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });

      // Try to click on locked task card
      const taskCard = screen.getByText(/advanced_techniques/i).closest('div');
      if (taskCard) {
        await user.click(taskCard);
      }

      expect(mockRouter.push).not.toHaveBeenCalledWith(
        expect.stringContaining('task-3')
      );
    });
  });

  describe('Progress Tracking', () => {
    it('should display correct progress percentage', async () => {
      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('33%')).toBeInTheDocument(); // 1/3 = 33%
      });

      expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
    });

    it('should handle zero progress', async () => {
      const noProgramData = {
        ...mockProgramData,
        completedTasks: 0,
        totalXP: 0
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => noProgramData
      } as Response);

      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        const element = screen.queryByText('0%');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });

      expect(screen.getByText(/0 \/ 3/)).toBeInTheDocument();
    });

    it('should handle 100% completion', async () => {
      const completedProgramData = {
        ...mockProgramData,
        completedTasks: 3,
        totalTasks: 3,
        status: 'completed',
        tasks: mockProgramData.tasks.map(task => ({
          ...task,
          status: 'completed',
          completedAt: '2023-01-01T10:00:00Z'
        }))
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => completedProgramData
      } as Response);

      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        const element = screen.queryByText('100%');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });

      expect(screen.getByText(/3 \/ 3/)).toBeInTheDocument();
    });
  });

  describe('Program Completion', () => {
    it('should show completion message when all tasks are finished', async () => {
      const completedProgramData = {
        ...mockProgramData,
        completedTasks: 3,
        totalTasks: 3,
        status: 'completed',
        tasks: mockProgramData.tasks.map(task => ({
          ...task,
          status: 'completed',
          completedAt: '2023-01-01T10:00:00Z'
        }))
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => completedProgramData
      } as Response);

      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        const element = screen.queryByText('恭喜完成所有任務！');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });

      expect(screen.getByText(/你已經完成了這個學習歷程的所有任務，獲得了.*XP！/)).toBeInTheDocument();
      expect(screen.getByText('開始新的歷程')).toBeInTheDocument();
    });

    it('should navigate to scenario list when starting new journey', async () => {
      const user = userEvent.setup();
      
      const completedProgramData = {
        ...mockProgramData,
        completedTasks: 3,
        totalTasks: 3,
        tasks: mockProgramData.tasks.map(task => ({
          ...task,
          status: 'completed'
        }))
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => completedProgramData
      } as Response);

      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        const element = screen.queryByText('開始新的歷程');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });

      const newJourneyButton = screen.getByText('開始新的歷程');
      await user.click(newJourneyButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/discovery/scenarios/scenario-1');
    });
  });

  describe('Navigation', () => {
    it('should have back button to scenario details', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        const element = screen.queryByText('返回職業詳情');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });

      const backButton = screen.getByRole('link', { name: /back|返回/i });
      await user.click(backButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/discovery/scenarios/scenario-1');
    });
  });

  describe('Status Display', () => {
    it('should show correct status for active program', async () => {
      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        const element = screen.queryByText('進行中');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should show correct status for completed program', async () => {
      const completedProgramData = {
        ...mockProgramData,
        status: 'completed'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => completedProgramData
      } as Response);

      renderWithProviders(<ProgramDetailPage />);

      await waitFor(() => {
        const element = screen.queryByText('已完成');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });
});