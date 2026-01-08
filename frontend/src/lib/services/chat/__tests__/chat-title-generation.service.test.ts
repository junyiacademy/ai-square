/**
 * Tests for ChatTitleGenerationService
 * Auto-generates chat titles from messages using AI
 */

import {
  ChatTitleGenerationService,
  type ChatMessage,
} from "../chat-title-generation.service";

// Mock VertexAI
const mockGenerateContent = jest.fn();
const mockStartChat = jest.fn();
const mockGetGenerativeModel = jest.fn();

const mockVertexAI = {
  preview: {
    getGenerativeModel: mockGetGenerativeModel,
  },
};

describe("ChatTitleGenerationService", () => {
  let service: ChatTitleGenerationService;

  beforeEach(() => {
    service = new ChatTitleGenerationService(mockVertexAI as never);
    jest.clearAllMocks();

    mockGetGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent,
    });
  });

  describe("generateTitle", () => {
    it("should generate title from multiple messages", async () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          content: "What is machine learning?",
          timestamp: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          role: "assistant",
          content: "Machine learning is...",
          timestamp: "2024-01-01T00:01:00Z",
        },
        {
          id: "3",
          role: "user",
          content: "How does it work?",
          timestamp: "2024-01-01T00:02:00Z",
        },
      ];

      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: "機器學習入門" }],
              },
            },
          ],
        },
      });

      const title = await service.generateTitle(messages);

      expect(title).toBe("機器學習入門");
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: "gemini-2.5-flash",
        generationConfig: {
          maxOutputTokens: 50,
          temperature: 0.7,
        },
      });
    });

    it("should return default for single message", async () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          content: "Hello",
          timestamp: "2024-01-01T00:00:00Z",
        },
      ];

      const title = await service.generateTitle(messages);

      expect(title).toBe("New Chat");
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it("should return default for empty messages", async () => {
      const title = await service.generateTitle([]);

      expect(title).toBe("New Chat");
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it("should use first 6 messages for context", async () => {
      const messages: ChatMessage[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
        content: `Message ${i}`,
        timestamp: "2024-01-01T00:00:00Z",
      }));

      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: "對話主題" }],
              },
            },
          ],
        },
      });

      await service.generateTitle(messages);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs).toContain("User: Message 0");
      expect(callArgs).toContain("Assistant: Message 1");
      expect(callArgs).toContain("User: Message 2");
      expect(callArgs).toContain("Assistant: Message 3");
      expect(callArgs).toContain("User: Message 4");
      expect(callArgs).toContain("Assistant: Message 5");
      expect(callArgs).not.toContain("Message 6"); // Beyond first 6
    });

    it("should truncate long messages to 150 chars", async () => {
      const longMessage = "a".repeat(300);
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          content: longMessage,
          timestamp: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          role: "assistant",
          content: "Response",
          timestamp: "2024-01-01T00:01:00Z",
        },
      ];

      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: "長文討論" }],
              },
            },
          ],
        },
      });

      await service.generateTitle(messages);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs).toContain("a".repeat(150));
      expect(callArgs).not.toContain("a".repeat(151));
    });

    it("should remove quotes from generated title", async () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          content: "Test",
          timestamp: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          role: "assistant",
          content: "Response",
          timestamp: "2024-01-01T00:01:00Z",
        },
      ];

      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: '"測試標題"' }],
              },
            },
          ],
        },
      });

      const title = await service.generateTitle(messages);

      expect(title).toBe("測試標題");
    });

    it("should handle various quote types", async () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          content: "Test",
          timestamp: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          role: "assistant",
          content: "Response",
          timestamp: "2024-01-01T00:01:00Z",
        },
      ];

      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: "「標題」" }],
              },
            },
          ],
        },
      });

      const title = await service.generateTitle(messages);

      expect(title).toBe("標題");
    });

    it("should return default on empty response", async () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          content: "Test",
          timestamp: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          role: "assistant",
          content: "Response",
          timestamp: "2024-01-01T00:01:00Z",
        },
      ];

      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [],
        },
      });

      const title = await service.generateTitle(messages);

      expect(title).toBe("學習討論");
    });

    it("should return default on undefined text", async () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          content: "Test",
          timestamp: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          role: "assistant",
          content: "Response",
          timestamp: "2024-01-01T00:01:00Z",
        },
      ];

      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [{}],
              },
            },
          ],
        },
      });

      const title = await service.generateTitle(messages);

      expect(title).toBe("學習討論");
    });

    it("should handle API errors gracefully", async () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          content: "Test",
          timestamp: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          role: "assistant",
          content: "Response",
          timestamp: "2024-01-01T00:01:00Z",
        },
      ];

      mockGenerateContent.mockRejectedValue(new Error("API Error"));

      const title = await service.generateTitle(messages);

      expect(title).toBe("學習討論");
    });

    it("should format prompt correctly", async () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          content: "What is AI?",
          timestamp: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          role: "assistant",
          content: "AI is artificial intelligence",
          timestamp: "2024-01-01T00:01:00Z",
        },
      ];

      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: "AI 入門" }],
              },
            },
          ],
        },
      });

      await service.generateTitle(messages);

      const prompt = mockGenerateContent.mock.calls[0][0];
      expect(prompt).toContain("Traditional Chinese");
      expect(prompt).toContain("繁體中文");
      expect(prompt).toContain("max 6 words");
      expect(prompt).toContain("User: What is AI?");
      expect(prompt).toContain("Assistant: AI is artificial intelligence");
    });
  });
});
