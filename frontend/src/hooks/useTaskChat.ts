/**
 * useTaskChat Hook
 *
 * Manages AI tutor chat functionality for the agent editor.
 * Handles:
 * - Chat message state management
 * - Command processing (title, difficulty, duration, tasks, description)
 * - Streaming response simulation
 * - Draft updates via natural language commands
 */

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

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

interface UseTaskChatReturn {
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  inputMessage: string;
  setInputMessage: React.Dispatch<React.SetStateAction<string>>;
  isProcessing: boolean;
  handleSendMessage: () => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: '1',
  role: 'assistant',
  content: '👋 嗨！我是你的編輯助手。告訴我你想修改什麼，我會幫你更新場景內容。例如：\n\n• "把標題改成AI基礎課程"\n• "增加一個新任務"\n• "設定難度為簡單"\n• "修改時長為45分鐘"',
  timestamp: new Date()
};

export function useTaskChat(
  draft: ScenarioData | null,
  language: string,
  updateDraft: (updates: Partial<ScenarioData>) => void
): UseTaskChatReturn {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    INITIAL_WELCOME_MESSAGE
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  /**
   * Process agent command and update draft
   */
  const processAgentCommand = async (command: string) => {
    setIsProcessing(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: command,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Parse and execute command
    const lowerCommand = command.toLowerCase();
    let responseText = '';

    if (lowerCommand.includes('標題') || lowerCommand.includes('title')) {
      const match = command.match(/[「"']([^「"']+)[」"']/);
      if (match) {
        const newTitle = match[1];
        updateDraft({ title: { ...draft?.title, [language]: newTitle } as Record<string, string> });
        responseText = `✅ 已將標題更新為「${newTitle}」`;
      } else {
        responseText = '請用引號包含新標題，例如："把標題改成「AI基礎課程」"';
      }
    } else if (lowerCommand.includes('難度') || lowerCommand.includes('difficulty')) {
      if (lowerCommand.includes('簡單') || lowerCommand.includes('easy')) {
        updateDraft({ difficulty: 'easy' });
        responseText = '✅ 已將難度設定為「簡單」';
      } else if (lowerCommand.includes('中等') || lowerCommand.includes('medium')) {
        updateDraft({ difficulty: 'medium' });
        responseText = '✅ 已將難度設定為「中等」';
      } else if (lowerCommand.includes('困難') || lowerCommand.includes('hard')) {
        updateDraft({ difficulty: 'hard' });
        responseText = '✅ 已將難度設定為「困難」';
      }
    } else if (lowerCommand.includes('時長') || lowerCommand.includes('duration') || lowerCommand.includes('分鐘')) {
      const match = command.match(/\d+/);
      if (match) {
        const minutes = parseInt(match[0]);
        updateDraft({ estimatedMinutes: minutes });
        responseText = `✅ 已將時長設定為 ${minutes} 分鐘`;
      }
    } else if (lowerCommand.includes('新增任務') || lowerCommand.includes('add task')) {
      const newTask: TaskTemplate = {
        id: `task-${Date.now()}`,
        title: { en: 'New Task', zh: '新任務' },
        type: 'conversation',
        description: { en: 'Task description', zh: '任務描述' },
        content: {}
      };
      updateDraft({
        taskTemplates: [...(draft?.taskTemplates || []), newTask]
      });
      responseText = '✅ 已新增一個任務';
    } else if (lowerCommand.includes('描述') || lowerCommand.includes('description')) {
      const match = command.match(/[「"']([^「"']+)[」"']/);
      if (match) {
        const newDesc = match[1];
        updateDraft({ description: { ...draft?.description, [language]: newDesc } as Record<string, string> });
        responseText = `✅ 已更新描述為「${newDesc}」`;
      }
    } else {
      responseText = '我不太理解你的指令。你可以試試：\n• "把標題改成「...」"\n• "設定難度為簡單"\n• "修改時長為45分鐘"\n• "新增一個任務"';
    }

    // Add assistant response
    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: responseText,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, assistantMessage]);

    setIsProcessing(false);
  };

  /**
   * Handle send message action
   */
  const handleSendMessage = () => {
    const trimmedMessage = inputMessage.trim();
    if (trimmedMessage && !isProcessing) {
      setInputMessage('');
      processAgentCommand(trimmedMessage);
    }
  };

  return {
    chatMessages,
    setChatMessages,
    inputMessage,
    setInputMessage,
    isProcessing,
    handleSendMessage,
    chatEndRef,
  };
}
