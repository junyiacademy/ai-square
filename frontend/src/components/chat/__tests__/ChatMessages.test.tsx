import { render, screen } from "@testing-library/react";
import { ChatMessages } from "../ChatMessages";
import type { ChatMessage, User } from "@/types/chat";
import { createRef } from "react";

const mockUser: User = {
  id: "user-1",
  email: "test@example.com",
  role: "student",
};

const mockMessages: ChatMessage[] = [
  {
    id: "msg-1",
    role: "user",
    content: "Hello",
    timestamp: "2024-01-01T00:00:00Z",
  },
  {
    id: "msg-2",
    role: "assistant",
    content: "Hi there! How can I help you?",
    timestamp: "2024-01-01T00:01:00Z",
  },
];

describe("ChatMessages", () => {
  const defaultProps = {
    messages: mockMessages,
    isTyping: false,
    currentUser: mockUser,
    showScrollButton: false,
    messagesContainerRef: createRef<HTMLDivElement>(),
    messageEndRef: createRef<HTMLDivElement>(),
    onScrollToBottom: jest.fn(),
  };

  it("renders all messages", () => {
    render(<ChatMessages {...defaultProps} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(
      screen.getByText("Hi there! How can I help you?"),
    ).toBeInTheDocument();
  });

  it("shows login prompt when user is not logged in", () => {
    render(<ChatMessages {...defaultProps} currentUser={null} />);
    expect(
      screen.getByText("Please log in to start chatting"),
    ).toBeInTheDocument();
    expect(screen.getByText("Log In")).toBeInTheDocument();
  });

  it("shows empty state when no messages", () => {
    render(<ChatMessages {...defaultProps} messages={[]} />);
    expect(screen.getByText("Start a conversation...")).toBeInTheDocument();
  });

  it("displays typing indicator when isTyping is true", () => {
    render(<ChatMessages {...defaultProps} isTyping={true} />);
    expect(screen.getByTestId("typing-indicator")).toBeInTheDocument();
  });

  it("does not display typing indicator when isTyping is false", () => {
    render(<ChatMessages {...defaultProps} isTyping={false} />);
    expect(screen.queryByTestId("typing-indicator")).not.toBeInTheDocument();
  });

  it("shows scroll to bottom button when showScrollButton is true", () => {
    render(<ChatMessages {...defaultProps} showScrollButton={true} />);
    expect(screen.getByLabelText("Scroll to bottom")).toBeInTheDocument();
  });

  it("does not show scroll button when showScrollButton is false", () => {
    render(<ChatMessages {...defaultProps} showScrollButton={false} />);
    expect(screen.queryByLabelText("Scroll to bottom")).not.toBeInTheDocument();
  });

  it("applies correct styling to user messages", () => {
    const { container } = render(<ChatMessages {...defaultProps} />);
    const userMessage = container.querySelector(".bg-blue-500");
    expect(userMessage).toBeInTheDocument();
    expect(userMessage).toHaveTextContent("Hello");
  });

  it("applies correct styling to assistant messages", () => {
    const { container } = render(<ChatMessages {...defaultProps} />);
    const assistantMessages = container.querySelectorAll(".bg-gray-100");
    expect(assistantMessages.length).toBeGreaterThan(0);
  });

  it("renders markdown in assistant messages", () => {
    const messagesWithMarkdown: ChatMessage[] = [
      {
        id: "msg-1",
        role: "assistant",
        content: "**Bold text** and *italic text*",
        timestamp: "2024-01-01T00:00:00Z",
      },
    ];
    render(<ChatMessages {...defaultProps} messages={messagesWithMarkdown} />);
    // Markdown renders as HTML: **text** becomes <strong>text</strong>, *text* becomes <em>text</em>
    expect(screen.getByText(/Bold text/)).toBeInTheDocument();
    expect(screen.getByText(/italic text/)).toBeInTheDocument();
  });
});
