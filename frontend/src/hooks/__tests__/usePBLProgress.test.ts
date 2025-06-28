import { renderHook, act } from '@testing-library/react';
import { usePBLProgress } from '../usePBLProgress';
import { SessionData, ConversationTurn, StageResult } from '@/types/pbl';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('usePBLProgress', () => {
  const mockScenarioId = 'test-scenario-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    // Mock getItem to return user data when 'user' key is requested
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'user') {
        return JSON.stringify(mockUser);
      }
      return null;
    });
  });

  describe('初始化', () => {
    it('應該正確初始化 hook', () => {
      const { result } = renderHook(() => usePBLProgress(mockScenarioId));
      
      expect(result.current).toBeDefined();
      expect(typeof result.current.saveProgress).toBe('function');
      expect(typeof result.current.loadProgress).toBe('function');
      expect(typeof result.current.clearProgress).toBe('function');
    });

    it('應該使用正確的 storage key', () => {
      const { result } = renderHook(() => usePBLProgress(mockScenarioId));
      
      // 調用 loadProgress 會觸發 getStorageKey，該函數會讀取 user
      act(() => {
        result.current.loadProgress();
      });
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('user');
    });
  });

  describe('saveProgress', () => {
    it('應該儲存進度到 localStorage', () => {
      const { result } = renderHook(() => usePBLProgress(mockScenarioId));
      
      const mockSession: SessionData = {
        id: 'session-123',
        userId: mockUser.id,
        scenarioId: mockScenarioId,
        status: 'in_progress',
        currentStage: 1,
        currentTaskIndex: 0,
        progress: {
          percentage: 25,
          completedStages: [0],
          timeSpent: 300,
        },
        startedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        stageResults: [],
        processLogs: [],
      };

      const mockConversation: ConversationTurn[] = [
        {
          id: 'turn-1',
          timestamp: new Date(),
          role: 'user',
          content: 'Hello AI',
        },
        {
          id: 'turn-2',
          timestamp: new Date(),
          role: 'ai',
          content: 'Hello! How can I help you?',
        },
      ];

      // Reset setItem mock to capture calls
      localStorageMock.setItem.mockImplementation((key: string, value: string) => {
        localStorageMock.setItem.mock.calls.push([key, value]);
      });

      act(() => {
        result.current.saveProgress(
          mockSession,
          mockConversation,
          'task-1',
          null,
          300
        );
      });

      const expectedKey = `pbl_progress_${mockScenarioId}_${mockUser.id}`;
      
      // Find the call with our expected key
      const saveCall = localStorageMock.setItem.mock.calls.find(
        call => call[0] === expectedKey
      );
      
      expect(saveCall).toBeDefined();
      expect(saveCall![0]).toBe(expectedKey);

      // 驗證儲存的資料結構
      const savedData = JSON.parse(saveCall![1]);
      expect(savedData).toMatchObject({
        sessionId: mockSession.id,
        scenarioId: mockScenarioId,
        currentStage: mockSession.currentStage,
        currentTaskId: 'task-1',
        conversation: expect.arrayContaining([
          expect.objectContaining({ content: 'Hello AI' }),
          expect.objectContaining({ content: 'Hello! How can I help you?' }),
        ]),
        timeSpent: 300,
      });
    });

    it('不應該儲存空的進度', () => {
      const { result } = renderHook(() => usePBLProgress(mockScenarioId));
      
      // Reset mock to track only new calls
      localStorageMock.setItem.mockClear();
      
      act(() => {
        result.current.saveProgress(null, [], undefined, null, 0);
      });

      // Should not save progress data (only user data might be saved in setup)
      const progressKey = `pbl_progress_${mockScenarioId}_${mockUser.id}`;
      const progressCall = localStorageMock.setItem.mock.calls.find(
        call => call[0] === progressKey
      );
      expect(progressCall).toBeUndefined();
    });

    it('應該處理儲存錯誤', () => {
      const { result } = renderHook(() => usePBLProgress(mockScenarioId));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock localStorage.setItem to throw error
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      });

      const mockSession: SessionData = {
        id: 'session-123',
        userId: mockUser.id,
        scenarioId: mockScenarioId,
        status: 'in_progress',
        currentStage: 1,
        currentTaskIndex: 0,
        progress: {
          percentage: 25,
          completedStages: [0],
          timeSpent: 300,
        },
        startedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        stageResults: [],
        processLogs: [],
      };

      act(() => {
        result.current.saveProgress(mockSession, [], undefined, null, 0);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error saving progress to localStorage:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('loadProgress', () => {
    it('應該從 localStorage 載入進度', () => {
      const { result } = renderHook(() => usePBLProgress(mockScenarioId));
      
      const mockProgressData = {
        sessionId: 'session-123',
        scenarioId: mockScenarioId,
        currentStage: 2,
        currentTaskId: 'task-2',
        conversation: [
          {
            id: 'turn-1',
            timestamp: new Date().toISOString(),
            role: 'user',
            content: 'Test message',
          },
        ],
        lastSaved: new Date().toISOString(),
        timeSpent: 600,
      };

      const storageKey = `pbl_progress_${mockScenarioId}_${mockUser.id}`;
      
      // Update mock to return progress data when requested
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'user') {
          return JSON.stringify(mockUser);
        }
        if (key === storageKey) {
          return JSON.stringify(mockProgressData);
        }
        return null;
      });

      let loadedData: any;
      act(() => {
        loadedData = result.current.loadProgress();
      });

      expect(localStorageMock.getItem).toHaveBeenCalledWith(storageKey);
      expect(loadedData).toEqual(mockProgressData);
    });

    it('應該處理沒有儲存進度的情況', () => {
      const { result } = renderHook(() => usePBLProgress(mockScenarioId));
      
      // Mock returns user data but no progress data
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'user') {
          return JSON.stringify(mockUser);
        }
        return null;
      });

      let loadedData: any;
      act(() => {
        loadedData = result.current.loadProgress();
      });

      expect(loadedData).toBeNull();
    });

    it('應該處理載入錯誤', () => {
      const { result } = renderHook(() => usePBLProgress(mockScenarioId));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const storageKey = `pbl_progress_${mockScenarioId}_${mockUser.id}`;
      
      // Mock to return invalid JSON for progress data
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'user') {
          return JSON.stringify(mockUser);
        }
        if (key === storageKey) {
          return 'invalid json';
        }
        return null;
      });

      let loadedData: any;
      act(() => {
        loadedData = result.current.loadProgress();
      });

      expect(loadedData).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error loading progress from localStorage:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('clearProgress', () => {
    it('應該清除儲存的進度', () => {
      const { result } = renderHook(() => usePBLProgress(mockScenarioId));
      
      act(() => {
        result.current.clearProgress();
      });

      const expectedKey = `pbl_progress_${mockScenarioId}_${mockUser.id}`;
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(expectedKey);
    });
  });

  describe('匿名用戶處理', () => {
    it('應該為匿名用戶使用 anonymous key', () => {
      // Mock to return no user data
      localStorageMock.getItem.mockImplementation((key: string) => {
        return null;
      });
      
      const { result } = renderHook(() => usePBLProgress(mockScenarioId));
      
      const mockSession: SessionData = {
        id: 'session-anon',
        userId: 'anonymous',
        scenarioId: mockScenarioId,
        status: 'in_progress',
        currentStage: 0,
        currentTaskIndex: 0,
        progress: {
          percentage: 0,
          completedStages: [],
          timeSpent: 0,
        },
        startedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        stageResults: [],
        processLogs: [],
      };

      act(() => {
        result.current.saveProgress(mockSession, [], undefined, null, 0);
      });

      const expectedKey = `pbl_progress_${mockScenarioId}_anonymous`;
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        expectedKey,
        expect.any(String)
      );
    });
  });
});