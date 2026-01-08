/**
 * Tests for ChatSessionService
 * Manages chat session creation, retrieval, and message saving
 */

import {
  ChatSessionService,
  type ChatSession,
  type ChatMessage,
} from "../chat-session.service";

// Mock Storage
const mockBucket = {
  file: jest.fn(),
};

const mockFile = {
  exists: jest.fn(),
  download: jest.fn(),
  save: jest.fn(),
};

describe("ChatSessionService", () => {
  let service: ChatSessionService;

  beforeEach(() => {
    service = new ChatSessionService(mockBucket as never);
    jest.clearAllMocks();
    mockBucket.file.mockReturnValue(mockFile);
  });

  describe("createSession", () => {
    it("should create new session with first message", async () => {
      mockFile.exists.mockResolvedValue([false]);
      mockFile.save.mockResolvedValue(undefined);

      const message: ChatMessage = {
        id: "msg1",
        role: "user",
        content: "Hello AI",
        timestamp: "2024-01-01T00:00:00Z",
      };

      const result = await service.createSession(
        "user@test.com",
        "session1",
        message,
      );

      expect(result.id).toBe("session1");
      expect(result.title).toBe("New Chat");
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toEqual(message);
      expect(result.message_count).toBe(1);
      expect(mockFile.save).toHaveBeenCalled();
    });

    it("should handle sanitized email format", async () => {
      mockFile.exists.mockResolvedValue([false]);
      mockFile.save.mockResolvedValue(undefined);

      const message: ChatMessage = {
        id: "msg1",
        role: "user",
        content: "Test",
        timestamp: "2024-01-01T00:00:00Z",
      };

      await service.createSession("user@test.com", "session1", message);

      expect(mockBucket.file).toHaveBeenCalledWith(
        "user/user_at_test_com/chat/sessions/session1.json",
      );
    });
  });

  describe("getSession", () => {
    it("should retrieve existing session", async () => {
      const existingSession: ChatSession = {
        id: "session1",
        title: "Test Chat",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T01:00:00Z",
        messages: [
          {
            id: "msg1",
            role: "user",
            content: "Hello",
            timestamp: "2024-01-01T00:00:00Z",
          },
        ],
        last_message: "Hello",
        message_count: 1,
        tags: [],
      };

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([
        Buffer.from(JSON.stringify(existingSession)),
      ]);

      const result = await service.getSession("user@test.com", "session1");

      expect(result).toEqual(existingSession);
      expect(mockBucket.file).toHaveBeenCalledWith(
        "user/user_at_test_com/chat/sessions/session1.json",
      );
    });

    it("should return null for non-existent session", async () => {
      mockFile.exists.mockResolvedValue([false]);

      const result = await service.getSession("user@test.com", "session1");

      expect(result).toBeNull();
    });

    it("should handle download errors gracefully", async () => {
      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockRejectedValue(new Error("Download failed"));

      const result = await service.getSession("user@test.com", "session1");

      expect(result).toBeNull();
    });
  });

  describe("addMessage", () => {
    it("should add message to existing session", async () => {
      const existingSession: ChatSession = {
        id: "session1",
        title: "Test Chat",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T01:00:00Z",
        messages: [
          {
            id: "msg1",
            role: "user",
            content: "Hello",
            timestamp: "2024-01-01T00:00:00Z",
          },
        ],
        last_message: "Hello",
        message_count: 1,
        tags: [],
      };

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([
        Buffer.from(JSON.stringify(existingSession)),
      ]);
      mockFile.save.mockResolvedValue(undefined);

      const newMessage: ChatMessage = {
        id: "msg2",
        role: "assistant",
        content: "Hi there!",
        timestamp: "2024-01-01T01:00:00Z",
      };

      const result = await service.addMessage(
        "user@test.com",
        "session1",
        newMessage,
      );

      expect(result.messages).toHaveLength(2);
      expect(result.messages[1]).toEqual(newMessage);
      expect(result.message_count).toBe(2);
      expect(result.last_message).toBe("Hi there!");
      expect(mockFile.save).toHaveBeenCalled();
    });

    it("should truncate last_message to 100 chars", async () => {
      const existingSession: ChatSession = {
        id: "session1",
        title: "Test",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T01:00:00Z",
        messages: [],
        last_message: "",
        message_count: 0,
        tags: [],
      };

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([
        Buffer.from(JSON.stringify(existingSession)),
      ]);
      mockFile.save.mockResolvedValue(undefined);

      const longMessage = "a".repeat(200);
      const newMessage: ChatMessage = {
        id: "msg1",
        role: "user",
        content: longMessage,
        timestamp: "2024-01-01T00:00:00Z",
      };

      const result = await service.addMessage(
        "user@test.com",
        "session1",
        newMessage,
      );

      expect(result.last_message).toHaveLength(100);
      expect(result.last_message).toBe("a".repeat(100));
    });

    it("should create new session if not exists", async () => {
      mockFile.exists.mockResolvedValue([false]);
      mockFile.save.mockResolvedValue(undefined);

      const message: ChatMessage = {
        id: "msg1",
        role: "user",
        content: "Hello",
        timestamp: "2024-01-01T00:00:00Z",
      };

      const result = await service.addMessage(
        "user@test.com",
        "session1",
        message,
      );

      expect(result.id).toBe("session1");
      expect(result.messages).toHaveLength(1);
      expect(result.title).toBe("New Chat");
    });
  });

  describe("updateSessionTitle", () => {
    it("should update session title", async () => {
      const existingSession: ChatSession = {
        id: "session1",
        title: "Old Title",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T01:00:00Z",
        messages: [],
        last_message: "",
        message_count: 0,
        tags: [],
      };

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([
        Buffer.from(JSON.stringify(existingSession)),
      ]);
      mockFile.save.mockResolvedValue(undefined);

      const result = await service.updateSessionTitle(
        "user@test.com",
        "session1",
        "New Title",
      );

      expect(result?.title).toBe("New Title");
      expect(mockFile.save).toHaveBeenCalled();
    });

    it("should return null if session not exists", async () => {
      mockFile.exists.mockResolvedValue([false]);

      const result = await service.updateSessionTitle(
        "user@test.com",
        "session1",
        "New Title",
      );

      expect(result).toBeNull();
    });
  });

  describe("updateChatIndex", () => {
    it("should create new index if not exists", async () => {
      mockFile.exists.mockResolvedValue([false]);
      mockFile.save.mockResolvedValue(undefined);

      const session: ChatSession = {
        id: "session1",
        title: "Test Chat",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T01:00:00Z",
        messages: [],
        last_message: "Hello",
        message_count: 1,
        tags: [],
      };

      await service.updateChatIndex("user@test.com", "session1", session);

      expect(mockFile.save).toHaveBeenCalled();
      const savedData = JSON.parse(mockFile.save.mock.calls[0][0]);
      expect(savedData.sessions).toHaveLength(1);
      expect(savedData.sessions[0].id).toBe("session1");
    });

    it("should update existing index", async () => {
      const existingIndex = {
        sessions: [
          {
            id: "session1",
            title: "Old Title",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            last_message: "Old",
            message_count: 1,
          },
        ],
      };

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([
        Buffer.from(JSON.stringify(existingIndex)),
      ]);
      mockFile.save.mockResolvedValue(undefined);

      const updatedSession: ChatSession = {
        id: "session1",
        title: "New Title",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T02:00:00Z",
        messages: [],
        last_message: "New",
        message_count: 2,
        tags: [],
      };

      await service.updateChatIndex(
        "user@test.com",
        "session1",
        updatedSession,
      );

      const savedData = JSON.parse(mockFile.save.mock.calls[0][0]);
      expect(savedData.sessions).toHaveLength(1);
      expect(savedData.sessions[0].title).toBe("New Title");
      expect(savedData.sessions[0].message_count).toBe(2);
    });

    it("should add new session to existing index", async () => {
      const existingIndex = {
        sessions: [
          {
            id: "session1",
            title: "Session 1",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            last_message: "Test",
            message_count: 1,
          },
        ],
      };

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([
        Buffer.from(JSON.stringify(existingIndex)),
      ]);
      mockFile.save.mockResolvedValue(undefined);

      const newSession: ChatSession = {
        id: "session2",
        title: "Session 2",
        created_at: "2024-01-02T00:00:00Z",
        updated_at: "2024-01-02T01:00:00Z",
        messages: [],
        last_message: "New",
        message_count: 1,
        tags: [],
      };

      await service.updateChatIndex("user@test.com", "session2", newSession);

      const savedData = JSON.parse(mockFile.save.mock.calls[0][0]);
      expect(savedData.sessions).toHaveLength(2);
      // New session should be at beginning
      expect(savedData.sessions[0].id).toBe("session2");
    });

    it("should sort sessions by updated_at", async () => {
      const existingIndex = {
        sessions: [
          {
            id: "session1",
            title: "Session 1",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            last_message: "Test",
            message_count: 1,
          },
          {
            id: "session2",
            title: "Session 2",
            created_at: "2024-01-02T00:00:00Z",
            updated_at: "2024-01-02T00:00:00Z",
            last_message: "Test",
            message_count: 1,
          },
        ],
      };

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([
        Buffer.from(JSON.stringify(existingIndex)),
      ]);
      mockFile.save.mockResolvedValue(undefined);

      // Update session1 to have later updated_at
      const updatedSession: ChatSession = {
        id: "session1",
        title: "Session 1",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-03T00:00:00Z", // Later than session2
        messages: [],
        last_message: "Updated",
        message_count: 2,
        tags: [],
      };

      await service.updateChatIndex(
        "user@test.com",
        "session1",
        updatedSession,
      );

      const savedData = JSON.parse(mockFile.save.mock.calls[0][0]);
      // session1 should now be first
      expect(savedData.sessions[0].id).toBe("session1");
      expect(savedData.sessions[1].id).toBe("session2");
    });
  });

  describe("sanitizeEmail", () => {
    it("should sanitize email correctly", () => {
      const result = (
        service as unknown as { sanitizeEmail: (email: string) => string }
      ).sanitizeEmail("user@test.com");
      expect(result).toBe("user_at_test_com");
    });

    it("should handle multiple dots", () => {
      const result = (
        service as unknown as { sanitizeEmail: (email: string) => string }
      ).sanitizeEmail("user.name@test.co.uk");
      expect(result).toBe("user_name_at_test_co_uk");
    });
  });
});
