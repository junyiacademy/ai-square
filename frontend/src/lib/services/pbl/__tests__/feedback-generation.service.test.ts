/**
 * @jest-environment node
 */

import { FeedbackGenerationService } from "../feedback-generation.service";
import { VertexAI, SchemaType } from "@google-cloud/vertexai";

// Mock VertexAI
jest.mock("@google-cloud/vertexai", () => ({
  VertexAI: jest.fn(),
  SchemaType: {
    OBJECT: "OBJECT",
    STRING: "STRING",
    ARRAY: "ARRAY",
  },
}));

describe("FeedbackGenerationService", () => {
  let service: FeedbackGenerationService;
  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock for VertexAI
    mockGenerateContent = jest.fn();
    const mockModel = {
      generateContent: mockGenerateContent,
    };

    (VertexAI as jest.MockedClass<typeof VertexAI>).mockImplementation(
      () =>
        ({
          getGenerativeModel: jest.fn().mockReturnValue(mockModel),
        }) as unknown as VertexAI,
    );

    service = new FeedbackGenerationService();
  });

  describe("generateQualitativeFeedback", () => {
    const mockPerformanceData = {
      overallScore: 85,
      evaluatedTasks: 3,
      totalTasks: 3,
      totalTimeSeconds: 1200,
      domainScores: {
        "critical-thinking": 90,
        "problem-solving": 80,
      },
      taskSummaries: [
        {
          taskId: "task-1",
          score: 90,
          conversations: ["What is AI?", "How does ML work?"],
          feedback: "Good understanding",
          strengths: ["Clear questions"],
          improvements: ["More depth needed"],
        },
      ],
    };

    const mockScenarioContext = {
      title: "AI Fundamentals",
      learningObjectives: ["Understand AI basics", "Learn ML concepts"],
    };

    it("generates qualitative feedback successfully", async () => {
      const mockFeedback = {
        overallAssessment: "Strong performance overall",
        strengths: [
          {
            area: "Critical Thinking",
            description: "Demonstrated excellent analytical skills",
            example: "Asked insightful questions about AI",
          },
        ],
        areasForImprovement: [
          {
            area: "Technical Depth",
            description: "Could explore concepts more deeply",
            suggestion: "Try more advanced scenarios",
          },
        ],
        nextSteps: ["Practice ML concepts", "Explore neural networks"],
        encouragement: "Great progress! Keep learning!",
      };

      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(mockFeedback) }],
              },
            },
          ],
        },
      });

      const result = await service.generateQualitativeFeedback(
        mockPerformanceData,
        mockScenarioContext,
        "en",
      );

      expect(result).toEqual(mockFeedback);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      // Verify prompt includes key information
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const promptText = callArgs.contents[0].parts[0].text;
      expect(promptText).toContain("AI Fundamentals");
      expect(promptText).toContain("85%");
      expect(promptText).toContain("English");
    });

    it("generates feedback in Traditional Chinese", async () => {
      const mockFeedback = {
        overallAssessment: "整體表現優異",
        strengths: [
          {
            area: "批判性思維",
            description: "展現出色的分析能力",
            example: "提出關於 AI 的深入問題",
          },
        ],
        areasForImprovement: [
          {
            area: "技術深度",
            description: "可以更深入探討概念",
            suggestion: "嘗試更進階的情境",
          },
        ],
        nextSteps: ["練習機器學習概念", "探索神經網路"],
        encouragement: "很棒的進步!繼續學習!",
      };

      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(mockFeedback) }],
              },
            },
          ],
        },
      });

      const result = await service.generateQualitativeFeedback(
        mockPerformanceData,
        mockScenarioContext,
        "zhTW",
      );

      expect(result).toEqual(mockFeedback);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const promptText = callArgs.contents[0].parts[0].text;
      expect(promptText).toContain("Traditional Chinese");
    });

    it("handles truncated JSON responses with auto-repair", async () => {
      const truncatedJson = `{
        "overallAssessment": "Good work",
        "strengths": [{"area": "Test", "description": "Desc", "example": "Ex`;

      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: truncatedJson }],
              },
            },
          ],
        },
      });

      const result = await service.generateQualitativeFeedback(
        mockPerformanceData,
        mockScenarioContext,
        "en",
      );

      // Should have fallback feedback
      expect(result).toBeDefined();
      expect(result.overallAssessment).toBeTruthy();
      expect(result.strengths).toBeInstanceOf(Array);
    });

    it("provides fallback feedback on parse errors", async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: "Invalid JSON response" }],
              },
            },
          ],
        },
      });

      const result = await service.generateQualitativeFeedback(
        mockPerformanceData,
        mockScenarioContext,
        "en",
      );

      // Should return fallback feedback
      expect(result).toBeDefined();
      expect(result.overallAssessment).toBe("Performance analysis completed");
      expect(result.strengths).toHaveLength(1);
      expect(result.areasForImprovement).toHaveLength(1);
      expect(result.nextSteps.length).toBeGreaterThan(0);
      expect(result.encouragement).toBeTruthy();
    });

    it("handles Vertex AI errors gracefully", async () => {
      mockGenerateContent.mockRejectedValue(new Error("API Error"));

      const result = await service.generateQualitativeFeedback(
        mockPerformanceData,
        mockScenarioContext,
        "en",
      );

      // Should return fallback feedback
      expect(result).toBeDefined();
      expect(result.overallAssessment).toBeTruthy();
    });

    it("includes all domain scores in prompt", async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      overallAssessment: "Test",
                      strengths: [],
                      areasForImprovement: [],
                      nextSteps: [],
                      encouragement: "Test",
                    }),
                  },
                ],
              },
            },
          ],
        },
      });

      await service.generateQualitativeFeedback(
        mockPerformanceData,
        mockScenarioContext,
        "en",
      );

      const callArgs = mockGenerateContent.mock.calls[0][0];
      const promptText = callArgs.contents[0].parts[0].text;
      expect(promptText).toContain("critical-thinking: 90%");
      expect(promptText).toContain("problem-solving: 80%");
    });
  });

  describe("repairTruncatedJSON", () => {
    it("repairs unclosed strings", () => {
      const truncated = '{"test": "value';
      const repaired = service.repairTruncatedJSON(truncated);

      expect(repaired).not.toBeNull();
      if (repaired) {
        expect(() => JSON.parse(repaired)).not.toThrow();
      }
    });

    it("repairs unclosed objects", () => {
      const truncated = '{"test": {"nested": "value"';
      const repaired = service.repairTruncatedJSON(truncated);

      expect(repaired).not.toBeNull();
      if (repaired) {
        expect(() => JSON.parse(repaired)).not.toThrow();
      }
    });

    it("repairs unclosed arrays", () => {
      const truncated = '{"items": [1, 2, 3';
      const repaired = service.repairTruncatedJSON(truncated);

      expect(repaired).not.toBeNull();
      if (repaired) {
        expect(() => JSON.parse(repaired)).not.toThrow();
      }
    });

    it("handles complex nested structures that cannot be repaired", () => {
      const truncated = '{"obj": {"arr": [{"key": "val';
      const repaired = service.repairTruncatedJSON(truncated);

      // This is too complex to repair - expect null
      expect(repaired).toBeNull();
    });

    it("returns null for invalid JSON", () => {
      const invalid = "not json at all";
      const repaired = service.repairTruncatedJSON(invalid);

      expect(repaired).toBeNull();
    });
  });

  describe("getFallbackFeedback", () => {
    it("returns English fallback feedback", () => {
      const feedback = service.getFallbackFeedback("en");

      expect(feedback.overallAssessment).toBe("Performance analysis completed");
      expect(feedback.strengths[0].area).toBe("Task Completion");
      expect(feedback.encouragement).toContain("Great job");
    });

    it("returns Traditional Chinese fallback feedback", () => {
      const feedback = service.getFallbackFeedback("zhTW");

      expect(feedback.overallAssessment).toBe("已完成效能分析評估");
      expect(feedback.strengths[0].area).toBe("任務完成");
      expect(feedback.encouragement).toContain("做得很好");
    });

    it("defaults to English for unsupported languages", () => {
      const feedback = service.getFallbackFeedback("fr");

      expect(feedback.overallAssessment).toBe("Performance analysis completed");
    });
  });

  describe("buildPrompt", () => {
    it("builds comprehensive prompt with all data", () => {
      const performanceData = {
        overallScore: 85,
        evaluatedTasks: 3,
        totalTasks: 3,
        totalTimeSeconds: 1200,
        domainScores: { math: 90 },
        taskSummaries: [
          {
            taskId: "task-1",
            score: 90,
            conversations: ["Test conversation"],
            feedback: "Good",
            strengths: ["Strong"],
            improvements: ["Improve"],
          },
        ],
      };

      const scenarioContext = {
        title: "Test Scenario",
        learningObjectives: ["Objective 1"],
      };

      const prompt = service.buildPrompt(
        performanceData,
        scenarioContext,
        "en",
      );

      expect(prompt).toContain("Test Scenario");
      expect(prompt).toContain("85%");
      expect(prompt).toContain("20 minutes");
      expect(prompt).toContain("math: 90%");
      expect(prompt).toContain("English");
    });
  });
});
