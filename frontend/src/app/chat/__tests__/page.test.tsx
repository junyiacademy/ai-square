import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatPage from '../page';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en',
    },
  }),
}));

// Mock the Header component
jest.mock('@/components/layout/Header', () => ({
  Header: () => <div>Header</div>,
}));

// Mock react-resizable-panels
jest.mock('react-resizable-panels', () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PanelResizeHandle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock react-markdown
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

// Mock remark-gfm
jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => {},
}));

// Mock fetch
global.fetch = jest.fn();

describe('ChatPage', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/chat');
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    });
    
    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    
    // Mock successful auth check
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (url === '/api/auth/check') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            authenticated: true,
            user: { email: 'test@example.com', id: '1', role: 'student' }
          }),
        });
      }
      if (url === '/api/chat/sessions') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ sessions: [] }),
        });
      }
      if (url === '/api/pbl/history') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, history: [] }),
        });
      }
      if (url.includes('/api/pbl/scenarios')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              scenarios: [
                {
                  id: 'test-scenario-1',
                  title: 'Test Scenario 1',
                  difficulty: 'beginner',
                  domains: ['Engaging_with_AI'],
                  estimatedDuration: 30,
                },
              ],
            },
          }),
        });
      }
      if (url === '/api/chat' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            response: 'Hello! How can I help you today?',
            sessionId: 'test-session-123',
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders chat page with all panels', async () => {
    render(<ChatPage />);
    
    // Check for main components
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Chat History')).toBeInTheDocument();
    expect(screen.getByText('Learning Resources')).toBeInTheDocument();
    
    // Wait for async data loading
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your message... (Shift+Enter for new line)')).toBeInTheDocument();
    });
  });

  it('shows login prompt when not authenticated', async () => {
    // Mock unauthenticated response
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          authenticated: false,
        }),
      })
    );

    render(<ChatPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Please log in to start chatting')).toBeInTheDocument();
      expect(screen.getByText('Log In')).toBeInTheDocument();
    });
  });

  it('allows sending messages', async () => {
    render(<ChatPage />);
    
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Type your message... (Shift+Enter for new line)');
      expect(input).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type your message... (Shift+Enter for new line)') as HTMLTextAreaElement;
    const sendButton = screen.getByText('Send');

    // Type a message
    fireEvent.change(input, { target: { value: 'Hello AI!' } });
    expect(input.value).toBe('Hello AI!');

    // Send message
    fireEvent.click(sendButton);

    // Check message was added
    await waitFor(() => {
      expect(screen.getByText('Hello AI!')).toBeInTheDocument();
    });

    // Wait for AI response to appear
    await waitFor(() => {
      expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
    });
  });

  it('displays quick actions that update message input', async () => {
    render(<ChatPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Get started')).toBeInTheDocument();
    });

    const quickAction = screen.getByText('Get started');
    fireEvent.click(quickAction);

    const input = screen.getByPlaceholderText('Type your message... (Shift+Enter for new line)') as HTMLTextAreaElement;
    expect(input.value).toBe('Hi! Can you help me understand my current AI literacy level?');
  });

  it('shows assessment results and progress when available', async () => {
    // Mock assessment result in localStorage
    (Storage.prototype.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'assessmentResult') {
        return JSON.stringify({
          overallScore: 75,
          domainScores: {
            Engaging_with_AI: 80,
            Creating_with_AI: 70,
            Managing_with_AI: 75,
            Designing_with_AI: 75,
          },
        });
      }
      return null;
    });

    render(<ChatPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Your AI Literacy Level')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  it('displays new chat button and creates new chat', async () => {
    render(<ChatPage />);
    
    await waitFor(() => {
      expect(screen.getByText('New Chat')).toBeInTheDocument();
    });

    const newChatButton = screen.getByText('New Chat');
    fireEvent.click(newChatButton);

    // Check that messages are cleared
    const messagesArea = screen.getByText('Start a conversation...');
    expect(messagesArea).toBeInTheDocument();
  });

  it('handles collapsible panels', async () => {
    render(<ChatPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Chat History')).toBeInTheDocument();
      expect(screen.getByText('Learning Resources')).toBeInTheDocument();
    });

    // Initially, both panels should have collapse buttons visible
    const initialCollapseButtons = screen.getAllByTitle('Collapse panel');
    expect(initialCollapseButtons.length).toBe(2);

    // Verify left panel content is initially visible
    expect(screen.getByText('No previous chats')).toBeInTheDocument();
  });

  it('renders markdown in AI responses', async () => {
    render(<ChatPage />);
    
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Type your message... (Shift+Enter for new line)');
      expect(input).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type your message... (Shift+Enter for new line)') as HTMLTextAreaElement;
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    // Wait for user message to appear
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    // Wait for AI response (since our mock responds immediately)
    await waitFor(() => {
      expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
    });
    
    // Verify the response is rendered (our mock ReactMarkdown just renders the content as-is)
    expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
  });
});