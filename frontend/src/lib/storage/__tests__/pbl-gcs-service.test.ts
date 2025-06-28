import { PBLStorageService } from '../pbl-storage-service';
import { SessionData, ProcessLog, StageResult } from '@/types/pbl';

// Mock fetch
global.fetch = jest.fn();

describe('PBLStorageService', () => {
  let service: PBLStorageService;
  const mockUserId = 'test-user-123';
  const mockUserEmail = 'test@example.com';
  const mockActivityId = 'job-search';
  const mockSessionId = 'session-123';

  beforeEach(() => {
    service = new PBLStorageService();
    jest.clearAllMocks();
    (fetch as jest.Mock).mockReset();
  });

  describe('createSession', () => {
    it('應該成功創建新的 session', async () => {
      const mockResponse = {
        success: true,
        data: { session_id: mockSessionId },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.createSession(
        mockUserId,
        mockUserEmail,
        mockActivityId
      );

      expect(result).toBe(mockSessionId);
      expect(fetch).toHaveBeenCalledWith('/api/storage/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: mockUserId,
          user_email: mockUserEmail,
          activity_type: 'pbl_practice',
          activity_id: mockActivityId,
        }),
      });
    });

    it('應該處理創建 session 失敗的情況', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        service.createSession(mockUserId, mockUserEmail, mockActivityId)
      ).rejects.toThrow('Failed to create session');
    });
  });

  describe('appendLog', () => {
    it('應該成功添加活動日誌', async () => {
      const mockLog: ProcessLog = {
        id: 'log-123',
        timestamp: new Date(),
        sessionId: mockSessionId,
        stageId: 'stage-1',
        actionType: 'write',
        detail: {
          userInput: 'Test input',
          timeSpent: 30,
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await service.appendLog(mockSessionId, mockLog);

      expect(fetch).toHaveBeenCalledWith(
        `/api/storage/session/${mockSessionId}/logs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logs: [mockLog] }),
        }
      );
    });

    it('應該處理日誌添加失敗', async () => {
      const mockLog: ProcessLog = {
        id: 'log-123',
        timestamp: new Date(),
        sessionId: mockSessionId,
        stageId: 'stage-1',
        actionType: 'write',
        detail: {
          userInput: 'Test input',
          timeSpent: 30,
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(
        service.appendLog(mockSessionId, mockLog)
      ).rejects.toThrow('Failed to append logs');
    });
  });

  describe('getSession', () => {
    it('應該成功獲取 session 資料', async () => {
      const mockSessionData: SessionData = {
        id: mockSessionId,
        userId: mockUserId,
        userEmail: mockUserEmail,
        scenarioId: mockActivityId,
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

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockSessionData,
        }),
      });

      const result = await service.getSession(mockSessionId);

      expect(result).toEqual(mockSessionData);
      expect(fetch).toHaveBeenCalledWith(
        `/api/storage/session/${mockSessionId}`
      );
    });

    it('應該處理 session 不存在的情況', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' },
        }),
      });

      const result = await service.getSession(mockSessionId);

      expect(result).toBeNull();
    });
  });

  describe('updateProgress', () => {
    it('應該成功更新進度', async () => {
      const mockProgress = {
        current_stage: 2,
        current_task: 1,
        completed_stages: [0, 1],
        stage_results: {},
        total_time_spent: 600,
        progress_percentage: 50,
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await service.updateProgress(mockSessionId, mockProgress);

      expect(fetch).toHaveBeenCalledWith(
        `/api/storage/session/${mockSessionId}/progress`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockProgress),
        }
      );
    });
  });

  describe('completeSession', () => {
    it('應該成功完成 session', async () => {
      const mockEvaluation = {
        overallScore: 85,
        ksaScores: { 'K1.1': 90, 'S1.2': 80 },
        rubricScores: { 'clarity': 4, 'creativity': 3 },
        feedback: 'Great job!',
        suggestions: ['Practice more'],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await service.completeSession(mockSessionId, mockEvaluation);

      expect(fetch).toHaveBeenCalledWith(
        `/api/storage/session/${mockSessionId}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ evaluation: mockEvaluation }),
        }
      );
    });
  });

  describe('getUserSessions', () => {
    it('應該成功獲取用戶的所有 sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          scenarioId: 'scenario-1',
          status: 'completed',
          progress: { percentage: 100 },
        },
        {
          id: 'session-2',
          scenarioId: 'scenario-2',
          status: 'in_progress',
          progress: { percentage: 50 },
        },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockSessions,
        }),
      });

      const result = await service.getUserSessions(mockUserId, mockActivityId);

      expect(result).toEqual(mockSessions);
      expect(fetch).toHaveBeenCalledWith(
        `/api/storage/user/${mockUserId}/sessions?activity_id=${mockActivityId}`
      );
    });

    it('應該處理沒有 sessions 的情況', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      const result = await service.getUserSessions(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('錯誤處理', () => {
    it('應該處理網路錯誤', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        service.createSession(mockUserId, mockUserEmail, mockActivityId)
      ).rejects.toThrow('Network error');
    });

    it('應該處理無效的回應格式', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => null, // Invalid response
      });

      await expect(
        service.getSession(mockSessionId)
      ).rejects.toThrow();
    });
  });

  describe('批次操作', () => {
    it('應該批次添加多個日誌', async () => {
      const mockLogs: ProcessLog[] = [
        {
          id: 'log-1',
          timestamp: new Date(),
          sessionId: mockSessionId,
          stageId: 'stage-1',
          actionType: 'write',
          detail: { userInput: 'Input 1', timeSpent: 10 },
        },
        {
          id: 'log-2',
          timestamp: new Date(),
          sessionId: mockSessionId,
          stageId: 'stage-1',
          actionType: 'revise',
          detail: { userInput: 'Input 2', timeSpent: 20 },
        },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // 假設有批次方法
      await service.batchWriteLogs(mockSessionId, mockLogs);

      expect(fetch).toHaveBeenCalledWith(
        `/api/storage/session/${mockSessionId}/logs/batch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logs: mockLogs }),
        }
      );
    });
  });
});