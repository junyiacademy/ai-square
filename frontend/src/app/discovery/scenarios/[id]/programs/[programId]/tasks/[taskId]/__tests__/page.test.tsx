import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useParams } from 'next/navigation';
import TaskDetailPage from '../page';

// Mock dependencies
const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn()
};

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => mockRouter),
  useParams: jest.fn(),
  usePathname: jest.fn(() => '/discovery/scenarios/scenario-1/programs/program-1/tasks/task-1')
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

// Mock fetch globally
global.fetch = jest.fn();

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

// Import useAuth after the mock is set up
import { useAuth } from '@/contexts/AuthContext';
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('TaskDetailPage', () => {
  const mockTaskData = {
    id: 'task-1',
    title: 'Understand Algorithms',
    type: 'analysis',
    status: 'active',
    content: {
      instructions: '創意導師 Luna 帶著緊急消息歡迎你',
      context: {
        description: '學習演算法的基本概念',
        xp: 100,
        objectives: ['理解演算法基本概念', '運用創意力量對抗虛假內容'],
        completionCriteria: ['完成任務描述', '展示理解能力'],
        hints: ['使用 AI 工具協助查核', '思考演算法的運作方式']
      }
    },
    interactions: [],
    startedAt: '2023-01-01T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseParams.mockReturnValue({
      id: 'scenario-1',
      programId: 'program-1',
      taskId: 'task-1'
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

    // Default fetch mock for task data
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => mockTaskData
    } as Response);
  });

  describe('Rendering', () => {
    it('should render task details correctly', async () => {
      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Understand Algorithms')).toBeInTheDocument();
      });

      expect(screen.getByText('學習演算法的基本概念')).toBeInTheDocument();
      expect(screen.getByText('100 XP')).toBeInTheDocument();
      expect(screen.getByText('理解演算法基本概念')).toBeInTheDocument();
      expect(screen.getByText('完成任務描述')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(<TaskDetailPage />);
      expect(screen.getByText('載入中...')).toBeInTheDocument();
    });

    it('should redirect to login when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoggedIn: false,
        isLoading: false
      } as any);

      render(<TaskDetailPage />);

      expect(mockRouter.push).toHaveBeenCalledWith('/login?redirect=/discovery/scenarios');
    });

    it('should show error message when task not found', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 404
      } as Response);

      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('找不到此任務')).toBeInTheDocument();
      });
    });
  });

  describe('Task Submission', () => {
    it('should allow user to submit answer', async () => {
      const user = userEvent.setup();
      
      // Mock successful submission
      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTaskData
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            completed: true,
            feedback: '很好的回答！',
            xpEarned: 95,
            strengths: ['清楚的分析'],
            improvements: []
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockTaskData,
            interactions: [
              {
                timestamp: '2023-01-01T00:01:00Z',
                type: 'user_input',
                content: { response: '我的答案', timeSpent: 300 }
              },
              {
                timestamp: '2023-01-01T00:01:30Z',
                type: 'ai_response',
                content: {
                  completed: true,
                  feedback: '很好的回答！',
                  xpEarned: 95,
                  strengths: ['清楚的分析'],
                  improvements: []
                }
              }
            ]
          })
        } as Response);

      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Understand Algorithms')).toBeInTheDocument();
      });

      // Type in answer
      const textarea = screen.getByPlaceholderText('在這裡寫下你的回答...');
      await user.type(textarea, '我的答案');

      // Submit answer
      const submitButton = screen.getByText('提交答案');
      expect(submitButton).not.toBeDisabled();
      
      await user.click(submitButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/discovery/scenarios/scenario-1/programs/program-1/tasks/task-1'),
          expect.objectContaining({
            method: 'PATCH',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            }),
            body: expect.stringContaining('我的答案')
          })
        );
      });
    });

    it('should disable submit button when textarea is empty', async () => {
      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Understand Algorithms')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('提交答案');
      expect(submitButton).toBeDisabled();
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      
      // Mock slow submission
      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTaskData
        } as Response)
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 1000)));

      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Understand Algorithms')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('在這裡寫下你的回答...');
      await user.type(textarea, '我的答案');

      const submitButton = screen.getByText('提交答案');
      await user.click(submitButton);

      expect(screen.getByText('提交中...')).toBeInTheDocument();
    });
  });

  describe('Completed Task View', () => {
    const completedTaskData = {
      ...mockTaskData,
      status: 'completed',
      interactions: [
        {
          timestamp: '2023-01-01T00:01:00Z',
          type: 'user_input',
          content: { response: '我的第一個答案' }
        },
        {
          timestamp: '2023-01-01T00:01:30Z',
          type: 'ai_response',
          content: {
            completed: true,
            feedback: '很好的回答！',
            xpEarned: 95,
            strengths: ['清楚的分析'],
            improvements: []
          }
        }
      ]
    };

    it('should render completed task summary', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => completedTaskData
      } as Response);

      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('任務已完成！')).toBeInTheDocument();
      });

      expect(screen.getByText('1')).toBeInTheDocument(); // Attempt count
      expect(screen.getByText('嘗試次數')).toBeInTheDocument();
      expect(screen.getByText('技能成長')).toBeInTheDocument();
      expect(screen.getByText('綜合評價')).toBeInTheDocument();
    });

    it('should hide response section for completed tasks', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => completedTaskData
      } as Response);

      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('任務已完成！')).toBeInTheDocument();
      });

      expect(screen.queryByText('你的回答')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('在這裡寫下你的回答...')).not.toBeInTheDocument();
    });

    it('should show return button for completed tasks', async () => {
      const user = userEvent.setup();
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => completedTaskData
      } as Response);

      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('返回學習歷程')).toBeInTheDocument();
      });

      const returnButton = screen.getByText('返回學習歷程');
      await user.click(returnButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/discovery/scenarios/scenario-1/programs/program-1');
    });
  });

  describe('Learning History', () => {
    const taskWithHistory = {
      ...mockTaskData,
      interactions: [
        {
          timestamp: '2023-01-01T00:01:00Z',
          type: 'user_input',
          content: { response: '第一次嘗試' }
        },
        {
          timestamp: '2023-01-01T00:01:30Z',
          type: 'ai_response',
          content: {
            completed: false,
            feedback: '需要改進',
            xpEarned: 0,
            improvements: ['需要更詳細的分析']
          }
        },
        {
          timestamp: '2023-01-01T00:05:00Z',
          type: 'user_input',
          content: { response: '第二次改進的嘗試' }
        },
        {
          timestamp: '2023-01-01T00:05:30Z',
          type: 'ai_response',
          content: {
            completed: true,
            feedback: '很好！',
            xpEarned: 90,
            strengths: ['詳細分析']
          }
        }
      ]
    };

    it('should show learning history when available', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => taskWithHistory
      } as Response);

      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('學習歷程')).toBeInTheDocument();
      });

      expect(screen.getByText('(共 2 次嘗試')).toBeInTheDocument();
      expect(screen.getByText('第一次嘗試')).toBeInTheDocument();
      expect(screen.getByText('第二次改進的嘗試')).toBeInTheDocument();
      expect(screen.getByText('需要改進')).toBeInTheDocument();
      expect(screen.getByText('很好！')).toBeInTheDocument();
    });

    it('should allow collapsing and expanding history', async () => {
      const user = userEvent.setup();
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => taskWithHistory
      } as Response);

      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('第一次嘗試')).toBeInTheDocument();
      });

      // Find and click collapse button
      const collapseButton = screen.getByRole('button', { name: /collapse|expand/i }) || 
                           screen.getByTestId('collapse-history') ||
                           document.querySelector('button[class*="text-gray-600"]');
      
      if (collapseButton) {
        await user.click(collapseButton);
        
        await waitFor(() => {
          expect(screen.queryByText('第一次嘗試')).not.toBeInTheDocument();
        });
      }
    });

    it('should show quick links for passed attempts', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => taskWithHistory
      } as Response);

      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('✓1')).toBeInTheDocument();
      });

      expect(screen.getByText('次通過')).toBeInTheDocument();
    });
  });

  describe('Hints Feature', () => {
    it('should toggle hints visibility', async () => {
      const user = userEvent.setup();

      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('需要提示？')).toBeInTheDocument();
      });

      const hintsButton = screen.getByText('需要提示？');
      await user.click(hintsButton);

      expect(screen.getByText('隱藏提示')).toBeInTheDocument();
      expect(screen.getByText('使用 AI 工具協助查核')).toBeInTheDocument();
      expect(screen.getByText('思考演算法的運作方式')).toBeInTheDocument();
    });

    it('should not show hints section when no hints available', async () => {
      const taskWithoutHints = {
        ...mockTaskData,
        content: {
          ...mockTaskData.content,
          context: {
            ...mockTaskData.content.context,
            hints: undefined
          }
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => taskWithoutHints
      } as Response);

      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('需要提示？')).toBeInTheDocument();
      });

      const hintsButton = screen.getByText('需要提示？');
      await userEvent.click(hintsButton);

      expect(screen.queryByText('提示')).not.toBeInTheDocument();
    });
  });

  describe('Task Completion Flow', () => {
    const passedTaskData = {
      ...mockTaskData,
      interactions: [
        {
          timestamp: '2023-01-01T00:01:30Z',
          type: 'ai_response',
          content: {
            completed: true,
            feedback: '很好！',
            xpEarned: 90
          }
        }
      ]
    };

    it('should show success banner for passed tasks', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => passedTaskData
      } as Response);

      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('恭喜達到通過標準！')).toBeInTheDocument();
      });

      expect(screen.getByText('完成任務 →')).toBeInTheDocument();
    });

    it('should handle task completion confirmation', async () => {
      const user = userEvent.setup();
      
      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => passedTaskData
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            taskCompleted: true,
            evaluation: {
              id: 'eval-1',
              score: 90,
              xpEarned: 90,
              feedback: '綜合評價...'
            }
          })
        } as Response);

      render(<TaskDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('完成任務 →')).toBeInTheDocument();
      });

      const completeButton = screen.getByText('完成任務 →');
      await user.click(completeButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/discovery/scenarios/scenario-1/programs/program-1/tasks/task-1'),
          expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining('confirm-complete')
          })
        );
      });

      expect(mockRouter.push).toHaveBeenCalledWith('/discovery/scenarios/scenario-1/programs/program-1');
    });
  });
});