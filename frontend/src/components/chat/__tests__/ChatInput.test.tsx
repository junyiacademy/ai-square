import { render, screen, fireEvent } from "@testing-library/react";
import { ChatInput } from "../ChatInput";
import type { User } from "@/types/chat";
import { createRef } from "react";

const mockUser: User = {
  id: "user-1",
  email: "test@example.com",
  role: "student",
};

describe("ChatInput", () => {
  const defaultProps = {
    message: "",
    isSending: false,
    currentUser: mockUser,
    quickActions: [
      { icon: "💡", label: "Explain", prompt: "Can you explain this?" },
      { icon: "🔍", label: "Examples", prompt: "Can you give examples?" },
    ],
    textareaRef: createRef<HTMLTextAreaElement>(),
    onMessageChange: jest.fn(),
    onSend: jest.fn(),
    onKeyDown: jest.fn(),
  };

  it("renders textarea with placeholder", () => {
    render(<ChatInput {...defaultProps} />);
    expect(
      screen.getByPlaceholderText(/Type your message/),
    ).toBeInTheDocument();
  });

  it("renders send button", () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByText("Send")).toBeInTheDocument();
  });

  it("renders quick action buttons", () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByText("Explain")).toBeInTheDocument();
    expect(screen.getByText("Examples")).toBeInTheDocument();
  });

  it("calls onMessageChange when typing", () => {
    const onMessageChange = jest.fn();
    render(<ChatInput {...defaultProps} onMessageChange={onMessageChange} />);
    const textarea = screen.getByPlaceholderText(/Type your message/);
    fireEvent.change(textarea, { target: { value: "Hello" } });
    expect(onMessageChange).toHaveBeenCalledWith("Hello");
  });

  it("calls onSend when send button is clicked", () => {
    const onSend = jest.fn();
    render(
      <ChatInput {...defaultProps} message="Test message" onSend={onSend} />,
    );
    fireEvent.click(screen.getByText("Send"));
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("disables send button when message is empty", () => {
    render(<ChatInput {...defaultProps} message="" />);
    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it("disables send button when isSending is true", () => {
    render(<ChatInput {...defaultProps} message="Test" isSending={true} />);
    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it("disables input when user is not logged in", () => {
    render(<ChatInput {...defaultProps} currentUser={null} />);
    expect(screen.getByPlaceholderText(/Type your message/)).toBeDisabled();
  });

  it("shows loading spinner when sending", () => {
    const { container } = render(
      <ChatInput {...defaultProps} message="Test" isSending={true} />,
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("calls onMessageChange when quick action is clicked", () => {
    const onMessageChange = jest.fn();
    render(<ChatInput {...defaultProps} onMessageChange={onMessageChange} />);
    fireEvent.click(screen.getByText("Explain"));
    expect(onMessageChange).toHaveBeenCalledWith("Can you explain this?");
  });

  it("does not show quick actions when user is not logged in", () => {
    render(<ChatInput {...defaultProps} currentUser={null} />);
    expect(screen.queryByText("Explain")).not.toBeInTheDocument();
  });

  it("calls onKeyDown when key is pressed", () => {
    const onKeyDown = jest.fn();
    render(<ChatInput {...defaultProps} onKeyDown={onKeyDown} />);
    const textarea = screen.getByPlaceholderText(/Type your message/);
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onKeyDown).toHaveBeenCalled();
  });
});
