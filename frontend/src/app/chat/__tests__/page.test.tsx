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
    
    // Check for main components (should appear in both mobile and desktop versions)
    expect(screen.getAllByText('Header')).toHaveLength(2); // Mobile + Desktop
    expect(screen.getAllByText('Chat History')).toHaveLength(2);
    expect(screen.getAllByText('Learning Resources')).toHaveLength(2);
    expect(screen.getAllByText('AI Assistant')).toHaveLength(2);
    expect(screen.getAllByText('Back to Dashboard')).toHaveLength(2);
    
    // Wait for async data loading
    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('Type your message... (Shift+Enter for new line)')).toHaveLength(2);
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
      expect(screen.getAllByText('Please log in to start chatting')).toHaveLength(2);
      expect(screen.getAllByText('Log In')).toHaveLength(2);
    });
  });

  it('allows sending messages', async () => {
    render(<ChatPage />);
    
    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText('Type your message... (Shift+Enter for new line)');
      expect(inputs).toHaveLength(2);
    });

    const input = screen.getAllByPlaceholderText('Type your message... (Shift+Enter for new line)')[0] as HTMLTextAreaElement;
    const sendButton = screen.getAllByText('Send')[0];

    // Type a message
    fireEvent.change(input, { target: { value: 'Hello AI!' } });
    expect(input.value).toBe('Hello AI!');

    // Send message
    fireEvent.click(sendButton);

    // Check message was added
    await waitFor(() => {
      expect(screen.getAllByText('Hello AI!')).toHaveLength(2);
    });

    // Wait for AI response to appear
    await waitFor(() => {
      expect(screen.getAllByText('Hello! How can I help you today?')).toHaveLength(2);
    });
  });

  it('displays quick actions that update message input', async () => {
    render(<ChatPage />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Get started')).toHaveLength(2);
    });

    const quickAction = screen.getAllByText('Get started')[0];
    fireEvent.click(quickAction);

    const input = screen.getAllByPlaceholderText('Type your message... (Shift+Enter for new line)')[0] as HTMLTextAreaElement;
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
            Managing_AI: 75,
            Designing_AI: 75,
          },
        });
      }
      return null;
    });

    render(<ChatPage />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Your AI Literacy Level')).toHaveLength(2);
      expect(screen.getAllByText('75%')).toHaveLength(2);
    });
  });

  it('displays new chat button and creates new chat', async () => {
    render(<ChatPage />);
    
    await waitFor(() => {
      expect(screen.getAllByText('New Chat')).toHaveLength(2);
    });

    const newChatButton = screen.getAllByText('New Chat')[0];
    fireEvent.click(newChatButton);

    // Check that messages are cleared
    const messagesArea = screen.getAllByText('Start a conversation...')[0];
    expect(messagesArea).toBeInTheDocument();
  });

  it('handles collapsible panels', async () => {
    render(<ChatPage />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Chat History')).toHaveLength(2);
      expect(screen.getAllByText('Learning Resources')).toHaveLength(2);
    });

    // Initially, panels should have collapse buttons visible (only in desktop version)
    const initialCollapseButtons = screen.getAllByTitle('Collapse panel');
    expect(initialCollapseButtons.length).toBe(2); // Only desktop has collapse buttons

    // Verify left panel content is initially visible
    expect(screen.getAllByText('No previous chats')).toHaveLength(2);
  });

  it('renders markdown in AI responses', async () => {
    render(<ChatPage />);
    
    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText('Type your message... (Shift+Enter for new line)');
      expect(inputs).toHaveLength(2);
    });

    const input = screen.getAllByPlaceholderText('Type your message... (Shift+Enter for new line)')[0] as HTMLTextAreaElement;
    const sendButton = screen.getAllByText('Send')[0];

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    // Wait for user message to appear
    await waitFor(() => {
      expect(screen.getAllByText('Test message')).toHaveLength(2);
    });

    // Wait for AI response (since our mock responds immediately)
    await waitFor(() => {
      expect(screen.getAllByText('Hello! How can I help you today?')).toHaveLength(2);
    });
    
    // Verify the response is rendered (our mock ReactMarkdown just renders the content as-is)
    expect(screen.getAllByText('Hello! How can I help you today?')).toHaveLength(2);
  });
});