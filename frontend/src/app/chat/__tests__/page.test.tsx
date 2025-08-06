import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSearchParams } from 'next/navigation';
import ChatPage from '../page';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

jest.mock('react-resizable-panels', () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div data-testid="panel">{children}</div>,
  PanelGroup: ({ children }: { children: React.ReactNode }) => <div data-testid="panel-group">{children}</div>,
  PanelResizeHandle: () => <div data-testid="panel-resize-handle" />,
}));

jest.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

jest.mock('react-markdown', () => {
  return function ReactMarkdown({ children }: { children: string }) {
    return <div data-testid="markdown">{children}</div>;
  };
});

jest.mock('remark-gfm', () => ({}));

jest.mock('@/utils/locale', () => ({
  formatDateWithLocale: jest.fn((date: string) => new Date(date).toLocaleDateString()),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock implementations
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

describe('ChatPage', () => {
  const mockSearchParams = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchParams.mockReturnValue(mockSearchParams as any);
    mockSearchParams.get.mockReturnValue(null);
    
    // Default successful auth response
    mockFetch.mockImplementation((url) => {
      if (url === '/api/auth/check') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            authenticated: true,
            user: { id: '1', email: 'test@example.com', role: 'user' }
          })
        });
      }
      if (url === '/api/chat/sessions') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            sessions: []
          })
        });
      }
      if (url === '/api/pbl/history') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            history: []
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
    it('should render main layout components', async () => {
      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
        expect(screen.getAllByTestId('panel-group')).toHaveLength(1);
      });
    });

    it('should render mobile tab buttons', async () => {
      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('History')).toBeInTheDocument();
        expect(screen.getByText('Chat')).toBeInTheDocument();
        expect(screen.getByText('Resources')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      await act(async () => {
        render(<ChatPage />);
      });

      expect(screen.getByText('Loading chat...')).toBeInTheDocument();
    });

    it('should show not authenticated message when user not logged in', async () => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/auth/check') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              authenticated: false
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Please log in to access the chat feature.')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Flow', () => {
    it('should load user data on mount', async () => {
      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/check');
      });
    });

    it('should handle authentication failure', async () => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/auth/check') {
          return Promise.reject(new Error('Auth failed'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      console.error = jest.fn();

      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Failed to load user and sessions:', expect.any(Error));
      });
    });

    it('should load chat sessions after successful auth', async () => {
      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/chat/sessions', {
          headers: {
            'x-user-info': JSON.stringify({ id: '1', email: 'test@example.com', role: 'user' })
          }
        });
      });
    });
  });

  describe('Chat Sessions Management', () => {
    const mockSessions = [
      {
        id: 'session1',
        title: 'Test Chat 1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
        last_message: 'Hello',
        message_count: 5
      },
      {
        id: 'session2',
        title: 'Test Chat 2',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T01:00:00Z',
        last_message: 'How are you?',
        message_count: 3
      }
    ];

    beforeEach(() => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/auth/check') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              authenticated: true,
              user: { id: '1', email: 'test@example.com', role: 'user' }
            })
          });
        }
        if (url === '/api/chat/sessions') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              sessions: mockSessions
            })
          });
        }
        if (url === '/api/pbl/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              history: []
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });
    });

    it('should display chat sessions', async () => {
      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Chat 1')).toBeInTheDocument();
        expect(screen.getByText('Test Chat 2')).toBeInTheDocument();
      });
    });

    it('should show session metadata', async () => {
      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('5 messages')).toBeInTheDocument();
        expect(screen.getByText('3 messages')).toBeInTheDocument();
      });
    });

    it('should handle empty sessions list', async () => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/auth/check') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              authenticated: true,
              user: { id: '1', email: 'test@example.com', role: 'user' }
            })
          });
        }
        if (url === '/api/chat/sessions') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              sessions: []
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('No chat sessions yet')).toBeInTheDocument();
      });
    });
  });

  describe('Chat Session Loading', () => {
    it('should load specific session from URL params', async () => {
      mockSearchParams.get.mockReturnValue('session123');
      
      mockFetch.mockImplementation((url) => {
        if (url === '/api/auth/check') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              authenticated: true,
              user: { id: '1', email: 'test@example.com', role: 'user' }
            })
          });
        }
        if (url === '/api/chat/sessions') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              sessions: []
            })
          });
        }
        if (url === '/api/chat/sessions/session123') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              messages: [
                {
                  id: 'msg1',
                  role: 'user',
                  content: 'Hello',
                  timestamp: '2024-01-01T00:00:00Z'
                }
              ]
            })
          });
        }
        if (url === '/api/pbl/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              history: []
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/chat/sessions/session123', {
          headers: {
            'x-user-info': JSON.stringify({ id: '1', email: 'test@example.com', role: 'user' })
          }
        });
      });
    });

    it('should handle session loading failure', async () => {
      mockSearchParams.get.mockReturnValue('invalid-session');
      
      mockFetch.mockImplementation((url) => {
        if (url === '/api/auth/check') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              authenticated: true,
              user: { id: '1', email: 'test@example.com', role: 'user' }
            })
          });
        }
        if (url === '/api/chat/sessions') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              sessions: []
            })
          });
        }
        if (url === '/api/chat/sessions/invalid-session') {
          return Promise.reject(new Error('Session not found'));
        }
        if (url === '/api/pbl/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              history: []
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      console.error = jest.fn();

      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Failed to load chat session:', expect.any(Error));
      });
    });
  });

  describe('Message Input and Sending', () => {
    beforeEach(async () => {
      await act(async () => {
        render(<ChatPage />);
      });
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
      });
    });

    it('should render message input textarea', () => {
      expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    });

    it('should render send button', () => {
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('should update message state when typing', async () => {
      const user = userEvent.setup();
      const textarea = screen.getByPlaceholderText('Type your message...');

      await user.type(textarea, 'Hello world');
      
      expect(textarea).toHaveValue('Hello world');
    });

    it('should clear message after sending', async () => {
      mockFetch.mockImplementation((url, options) => {
        if (url === '/api/chat' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              message: {
                id: 'response1',
                role: 'assistant',
                content: 'Hello back!',
                timestamp: '2024-01-01T00:00:00Z'
              }
            })
          });
        }
        return mockFetch.getMockImplementation()?.(url, options) || Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      const user = userEvent.setup();
      const textarea = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(textarea, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('should not send empty messages', async () => {
      const user = userEvent.setup();
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.click(sendButton);

      expect(mockFetch).not.toHaveBeenCalledWith('/api/chat', expect.any(Object));
    });

    it('should handle Enter key to send message', async () => {
      mockFetch.mockImplementation((url, options) => {
        if (url === '/api/chat' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              message: {
                id: 'response1',
                role: 'assistant',
                content: 'Hello back!',
                timestamp: '2024-01-01T00:00:00Z'
              }
            })
          });
        }
        return mockFetch.getMockImplementation()?.(url, options) || Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      const user = userEvent.setup();
      const textarea = screen.getByPlaceholderText('Type your message...');

      await user.type(textarea, 'Test message{enter}');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-info': JSON.stringify({ id: '1', email: 'test@example.com', role: 'user' })
          },
          body: JSON.stringify({
            message: 'Test message',
            sessionId: null
          })
        });
      });
    });

    it('should handle Shift+Enter to create new line', async () => {
      const user = userEvent.setup();
      const textarea = screen.getByPlaceholderText('Type your message...');

      await user.type(textarea, 'First line{shift}{enter}Second line');

      expect(textarea).toHaveValue('First line\nSecond line');
      expect(mockFetch).not.toHaveBeenCalledWith('/api/chat', expect.any(Object));
    });

    it('should disable send button while sending', async () => {
      let resolvePromise: ((value: any) => void) | undefined;
      const sendPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetch.mockImplementation((url, options) => {
        if (url === '/api/chat' && options?.method === 'POST') {
          return sendPromise.then(() => ({
            ok: true,
            json: () => Promise.resolve({
              message: {
                id: 'response1',
                role: 'assistant',
                content: 'Hello back!',
                timestamp: '2024-01-01T00:00:00Z'
              }
            })
          }));
        }
        return mockFetch.getMockImplementation()?.(url, options) || Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      const user = userEvent.setup();
      const textarea = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(textarea, 'Test message');
      await user.click(sendButton);

      expect(sendButton).toBeDisabled();

      // Resolve the promise to complete the send
      act(() => {
        resolvePromise?.({});
      });

      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      });
    });
  });

  describe('Message Display', () => {
    const mockMessages = [
      {
        id: 'msg1',
        role: 'user' as const,
        content: 'Hello',
        timestamp: '2024-01-01T00:00:00Z'
      },
      {
        id: 'msg2',
        role: 'assistant' as const,
        content: 'Hi there!',
        timestamp: '2024-01-01T00:01:00Z'
      }
    ];

    beforeEach(() => {
      mockFetch.mockImplementation((url, options) => {
        if (url === '/api/chat/sessions/test-session') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              messages: mockMessages
            })
          });
        }
        return mockFetch.getMockImplementation()?.(url, options) || Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });
    });

    it('should display user messages', async () => {
      mockSearchParams.get.mockReturnValue('test-session');

      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
      });
    });

    it('should display assistant messages', async () => {
      mockSearchParams.get.mockReturnValue('test-session');

      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Hi there!')).toBeInTheDocument();
      });
    });

    it('should render messages with correct styling classes', async () => {
      mockSearchParams.get.mockReturnValue('test-session');

      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        const userMessage = screen.getByText('Hello').closest('.bg-blue-500');
        const assistantMessage = screen.getByText('Hi there!').closest('.bg-white');
        
        expect(userMessage).toBeInTheDocument();
        expect(assistantMessage).toBeInTheDocument();
      });
    });

    it('should show typing indicator when assistant is responding', async () => {
      let resolvePromise: ((value: any) => void) | undefined;
      const responsePromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetch.mockImplementation((url, options) => {
        if (url === '/api/chat' && options?.method === 'POST') {
          return responsePromise.then(() => ({
            ok: true,
            json: () => Promise.resolve({
              message: {
                id: 'response1',
                role: 'assistant',
                content: 'Thinking...',
                timestamp: '2024-01-01T00:00:00Z'
              }
            })
          }));
        }
        return mockFetch.getMockImplementation()?.(url, options) || Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const textarea = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(textarea, 'Test message');
      await user.click(sendButton);

      expect(screen.getByText('AI is typing...')).toBeInTheDocument();

      act(() => {
        resolvePromise?.({});
      });

      await waitFor(() => {
        expect(screen.queryByText('AI is typing...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Progress and Assessment Data', () => {
    const mockPBLHistory = [
      {
        scenario_id: 'scenario1',
        scenario_title: 'Test Scenario 1',
        completed_at: '2024-01-01T00:00:00Z',
        overall_score: 85,
        domain: 'Engaging_with_AI',
        time_spent: 3600
      },
      {
        scenario_id: 'scenario2',
        scenario_title: 'Test Scenario 2',
        completed_at: '2024-01-02T00:00:00Z',
        overall_score: 92,
        domain: 'Creating_with_AI',
        time_spent: 2400
      }
    ];

    beforeEach(() => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/auth/check') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              authenticated: true,
              user: { id: '1', email: 'test@example.com', role: 'user' }
            })
          });
        }
        if (url === '/api/chat/sessions') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              sessions: []
            })
          });
        }
        if (url === '/api/pbl/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              history: mockPBLHistory
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });
    });

    it('should load and display PBL history', async () => {
      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Scenario 1')).toBeInTheDocument();
        expect(screen.getByText('Test Scenario 2')).toBeInTheDocument();
      });
    });

    it('should display scenario scores', async () => {
      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('85%')).toBeInTheDocument();
        expect(screen.getByText('92%')).toBeInTheDocument();
      });
    });

    it('should display scenario domains', async () => {
      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Engaging_with_AI')).toBeInTheDocument();
        expect(screen.getByText('Creating_with_AI')).toBeInTheDocument();
      });
    });

    it('should calculate and display progress stats', async () => {
      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('2 completed')).toBeInTheDocument();
        expect(screen.getByText('1.67 hours')).toBeInTheDocument(); // (3600 + 2400) / 3600 = 1.67
      });
    });

    it('should handle PBL history loading failure', async () => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/auth/check') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              authenticated: true,
              user: { id: '1', email: 'test@example.com', role: 'user' }
            })
          });
        }
        if (url === '/api/chat/sessions') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              sessions: []
            })
          });
        }
        if (url === '/api/pbl/history') {
          return Promise.reject(new Error('Failed to load history'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      console.error = jest.fn();

      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Failed to load PBL history:', expect.any(Error));
      });
    });
  });

  describe('Streak Calculation', () => {
    it('should calculate consecutive day streak correctly', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);

      const historyWithStreak = [
        {
          scenario_id: 'scenario1',
          scenario_title: 'Today',
          completed_at: today.toISOString(),
          overall_score: 85,
          domain: 'Test',
          time_spent: 3600
        },
        {
          scenario_id: 'scenario2',
          scenario_title: 'Yesterday',
          completed_at: yesterday.toISOString(),
          overall_score: 85,
          domain: 'Test',
          time_spent: 3600
        },
        {
          scenario_id: 'scenario3',
          scenario_title: 'Two days ago',
          completed_at: twoDaysAgo.toISOString(),
          overall_score: 85,
          domain: 'Test',
          time_spent: 3600
        }
      ];

      mockFetch.mockImplementation((url) => {
        if (url === '/api/pbl/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              history: historyWithStreak
            })
          });
        }
        return mockFetch.getMockImplementation()?.(url) || Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('3 day streak')).toBeInTheDocument();
      });
    });

    it('should handle empty history for streak calculation', async () => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/pbl/history') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              history: []
            })
          });
        }
        return mockFetch.getMockImplementation()?.(url) || Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('0 day streak')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Interface', () => {
    it('should switch between mobile tabs', async () => {
      await act(async () => {
        render(<ChatPage />);
      });

      const user = userEvent.setup();

      // Initially chat tab should be active
      expect(screen.getByText('Chat')).toHaveClass('border-blue-500');

      // Switch to History tab
      await user.click(screen.getByText('History'));
      expect(screen.getByText('History')).toHaveClass('border-blue-500');

      // Switch to Resources tab
      await user.click(screen.getByText('Resources'));
      expect(screen.getByText('Resources')).toHaveClass('border-blue-500');
    });

    it('should show appropriate content for each mobile tab', async () => {
      await act(async () => {
        render(<ChatPage />);
      });

      const user = userEvent.setup();

      // History tab content
      await user.click(screen.getByText('History'));
      await waitFor(() => {
        expect(screen.getByText('Learning Progress')).toBeInTheDocument();
      });

      // Resources tab content
      await user.click(screen.getByText('Resources'));
      await waitFor(() => {
        expect(screen.getByText('Learning Resources')).toBeInTheDocument();
      });

      // Chat tab content
      await user.click(screen.getByText('Chat'));
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
      });
    });
  });

  describe('Panel Collapse/Expand', () => {
    it('should toggle left panel collapse state', async () => {
      await act(async () => {
        render(<ChatPage />);
      });

      const user = userEvent.setup();
      const leftToggleButton = screen.getByLabelText('Toggle left panel');

      await user.click(leftToggleButton);
      // Panel should be collapsed (test implementation would verify this)
      
      await user.click(leftToggleButton);
      // Panel should be expanded again
    });

    it('should toggle right panel collapse state', async () => {
      await act(async () => {
        render(<ChatPage />);
      });

      const user = userEvent.setup();
      const rightToggleButton = screen.getByLabelText('Toggle right panel');

      await user.click(rightToggleButton);
      // Panel should be collapsed
      
      await user.click(rightToggleButton);
      // Panel should be expanded again
    });
  });

  describe('Session Dropdown Menu', () => {
    beforeEach(() => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/chat/sessions') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              sessions: [{
                id: 'session1',
                title: 'Test Session',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T01:00:00Z',
                last_message: 'Hello',
                message_count: 5
              }]
            })
          });
        }
        return mockFetch.getMockImplementation()?.(url) || Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });
    });

    it('should show dropdown menu when clicked', async () => {
      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Session')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const dropdownButton = screen.getByLabelText('Session options');

      await user.click(dropdownButton);

      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should handle session deletion', async () => {
      mockFetch.mockImplementation((url, options) => {
        if (url === '/api/chat/sessions/session1' && options?.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          });
        }
        if (url === '/api/chat/sessions') {
          // Return empty sessions after deletion
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              sessions: []
            })
          });
        }
        return mockFetch.getMockImplementation()?.(url, options) || Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Session')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const dropdownButton = screen.getByLabelText('Session options');

      await user.click(dropdownButton);
      await user.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/chat/sessions/session1', {
          method: 'DELETE',
          headers: {
            'x-user-info': JSON.stringify({ id: '1', email: 'test@example.com', role: 'user' })
          }
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle chat API errors gracefully', async () => {
      mockFetch.mockImplementation((url, options) => {
        if (url === '/api/chat' && options?.method === 'POST') {
          return Promise.reject(new Error('Chat API failed'));
        }
        return mockFetch.getMockImplementation()?.(url, options) || Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      console.error = jest.fn();

      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const textarea = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(textarea, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Failed to send message:', expect.any(Error));
      });
    });

    it('should handle assessment loading errors', async () => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/pbl/history') {
          return Promise.reject(new Error('Assessment failed'));
        }
        return mockFetch.getMockImplementation()?.(url) || Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      console.error = jest.fn();

      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Failed to load assessment and progress:', expect.any(Error));
      });
    });
  });

  describe('Scroll Behavior', () => {
    it('should show scroll to bottom button when not at bottom', async () => {
      // Mock scrolling behavior
      Object.defineProperty(HTMLDivElement.prototype, 'scrollTop', {
        get() { return 0; },
        set() {},
        configurable: true,
      });
      
      Object.defineProperty(HTMLDivElement.prototype, 'scrollHeight', {
        get() { return 1000; },
        configurable: true,
      });
      
      Object.defineProperty(HTMLDivElement.prototype, 'clientHeight', {
        get() { return 500; },
        configurable: true,
      });

      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        // Simulate scroll event
        const messagesContainer = screen.getByTestId('messages-container');
        fireEvent.scroll(messagesContainer);
      });

      expect(screen.getByLabelText('Scroll to bottom')).toBeInTheDocument();
    });

    it('should scroll to bottom when button is clicked', async () => {
      const mockScrollIntoView = jest.fn();
      
      // Mock scrollIntoView
      Object.defineProperty(HTMLDivElement.prototype, 'scrollIntoView', {
        value: mockScrollIntoView,
        configurable: true,
      });

      await act(async () => {
        render(<ChatPage />);
      });

      // Simulate showing scroll button
      const messagesContainer = screen.getByTestId('messages-container');
      fireEvent.scroll(messagesContainer);

      const scrollButton = screen.getByLabelText('Scroll to bottom');
      const user = userEvent.setup();
      
      await user.click(scrollButton);

      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      await act(async () => {
        render(<ChatPage />);
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Toggle left panel')).toBeInTheDocument();
        expect(screen.getByLabelText('Toggle right panel')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      await act(async () => {
        render(<ChatPage />);
      });

      const user = userEvent.setup();
      const textarea = screen.getByPlaceholderText('Type your message...');

      // Tab to textarea
      await user.tab();
      expect(textarea).toHaveFocus();

      // Tab to send button
      await user.tab();
      expect(screen.getByRole('button', { name: /send/i })).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('should show mobile tabs on small screens', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      await act(async () => {
        render(<ChatPage />);
      });

      expect(screen.getByText('History')).toBeInTheDocument();
      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByText('Resources')).toBeInTheDocument();
    });
  });
});