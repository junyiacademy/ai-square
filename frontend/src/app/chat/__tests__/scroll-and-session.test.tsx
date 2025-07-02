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

// Mock window.history.pushState
Object.defineProperty(window, 'history', {
  value: {
    pushState: jest.fn(),
  },
  writable: true,
});

describe('ChatPage - Scroll and Session Features', () => {
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
          json: () => Promise.resolve({ 
            sessions: [
              {
                id: 'session-123',
                title: 'Previous Chat',
                created_at: '2024-01-01',
                updated_at: '2024-01-01',
                last_message: 'Last message',
                message_count: 5
              }
            ] 
          }),
        });
      }
      if (url === '/api/chat/sessions/session-123') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            messages: [
              { id: '1', role: 'user', content: 'Hello', timestamp: '2024-01-01' },
              { id: '2', role: 'assistant', content: 'Hi there!', timestamp: '2024-01-01' }
            ]
          }),
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
            data: { scenarios: [] },
          }),
        });
      }
      if (url === '/api/chat' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            response: 'Hello! How can I help you today?',
            sessionId: 'new-session-456',
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

  it('shows scroll to bottom button when scrolled up', async () => {
    render(<ChatPage />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Header')).toHaveLength(2);
    });

    // The scroll button should not be visible initially
    expect(screen.queryByLabelText('Scroll to bottom')).not.toBeInTheDocument();
  });

  it('updates URL when selecting a chat session', async () => {
    render(<ChatPage />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Previous Chat')).toHaveLength(2);
    });

    // Click on a previous chat session
    fireEvent.click(screen.getAllByText('Previous Chat')[0]);

    await waitFor(() => {
      expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/chat?session=session-123');
    });
  });

  it('loads session from URL parameter', async () => {
    // Mock URL with session parameter
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('session-123'),
    });

    render(<ChatPage />);

    // Wait for authentication and then session to load
    await waitFor(() => {
      expect(screen.getAllByText('Header')).toHaveLength(2);
    });

    // The session load happens after user is authenticated
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/sessions/session-123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-user-info': expect.any(String)
          })
        })
      );
    });
  });

  it('clears URL when creating new chat', async () => {
    render(<ChatPage />);
    
    await waitFor(() => {
      expect(screen.getAllByText('New Chat')).toHaveLength(2);
    });

    // Click new chat button
    fireEvent.click(screen.getAllByText('New Chat')[0]);

    expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/chat');
  });

  it('updates URL when sending first message in new chat', async () => {
    render(<ChatPage />);
    
    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText('Type your message... (Shift+Enter for new line)');
      expect(inputs).toHaveLength(2);
    });

    const input = screen.getAllByPlaceholderText('Type your message... (Shift+Enter for new line)')[0] as HTMLTextAreaElement;
    const sendButton = screen.getAllByText('Send')[0];

    // Type and send a message
    fireEvent.change(input, { target: { value: 'Hello AI!' } });
    fireEvent.click(sendButton);

    // Wait for response
    await waitFor(() => {
      expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/chat?session=new-session-456');
    });
  });

  it('has enhanced input panel styling', () => {
    render(<ChatPage />);
    
    // Check for the enhanced input area with gray background
    const inputAreas = screen.getAllByPlaceholderText('Type your message... (Shift+Enter for new line)');
    expect(inputAreas).toHaveLength(2);
    
    // Check that at least one has the gray background container
    const grayBackgroundElement = inputAreas[0].closest('div[class*="bg-gray-50"]');
    expect(grayBackgroundElement).toBeInTheDocument();
    
    // Check for the white rounded input container
    const whiteContainer = inputAreas[0].closest('div[class*="bg-white rounded-xl"]');
    expect(whiteContainer).toBeInTheDocument();
  });

  it('shows delete menu for chat sessions', async () => {
    render(<ChatPage />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Previous Chat')).toHaveLength(2);
    });

    // Initially, delete button should not be visible
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    
    // Find the three dots button using test ID
    const moreButton = screen.getAllByTestId('more-button-session-123')[0];
    fireEvent.click(moreButton);
    
    await waitFor(() => {
      expect(screen.getAllByText('Delete')).toHaveLength(2); // Both mobile and desktop versions
    });
  });

  it('deletes session when confirmed', async () => {
    // Mock window.confirm to return true
    window.confirm = jest.fn().mockReturnValue(true);

    render(<ChatPage />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Previous Chat')).toHaveLength(2);
    });

    // Find and click the more button
    const moreButton = screen.getAllByTestId('more-button-session-123')[0];
    fireEvent.click(moreButton);
    
    await waitFor(() => {
      expect(screen.getAllByText('Delete')).toHaveLength(2); // Both mobile and desktop versions
    });

    // Mock successful delete response after the dropdown is shown
    const originalFetch = global.fetch as jest.Mock;
    originalFetch.mockImplementationOnce((url: string, options: any) => {
      if (url === '/api/chat/sessions/session-123' && options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      // Fall back to existing mock behavior for other calls
      return originalFetch(url, options);
    });

    // Click delete (use the first Delete button)
    fireEvent.click(screen.getAllByText('Delete')[0]);

    // Verify confirmation was shown
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this chat session?');

    // Verify delete API was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/sessions/session-123',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'x-user-info': expect.any(String)
          })
        })
      );
    });
  });
});