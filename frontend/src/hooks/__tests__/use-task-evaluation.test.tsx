import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useTaskEvaluation } from '../use-task-evaluation';
import { authenticatedFetch } from '@/lib/utils/authenticated-fetch';

// Mock dependencies
jest.mock('@/lib/utils/authenticated-fetch');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' }
  })
}));

const mockAuthenticatedFetch = authenticatedFetch as jest.MockedFunction<typeof authenticatedFetch>;

describe('useTaskEvaluation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() =>
        useTaskEvaluation({
          taskId: 'task-1',
          programId: 'program-1',
          scenarioId: 'scenario-1',
          currentTask: null,
          scenario: null,
          conversations: []
        })
      );

      expect(result.current.evaluation).toBeNull();
      expect(result.current.isEvaluating).toBe(false);
      expect(result.current.isEvaluateDisabled).toBe(false);
      expect(result.current.showEvaluateButton).toBe(false);
      expect(result.current.taskEvaluations).toEqual({});
      expect(result.current.isTranslating).toBe(false);
    });
  });

  describe('Loading Evaluation', () => {
    it('should load evaluation when conversations exist', async () => {
      const mockEvaluation = {
        id: 'eval-1',
        score: 4.5,
        domainScores: {
          engaging_with_ai: 4,
          creating_with_ai: 5,
          managing_with_ai: 4,
          designing_with_ai: 5
        },
        ksaScores: {
          knowledge: 4,
          skills: 5,
          attitudes: 4
        },
        strengths: ['Good use of AI'],
        improvements: ['Could improve on X'],
        metadata: { conversationCount: 3 }
      };

      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { evaluation: mockEvaluation } })
      } as Response);

      const { result } = renderHook(() =>
        useTaskEvaluation({
          taskId: 'task-1',
          programId: 'program-1',
          scenarioId: 'scenario-1',
          currentTask: { id: 'task-1' } as any,
          scenario: null,
          conversations: [
            { type: 'user', content: 'Hello', timestamp: new Date().toISOString() },
            { type: 'ai', content: 'Hi', timestamp: new Date().toISOString() }
          ] as any[]
        })
      );

      await waitFor(() => {
        expect(result.current.showEvaluateButton).toBe(true);
        expect(result.current.evaluation).toEqual(mockEvaluation);
      });
    });

    it('should disable evaluate button when evaluation is up to date', async () => {
      const mockEvaluation = {
        id: 'eval-1',
        score: 4.5,
        metadata: { conversationCount: 2 }
      };

      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { evaluation: mockEvaluation } })
      } as Response);

      const { result } = renderHook(() =>
        useTaskEvaluation({
          taskId: 'task-1',
          programId: 'program-1',
          scenarioId: 'scenario-1',
          currentTask: { id: 'task-1' } as any,
          scenario: null,
          conversations: [
            { type: 'user', content: 'Hello', timestamp: new Date().toISOString() },
            { type: 'ai', content: 'Hi', timestamp: new Date().toISOString() }
          ] as any[]
        })
      );

      await waitFor(() => {
        expect(result.current.isEvaluateDisabled).toBe(true);
      });
    });

    it('should not disable evaluate button when new messages were added', async () => {
      const mockEvaluation = {
        id: 'eval-1',
        score: 4.5,
        metadata: { conversationCount: 1 }
      };

      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { evaluation: mockEvaluation } })
      } as Response);

      const { result } = renderHook(() =>
        useTaskEvaluation({
          taskId: 'task-1',
          programId: 'program-1',
          scenarioId: 'scenario-1',
          currentTask: { id: 'task-1' } as any,
          scenario: null,
          conversations: [
            { type: 'user', content: 'Hello', timestamp: new Date().toISOString() },
            { type: 'ai', content: 'Hi', timestamp: new Date().toISOString() },
            { type: 'user', content: 'Second message', timestamp: new Date().toISOString() }
          ] as any[]
        })
      );

      await waitFor(() => {
        expect(result.current.isEvaluateDisabled).toBe(false);
      });
    });
  });

  describe('handleEvaluate', () => {
    it('should evaluate task and save results', async () => {
      const mockEvaluation = {
        id: 'eval-1',
        score: 4.5,
        domainScores: { engaging_with_ai: 4 },
        ksaScores: { knowledge: 4, skills: 5, attitudes: 4 },
        strengths: ['Good'],
        improvements: ['Better']
      };

      const mockTask = {
        id: 'task-1',
        title: { en: 'Task 1' },
        assessmentFocus: {
          primary: ['knowledge'],
          secondary: ['skills']
        }
      };

      const mockScenario = {
        targetDomains: ['engaging_with_ai']
      };

      // Mock all calls - useEffect may run multiple times
      mockAuthenticatedFetch
        .mockResolvedValue({
          ok: false,
          json: async () => ({ error: 'Not found' })
        } as Response);

      // Override for specific calls
      mockAuthenticatedFetch
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Not found' })
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Not found' })
        } as Response)
        // handleEvaluate call
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, evaluation: mockEvaluation })
        } as Response)
        // Save evaluation call
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { evaluationId: 'eval-1' } })
        } as Response)
        // Potential additional useEffect call
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Not found' })
        } as Response);

      const { result } = renderHook(() =>
        useTaskEvaluation({
          taskId: 'task-1',
          programId: 'program-1',
          scenarioId: 'scenario-1',
          currentTask: mockTask as any,
          scenario: mockScenario as any,
          conversations: [
            { type: 'user', content: 'Hello', timestamp: new Date().toISOString() }
          ] as any[]
        })
      );

      await act(async () => {
        await result.current.handleEvaluate();
      });

      await waitFor(() => {
        expect(result.current.isEvaluating).toBe(false);
      });

      // Allow time for all state updates to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(result.current.evaluation).toEqual({ ...mockEvaluation, id: 'eval-1' });
      expect(result.current.isEvaluateDisabled).toBe(true);
      expect(result.current.taskEvaluations['task-1']).toEqual({ ...mockEvaluation, id: 'eval-1' });
    });

    it('should handle evaluation API errors gracefully', async () => {
      const mockTask = {
        id: 'task-1',
        title: { en: 'Task 1' },
        assessmentFocus: { primary: [], secondary: [] }
      };

      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' })
      } as Response);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useTaskEvaluation({
          taskId: 'task-1',
          programId: 'program-1',
          scenarioId: 'scenario-1',
          currentTask: mockTask as any,
          scenario: null,
          conversations: [
            { type: 'user', content: 'Hello', timestamp: new Date().toISOString() }
          ] as any[]
        })
      );

      await act(async () => {
        await result.current.handleEvaluate();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalled();
        expect(result.current.isEvaluating).toBe(false);
      });

      consoleErrorSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('should not evaluate when no conversations exist', async () => {
      const { result } = renderHook(() =>
        useTaskEvaluation({
          taskId: 'task-1',
          programId: 'program-1',
          scenarioId: 'scenario-1',
          currentTask: { id: 'task-1' } as any,
          scenario: null,
          conversations: []
        })
      );

      await act(async () => {
        await result.current.handleEvaluate();
      });

      expect(mockAuthenticatedFetch).not.toHaveBeenCalled();
    });

    it('should not evaluate when currentTask is null', async () => {
      const { result } = renderHook(() =>
        useTaskEvaluation({
          taskId: 'task-1',
          programId: 'program-1',
          scenarioId: 'scenario-1',
          currentTask: null,
          scenario: null,
          conversations: [
            { type: 'user', content: 'Hello', timestamp: new Date().toISOString() }
          ] as any[]
        })
      );

      await act(async () => {
        await result.current.handleEvaluate();
      });

      expect(mockAuthenticatedFetch).not.toHaveBeenCalled();
    });
  });

  describe('handleTranslateEvaluation', () => {
    it('should translate evaluation successfully', async () => {
      const mockEvaluation = {
        id: 'eval-1',
        score: 4.5,
        needsTranslation: true,
        strengths: ['Good'],
        improvements: ['Better']
      };

      const translatedEvaluation = {
        ...mockEvaluation,
        strengths: ['好的'],
        improvements: ['更好的'],
        needsTranslation: false
      };

      mockAuthenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { evaluation: mockEvaluation } })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { evaluation: translatedEvaluation } })
        } as Response);

      const { result } = renderHook(() =>
        useTaskEvaluation({
          taskId: 'task-1',
          programId: 'program-1',
          scenarioId: 'scenario-1',
          currentTask: { id: 'task-1' } as any,
          scenario: null,
          conversations: [
            { type: 'user', content: 'Hello', timestamp: new Date().toISOString() }
          ] as any[]
        })
      );

      // Wait for initial evaluation load
      await waitFor(() => {
        expect(result.current.evaluation).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleTranslateEvaluation();
      });

      await waitFor(() => {
        expect(result.current.evaluation?.needsTranslation).toBe(false);
        expect(result.current.isTranslating).toBe(false);
      });
    });

    it('should handle translation errors gracefully', async () => {
      const mockEvaluation = {
        id: 'eval-1',
        score: 4.5,
        needsTranslation: true
      };

      mockAuthenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { evaluation: mockEvaluation } })
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        } as Response);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useTaskEvaluation({
          taskId: 'task-1',
          programId: 'program-1',
          scenarioId: 'scenario-1',
          currentTask: { id: 'task-1' } as any,
          scenario: null,
          conversations: [
            { type: 'user', content: 'Hello', timestamp: new Date().toISOString() }
          ] as any[]
        })
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.evaluation).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleTranslateEvaluation();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalled();
        expect(result.current.isTranslating).toBe(false);
      });

      consoleErrorSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('should not translate when evaluation is null', async () => {
      const { result } = renderHook(() =>
        useTaskEvaluation({
          taskId: 'task-1',
          programId: 'program-1',
          scenarioId: 'scenario-1',
          currentTask: { id: 'task-1' } as any,
          scenario: null,
          conversations: []
        })
      );

      await act(async () => {
        await result.current.handleTranslateEvaluation();
      });

      expect(mockAuthenticatedFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('translate-evaluation'),
        expect.anything()
      );
    });
  });

  describe('Loading Program Task Evaluations', () => {
    it('should load all task evaluations for a program', async () => {
      const mockTasks = [
        { id: 'task-1', taskIndex: 0 },
        { id: 'task-2', taskIndex: 1 }
      ];

      const mockEval1 = {
        id: 'eval-1',
        score: 4.5
      };

      const mockEval2 = {
        id: 'eval-2',
        score: 3.5
      };

      mockAuthenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTasks
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { evaluation: mockEval1 } })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { evaluation: mockEval2 } })
        } as Response);

      const { result } = renderHook(() =>
        useTaskEvaluation({
          taskId: 'task-1',
          programId: 'program-1',
          scenarioId: 'scenario-1',
          currentTask: { id: 'task-1' } as any,
          scenario: null,
          conversations: []
        })
      );

      await act(async () => {
        await result.current.loadProgramTaskEvaluations();
      });

      await waitFor(() => {
        expect(result.current.taskEvaluations['task-1']).toEqual(mockEval1);
        expect(result.current.taskEvaluations['task-2']).toEqual(mockEval2);
        expect(result.current.programTasks).toEqual(mockTasks);
      });
    });

    it('should not load evaluations for temp programs', async () => {
      const { result } = renderHook(() =>
        useTaskEvaluation({
          taskId: 'task-1',
          programId: 'temp_123',
          scenarioId: 'scenario-1',
          currentTask: { id: 'task-1' } as any,
          scenario: null,
          conversations: []
        })
      );

      await act(async () => {
        await result.current.loadProgramTaskEvaluations();
      });

      expect(mockAuthenticatedFetch).not.toHaveBeenCalled();
    });
  });

  describe('Enable Evaluate Button After New Messages', () => {
    it('should enable evaluate button when new user messages are added', async () => {
      const mockEvaluation = {
        id: 'eval-1',
        score: 4.5,
        metadata: { conversationCount: 1 }
      };

      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { evaluation: mockEvaluation } })
      } as Response);

      const { result } = renderHook(() =>
        useTaskEvaluation({
          taskId: 'task-1',
          programId: 'program-1',
          scenarioId: 'scenario-1',
          currentTask: { id: 'task-1' } as any,
          scenario: null,
          conversations: [
            { type: 'user', content: 'Hello', timestamp: new Date().toISOString() }
          ] as any[]
        })
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.evaluation).not.toBeNull();
      });

      await act(async () => {
        result.current.enableEvaluateButtonAfterNewMessages([
          { type: 'user', content: 'Hello', timestamp: new Date().toISOString() },
          { type: 'user', content: 'Second message', timestamp: new Date().toISOString() }
        ] as any[]);
      });

      expect(result.current.isEvaluateDisabled).toBe(false);
    });

    it('should keep button disabled when no new messages', async () => {
      const mockEvaluation = {
        id: 'eval-1',
        score: 4.5,
        metadata: { conversationCount: 1 }
      };

      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { evaluation: mockEvaluation } })
      } as Response);

      const { result } = renderHook(() =>
        useTaskEvaluation({
          taskId: 'task-1',
          programId: 'program-1',
          scenarioId: 'scenario-1',
          currentTask: { id: 'task-1' } as any,
          scenario: null,
          conversations: [
            { type: 'user', content: 'Hello', timestamp: new Date().toISOString() }
          ] as any[]
        })
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isEvaluateDisabled).toBe(true);
      });

      await act(async () => {
        result.current.enableEvaluateButtonAfterNewMessages([
          { type: 'user', content: 'Hello', timestamp: new Date().toISOString() }
        ] as any[]);
      });

      expect(result.current.isEvaluateDisabled).toBe(true);
    });
  });
});
