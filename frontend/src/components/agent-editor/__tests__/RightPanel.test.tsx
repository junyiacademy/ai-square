import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RightPanel } from '../RightPanel';

const mockChatMessages = [
  {
    id: '1',
    role: 'assistant' as const,
    content: '👋 嗨！我是你的編輯助手。',
    timestamp: new Date('2024-01-01T10:00:00')
  },
  {
    id: '2',
    role: 'user' as const,
    content: '把標題改成AI基礎課程',
    timestamp: new Date('2024-01-01T10:01:00')
  },
  {
    id: '3',
    role: 'assistant' as const,
    content: '✅ 已將標題更新為「AI基礎課程」',
    timestamp: new Date('2024-01-01T10:01:30')
  }
];

describe('RightPanel Component', () => {
  const mockProps = {
    rightPanelCollapsed: false,
    setRightPanelCollapsed: jest.fn(),
    language: 'zh',
    setLanguage: jest.fn(),
    hasChanges: false,
    discardChanges: jest.fn(),
    publish: jest.fn().mockResolvedValue(undefined),
    isPublishing: false,
    chatMessages: mockChatMessages,
    inputMessage: '',
    setInputMessage: jest.fn(),
    handleSendMessage: jest.fn(),
    isProcessing: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.alert = jest.fn();
  });

  describe('Rendering', () => {
    it('should render with expanded state', () => {
      const { container } = render(<RightPanel {...mockProps} />);
      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveClass('w-96');
    });

    it('should render with collapsed state', () => {
      const { container } = render(<RightPanel {...mockProps} rightPanelCollapsed={true} />);
      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveClass('w-16');
    });

    it('should show AI header', () => {
      render(<RightPanel {...mockProps} />);
      expect(screen.getByText('AI 編輯助手')).toBeInTheDocument();
    });

    it('should not show AI header text when collapsed', () => {
      render(<RightPanel {...mockProps} rightPanelCollapsed={true} />);
      expect(screen.queryByText('AI 編輯助手')).not.toBeInTheDocument();
    });
  });

  describe('Panel Collapse/Expand', () => {
    it('should toggle collapse state when button clicked', () => {
      const { container } = render(<RightPanel {...mockProps} />);
      // Find collapse button in AI header by looking for the button with ChevronRight icon
      const collapseButton = container.querySelector('.bg-gradient-to-r button');
      fireEvent.click(collapseButton!);

      expect(mockProps.setRightPanelCollapsed).toHaveBeenCalledWith(true);
    });

    it('should show ChevronRight icon when expanded', () => {
      const { container } = render(<RightPanel {...mockProps} />);
      // Check for chevron icon in button
      const button = container.querySelector('button svg');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should show language toggle button', () => {
      render(<RightPanel {...mockProps} />);
      expect(screen.getByText('EN')).toBeInTheDocument();
    });

    it('should toggle language when language button clicked', () => {
      render(<RightPanel {...mockProps} />);
      const langButton = screen.getByText('EN').closest('button');
      fireEvent.click(langButton!);

      expect(mockProps.setLanguage).toHaveBeenCalledWith('en');
    });

    it('should show correct language based on current language', () => {
      render(<RightPanel {...mockProps} language="en" />);
      expect(screen.getByText('中文')).toBeInTheDocument();
    });

    it('should show discard button when hasChanges is true', () => {
      render(<RightPanel {...mockProps} hasChanges={true} />);
      expect(screen.getByText('放棄')).toBeInTheDocument();
    });

    it('should not show discard button when hasChanges is false', () => {
      render(<RightPanel {...mockProps} hasChanges={false} />);
      expect(screen.queryByText('放棄')).not.toBeInTheDocument();
    });

    it('should call discardChanges when discard button clicked', () => {
      render(<RightPanel {...mockProps} hasChanges={true} />);
      const discardButton = screen.getByText('放棄').closest('button');
      fireEvent.click(discardButton!);

      expect(mockProps.discardChanges).toHaveBeenCalled();
    });

    it('should show publish button', () => {
      render(<RightPanel {...mockProps} />);
      expect(screen.getByText('發布')).toBeInTheDocument();
    });

    it('should disable publish button when no changes', () => {
      render(<RightPanel {...mockProps} hasChanges={false} />);
      const publishButton = screen.getByText('發布').closest('button');
      expect(publishButton).toBeDisabled();
    });

    it('should enable publish button when has changes', () => {
      render(<RightPanel {...mockProps} hasChanges={true} />);
      const publishButton = screen.getByText('發布').closest('button');
      expect(publishButton).not.toBeDisabled();
    });

    it('should call publish and show success alert on successful publish', async () => {
      render(<RightPanel {...mockProps} hasChanges={true} />);
      const publishButton = screen.getByText('發布').closest('button');
      fireEvent.click(publishButton!);

      await waitFor(() => {
        expect(mockProps.publish).toHaveBeenCalled();
        expect(global.alert).toHaveBeenCalledWith('發布成功！');
      });
    });

    it('should show "發布中..." when publishing', () => {
      render(<RightPanel {...mockProps} hasChanges={true} isPublishing={true} />);
      expect(screen.getByText('發布中...')).toBeInTheDocument();
    });

    it('should disable publish button when publishing', () => {
      render(<RightPanel {...mockProps} hasChanges={true} isPublishing={true} />);
      const publishButton = screen.getByText('發布中...').closest('button');
      expect(publishButton).toBeDisabled();
    });

    it('should not show action buttons when collapsed', () => {
      render(<RightPanel {...mockProps} rightPanelCollapsed={true} hasChanges={true} />);
      expect(screen.queryByText('發布')).not.toBeInTheDocument();
      expect(screen.queryByText('放棄')).not.toBeInTheDocument();
    });
  });

  describe('Chat Messages Display', () => {
    it('should render all chat messages', () => {
      render(<RightPanel {...mockProps} />);
      expect(screen.getByText('👋 嗨！我是你的編輯助手。')).toBeInTheDocument();
      expect(screen.getByText('把標題改成AI基礎課程')).toBeInTheDocument();
      expect(screen.getByText('✅ 已將標題更新為「AI基礎課程」')).toBeInTheDocument();
    });

    it('should show user messages with correct styling', () => {
      render(<RightPanel {...mockProps} />);
      const userMessage = screen.getByText('把標題改成AI基礎課程').closest('div');
      expect(userMessage).toHaveClass('bg-blue-600', 'text-white');
    });

    it('should show assistant messages with correct styling', () => {
      render(<RightPanel {...mockProps} />);
      const assistantMessage = screen.getByText('👋 嗨！我是你的編輯助手。').closest('div');
      expect(assistantMessage).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    it('should hide chat messages when collapsed', () => {
      const { container } = render(<RightPanel {...mockProps} rightPanelCollapsed={true} />);
      // Chat messages container should have 'hidden' class when collapsed
      const chatContainer = container.querySelector('.overflow-y-auto.hidden');
      expect(chatContainer).toBeInTheDocument();
    });

    it('should handle empty chat messages', () => {
      const { container } = render(<RightPanel {...mockProps} chatMessages={[]} />);
      const messageContainer = container.querySelector('.overflow-y-auto');
      expect(messageContainer).toBeInTheDocument();
    });
  });

  describe('Chat Input', () => {
    it('should render chat input field', () => {
      render(<RightPanel {...mockProps} />);
      expect(screen.getByPlaceholderText('輸入指令...')).toBeInTheDocument();
    });

    it('should update input message when typing', () => {
      render(<RightPanel {...mockProps} />);
      const input = screen.getByPlaceholderText('輸入指令...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'New message' } });

      expect(mockProps.setInputMessage).toHaveBeenCalledWith('New message');
    });

    it('should call handleSendMessage when send button clicked', () => {
      const { container } = render(<RightPanel {...mockProps} inputMessage="Test message" />);
      // Find send button next to input field
      const sendButton = container.querySelector('input[placeholder="輸入指令..."]')?.nextElementSibling as HTMLButtonElement;
      fireEvent.click(sendButton);

      expect(mockProps.handleSendMessage).toHaveBeenCalled();
    });

    it('should call handleSendMessage when Enter key pressed', () => {
      render(<RightPanel {...mockProps} inputMessage="Test message" />);
      const input = screen.getByPlaceholderText('輸入指令...');
      fireEvent.keyPress(input, { key: 'Enter', charCode: 13 });

      expect(mockProps.handleSendMessage).toHaveBeenCalled();
    });

    it('should disable input when processing', () => {
      render(<RightPanel {...mockProps} isProcessing={true} />);
      const input = screen.getByPlaceholderText('輸入指令...') as HTMLInputElement;
      expect(input).toBeDisabled();
    });

    it('should disable send button when processing', () => {
      const { container } = render(<RightPanel {...mockProps} isProcessing={true} inputMessage="Test" />);
      const sendButton = container.querySelector('input[placeholder="輸入指令..."]')?.nextElementSibling as HTMLButtonElement;
      expect(sendButton).toBeDisabled();
    });

    it('should disable send button when input is empty', () => {
      const { container } = render(<RightPanel {...mockProps} inputMessage="" />);
      const sendButton = container.querySelector('input[placeholder="輸入指令..."]')?.nextElementSibling as HTMLButtonElement;
      expect(sendButton).toBeDisabled();
    });

    it('should enable send button when has input and not processing', () => {
      const { container } = render(<RightPanel {...mockProps} inputMessage="Test message" isProcessing={false} />);
      const sendButton = container.querySelector('input[placeholder="輸入指令..."]')?.nextElementSibling as HTMLButtonElement;
      expect(sendButton).not.toBeDisabled();
    });

    it('should show spinner when processing', () => {
      const { container } = render(<RightPanel {...mockProps} isProcessing={true} inputMessage="Test" />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should not show chat input when collapsed', () => {
      render(<RightPanel {...mockProps} rightPanelCollapsed={true} />);
      expect(screen.queryByPlaceholderText('輸入指令...')).not.toBeInTheDocument();
    });
  });

  describe('Suggestion Buttons', () => {
    it('should render suggestion buttons', () => {
      render(<RightPanel {...mockProps} />);
      expect(screen.getByText('修改標題')).toBeInTheDocument();
      expect(screen.getByText('新增任務')).toBeInTheDocument();
      expect(screen.getByText('設定難度')).toBeInTheDocument();
    });

    it('should set input message when suggestion clicked', () => {
      render(<RightPanel {...mockProps} />);
      const suggestionButton = screen.getByText('修改標題').closest('button');
      fireEvent.click(suggestionButton!);

      expect(mockProps.setInputMessage).toHaveBeenCalledWith('修改標題');
    });

    it('should not show suggestions when collapsed', () => {
      render(<RightPanel {...mockProps} rightPanelCollapsed={true} />);
      expect(screen.queryByText('修改標題')).not.toBeInTheDocument();
    });
  });

  describe('Auto-scroll Behavior', () => {
    it('should scroll to bottom when messages change', () => {
      const scrollIntoView = jest.fn();
      Element.prototype.scrollIntoView = scrollIntoView;

      const { rerender } = render(<RightPanel {...mockProps} />);

      const newMessages = [
        ...mockChatMessages,
        {
          id: '4',
          role: 'user' as const,
          content: 'New message',
          timestamp: new Date()
        }
      ];

      rerender(<RightPanel {...mockProps} chatMessages={newMessages} />);

      expect(scrollIntoView).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle publish error gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const failingPublish = jest.fn().mockRejectedValue(new Error('Publish failed'));

      render(<RightPanel {...mockProps} hasChanges={true} publish={failingPublish} />);
      const publishButton = screen.getByText('發布').closest('button');
      fireEvent.click(publishButton!);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Publish failed:', expect.any(Error));
      });

      consoleError.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace-only input message', () => {
      const { container } = render(<RightPanel {...mockProps} inputMessage="   " />);
      const sendButton = container.querySelector('input[placeholder="輸入指令..."]')?.nextElementSibling as HTMLButtonElement;
      expect(sendButton).toBeDisabled();
    });

    it('should preserve message content formatting', () => {
      const messagesWithNewlines = [
        {
          id: '1',
          role: 'assistant' as const,
          content: 'Line 1\nLine 2\nLine 3',
          timestamp: new Date()
        }
      ];

      render(<RightPanel {...mockProps} chatMessages={messagesWithNewlines} />);
      const message = screen.getByText(/Line 1/);
      expect(message).toHaveClass('whitespace-pre-line');
    });

    it('should handle rapid language toggling', () => {
      render(<RightPanel {...mockProps} language="zh" />);
      const langButton = screen.getByText('EN').closest('button');

      fireEvent.click(langButton!);
      fireEvent.click(langButton!);
      fireEvent.click(langButton!);

      expect(mockProps.setLanguage).toHaveBeenCalledTimes(3);
    });
  });
});
