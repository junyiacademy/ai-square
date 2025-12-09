/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTaskChat } from '../useTaskChat';

interface TaskTemplate {
  id: string;
  title: Record<string, string>;
  type: string;
  description?: Record<string, string>;
  content?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ScenarioData {
  id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  mode: 'pbl' | 'discovery' | 'assessment';
  difficulty: string;
  estimatedMinutes: number;
  taskTemplates: TaskTemplate[];
  [key: string]: unknown;
}

describe('useTaskChat', () => {
  const mockUpdateDraft = jest.fn();
  const mockDraft: ScenarioData = {
    id: 'test-scenario',
    title: { en: 'Test Scenario', zh: '測試場景' },
    description: { en: 'Test Description', zh: '測試描述' },
    mode: 'pbl',
    difficulty: 'medium',
    estimatedMinutes: 30,
    taskTemplates: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with welcome message', () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      expect(result.current.chatMessages).toHaveLength(1);
      expect(result.current.chatMessages[0].role).toBe('assistant');
      expect(result.current.chatMessages[0].content).toContain('嗨！');
      expect(result.current.inputMessage).toBe('');
      expect(result.current.isProcessing).toBe(false);
    });

    it('should have empty input message initially', () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      expect(result.current.inputMessage).toBe('');
    });

    it('should not be processing initially', () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('setInputMessage', () => {
    it('should update input message', () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      act(() => {
        result.current.setInputMessage('測試訊息');
      });

      expect(result.current.inputMessage).toBe('測試訊息');
    });
  });

  describe('handleSendMessage', () => {
    it('should not send empty message', async () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      const initialMessageCount = result.current.chatMessages.length;

      await act(async () => {
        result.current.setInputMessage('   ');
        result.current.handleSendMessage();
      });

      expect(result.current.chatMessages).toHaveLength(initialMessageCount);
    });

    it('should not send message when processing', async () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      act(() => {
        result.current.setInputMessage('測試訊息');
      });

      // Start first message
      act(() => {
        result.current.handleSendMessage();
      });

      const messageCountDuringProcessing = result.current.chatMessages.length;

      // Try to send second message while processing
      act(() => {
        result.current.setInputMessage('第二個訊息');
        result.current.handleSendMessage();
      });

      // Should not add more messages
      expect(result.current.chatMessages.length).toBeLessThanOrEqual(
        messageCountDuringProcessing + 1
      );
    });

    it('should add user message immediately', async () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      const initialCount = result.current.chatMessages.length;

      act(() => {
        result.current.setInputMessage('測試訊息');
      });

      act(() => {
        result.current.handleSendMessage();
      });

      await waitFor(() => {
        expect(result.current.chatMessages.length).toBeGreaterThan(initialCount);
      });

      expect(result.current.chatMessages[initialCount].role).toBe('user');
      expect(result.current.chatMessages[initialCount].content).toBe('測試訊息');
    });

    it('should clear input after sending', async () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      act(() => {
        result.current.setInputMessage('測試訊息');
      });

      act(() => {
        result.current.handleSendMessage();
      });

      expect(result.current.inputMessage).toBe('');
    });

    it('should set processing state to true', async () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      act(() => {
        result.current.setInputMessage('測試訊息');
      });

      act(() => {
        result.current.handleSendMessage();
      });

      await waitFor(() => {
        expect(result.current.isProcessing).toBe(true);
      });
    });

    it('should add assistant response after processing', async () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      act(() => {
        result.current.setInputMessage('測試訊息');
        result.current.handleSendMessage();
      });

      // Fast-forward timers
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false);
      });

      const messages = result.current.chatMessages;
      expect(messages[messages.length - 1].role).toBe('assistant');
    });
  });

  describe('command processing - title', () => {
    it('should update title when command contains "標題"', async () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      act(() => {
        result.current.setInputMessage('把標題改成「AI基礎課程」');
      });

      act(() => {
        result.current.handleSendMessage();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockUpdateDraft).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.objectContaining({
              zh: 'AI基礎課程',
            }),
          })
        );
      });
    });

    it('should show error if title not quoted', async () => {
      const { result} = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      act(() => {
        result.current.setInputMessage('把標題改成AI基礎課程');
      });

      act(() => {
        result.current.handleSendMessage();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        const lastMessage =
          result.current.chatMessages[result.current.chatMessages.length - 1];
        expect(lastMessage.content).toContain('請用引號');
      });
    });
  });

  describe('command processing - difficulty', () => {
    it('should update difficulty to easy', async () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      act(() => {
        result.current.setInputMessage('設定難度為簡單');
      });

      act(() => {
        result.current.handleSendMessage();
      });

      // Wait for the async processAgentCommand to complete
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockUpdateDraft).toHaveBeenCalled();
      expect(mockUpdateDraft).toHaveBeenCalledWith({ difficulty: 'easy' });
    });

    it('should update difficulty to medium', async () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      act(() => {
        result.current.setInputMessage('難度設定為中等');
      });

      act(() => {
        result.current.handleSendMessage();
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockUpdateDraft).toHaveBeenCalledWith({ difficulty: 'medium' });
    });

    it('should update difficulty to hard', async () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      act(() => {
        result.current.setInputMessage('設定難度為困難');
      });

      act(() => {
        result.current.handleSendMessage();
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockUpdateDraft).toHaveBeenCalledWith({ difficulty: 'hard' });
    });
  });

  describe('command processing - duration', () => {
    it('should update estimated minutes', async () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      act(() => {
        result.current.setInputMessage('設定時長為45分鐘');
      });

      act(() => {
        result.current.handleSendMessage();
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockUpdateDraft).toHaveBeenCalledWith({ estimatedMinutes: 45 });
    });

    it('should extract number from duration command', async () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      act(() => {
        result.current.setInputMessage('修改時長為60分鐘');
      });

      act(() => {
        result.current.handleSendMessage();
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockUpdateDraft).toHaveBeenCalledWith({ estimatedMinutes: 60 });
    });
  });

  describe('command processing - add task', () => {
    it('should add new task', async () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      act(() => {
        result.current.setInputMessage('新增任務');
      });

      act(() => {
        result.current.handleSendMessage();
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockUpdateDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          taskTemplates: expect.arrayContaining([
            expect.objectContaining({
              title: { en: 'New Task', zh: '新任務' },
              type: 'conversation',
            }),
          ]),
        })
      );
    });
  });

  describe('command processing - description', () => {
    it('should update description', async () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      act(() => {
        result.current.setInputMessage('修改描述為「這是新的描述」');
      });

      act(() => {
        result.current.handleSendMessage();
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockUpdateDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.objectContaining({
            zh: '這是新的描述',
          }),
        })
      );
    });
  });

  describe('command processing - unknown command', () => {
    it('should show help message for unknown command', async () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      act(() => {
        result.current.setInputMessage('做一些未知的事情');
      });

      act(() => {
        result.current.handleSendMessage();
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      const lastMessage =
        result.current.chatMessages[result.current.chatMessages.length - 1];
      expect(lastMessage.content).toContain('不太理解');
    });
  });

  describe('chatEndRef', () => {
    it('should provide chatEndRef', () => {
      const { result } = renderHook(() =>
        useTaskChat(mockDraft, 'zh', mockUpdateDraft)
      );

      expect(result.current.chatEndRef).toBeDefined();
      expect(result.current.chatEndRef.current).toBeNull();
    });
  });
});
