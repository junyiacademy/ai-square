import { render, screen, fireEvent } from '@testing-library/react';
import { ChatSidebar } from '../ChatSidebar';
import type { ChatSession, User } from '@/types/chat';

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  role: 'student',
};

const mockSessions: ChatSession[] = [
  {
    id: 'session-1',
    title: 'Test Chat 1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    last_message: 'Hello',
    message_count: 5,
  },
  {
    id: 'session-2',
    title: 'Test Chat 2',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    last_message: 'How are you?',
    message_count: 3,
  },
];

describe('ChatSidebar', () => {
  const defaultProps = {
    sessions: mockSessions,
    selectedChat: null,
    isLoading: false,
    currentUser: mockUser,
    dropdownOpen: null,
    onNewChat: jest.fn(),
    onLoadSession: jest.fn(),
    onDeleteSession: jest.fn(),
    onToggleDropdown: jest.fn(),
  };

  it('renders chat history title', () => {
    render(<ChatSidebar {...defaultProps} />);
    expect(screen.getByText('Chat History')).toBeInTheDocument();
  });

  it('renders new chat button when user is logged in', () => {
    render(<ChatSidebar {...defaultProps} />);
    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  it('does not render new chat button when user is not logged in', () => {
    render(<ChatSidebar {...defaultProps} currentUser={null} />);
    expect(screen.queryByText('New Chat')).not.toBeInTheDocument();
  });

  it('calls onNewChat when new chat button is clicked', () => {
    const onNewChat = jest.fn();
    render(<ChatSidebar {...defaultProps} onNewChat={onNewChat} />);
    fireEvent.click(screen.getByText('New Chat'));
    expect(onNewChat).toHaveBeenCalledTimes(1);
  });

  it('renders all sessions', () => {
    render(<ChatSidebar {...defaultProps} />);
    expect(screen.getByText('Test Chat 1')).toBeInTheDocument();
    expect(screen.getByText('Test Chat 2')).toBeInTheDocument();
  });

  it('calls onLoadSession when session is clicked', () => {
    const onLoadSession = jest.fn();
    render(<ChatSidebar {...defaultProps} onLoadSession={onLoadSession} />);
    fireEvent.click(screen.getByText('Test Chat 1'));
    expect(onLoadSession).toHaveBeenCalledWith('session-1');
  });

  it('shows loading state', () => {
    render(<ChatSidebar {...defaultProps} isLoading={true} />);
    expect(screen.getByRole('generic', { hidden: true })).toHaveClass('animate-spin');
  });

  it('shows empty state when no sessions', () => {
    render(<ChatSidebar {...defaultProps} sessions={[]} />);
    expect(screen.getByText('No previous chats')).toBeInTheDocument();
  });

  it('highlights selected chat', () => {
    const { container } = render(<ChatSidebar {...defaultProps} selectedChat="session-1" />);
    const selectedSession = container.querySelector('.bg-blue-50');
    expect(selectedSession).toBeInTheDocument();
  });

  it('opens dropdown menu when more button is clicked', () => {
    const onToggleDropdown = jest.fn();
    render(<ChatSidebar {...defaultProps} onToggleDropdown={onToggleDropdown} />);
    const moreButton = screen.getByTestId('more-button-session-1');
    fireEvent.click(moreButton);
    expect(onToggleDropdown).toHaveBeenCalledWith('session-1');
  });

  it('shows delete option in dropdown', () => {
    render(<ChatSidebar {...defaultProps} dropdownOpen="session-1" />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });
});
