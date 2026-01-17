/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useChatState } from "../use-chat-state";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe("useChatState - handleKeyDown IME Composition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  it("should send message when Enter is pressed without IME composition", () => {
    const { result } = renderHook(() => useChatState());

    act(() => {
      result.current.setMessage("Hello");
    });

    const mockEvent = {
      key: "Enter",
      shiftKey: false,
      preventDefault: jest.fn(),
      nativeEvent: {
        isComposing: false,
      },
    } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

    act(() => {
      result.current.handleKeyDown(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("should NOT send message when Enter is pressed during IME composition", () => {
    const { result } = renderHook(() => useChatState());

    act(() => {
      result.current.setMessage("你好");
    });

    const mockEvent = {
      key: "Enter",
      shiftKey: false,
      preventDefault: jest.fn(),
      nativeEvent: {
        isComposing: true, // IME composition active
      },
    } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

    const messagesBefore = result.current.messages.length;

    act(() => {
      result.current.handleKeyDown(mockEvent);
    });

    // preventDefault should NOT be called during composition
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();

    // Message should NOT be sent
    expect(result.current.messages.length).toBe(messagesBefore);
  });

  it("should create new line when Shift+Enter is pressed", () => {
    const { result } = renderHook(() => useChatState());

    act(() => {
      result.current.setMessage("Line 1");
    });

    const mockEvent = {
      key: "Enter",
      shiftKey: true, // Shift+Enter
      preventDefault: jest.fn(),
      nativeEvent: {
        isComposing: false,
      },
    } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

    act(() => {
      result.current.handleKeyDown(mockEvent);
    });

    // preventDefault should NOT be called for Shift+Enter
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("should handle Chinese input workflow correctly", () => {
    const { result } = renderHook(() => useChatState());

    // Step 1: User types Chinese (still composing)
    act(() => {
      result.current.setMessage("你好"); // "你好" with underline (composing)
    });

    // Step 2: User presses Enter to confirm characters (isComposing: true)
    const firstEnter = {
      key: "Enter",
      shiftKey: false,
      preventDefault: jest.fn(),
      nativeEvent: {
        isComposing: true, // Still composing
      },
    } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

    act(() => {
      result.current.handleKeyDown(firstEnter);
    });

    // First Enter should NOT send message
    expect(firstEnter.preventDefault).not.toHaveBeenCalled();

    // Step 3: User presses Enter again to send (isComposing: false)
    const secondEnter = {
      key: "Enter",
      shiftKey: false,
      preventDefault: jest.fn(),
      nativeEvent: {
        isComposing: false, // Composition complete
      },
    } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

    act(() => {
      result.current.handleKeyDown(secondEnter);
    });

    // Second Enter should send message
    expect(secondEnter.preventDefault).toHaveBeenCalled();
  });

  it("should ignore non-Enter keys during composition", () => {
    const { result } = renderHook(() => useChatState());

    act(() => {
      result.current.setMessage("Test");
    });

    const mockEvent = {
      key: "a",
      shiftKey: false,
      preventDefault: jest.fn(),
      nativeEvent: {
        isComposing: true,
      },
    } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

    act(() => {
      result.current.handleKeyDown(mockEvent);
    });

    // Non-Enter keys should not trigger any special handling
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });
});
