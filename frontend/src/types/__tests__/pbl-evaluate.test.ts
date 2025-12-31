/**
 * Unit tests for PBL Evaluate types
 * Tests evaluation request/response interfaces and structures
 */

import type {
  EvaluateRequestBody,
  Conversation,
  EvaluationResult,
  EvaluateResponse,
} from "../pbl-evaluate";

describe("PBL Evaluate Types", () => {
  describe("Conversation interface", () => {
    it("should define user conversation structure", () => {
      const userConversation: Conversation = {
        type: "user",
        content:
          "I think AI systems should prioritize fairness over efficiency in most cases.",
        timestamp: "2024-01-01T12:00:00Z",
      };

      expect(userConversation.type).toBe("user");
      expect(userConversation.content).toContain("fairness");
      expect(userConversation.timestamp).toBe("2024-01-01T12:00:00Z");
    });

    it("should define assistant conversation structure", () => {
      const assistantConversation: Conversation = {
        type: "assistant",
        content:
          "That's an interesting perspective. Can you provide a specific example?",
        timestamp: "2024-01-01T12:00:30Z",
      };

      expect(assistantConversation.type).toBe("assistant");
      expect(assistantConversation.content).toContain("perspective");
      expect(assistantConversation.timestamp).toBe("2024-01-01T12:00:30Z");
    });

    it("should allow conversation without timestamp", () => {
      const conversationWithoutTimestamp: Conversation = {
        type: "user",
        content: "Hello, AI tutor!",
      };

      expect(conversationWithoutTimestamp.type).toBe("user");
      expect(conversationWithoutTimestamp.content).toBe("Hello, AI tutor!");
      expect(conversationWithoutTimestamp.timestamp).toBeUndefined();
    });
  });

  describe("EvaluateRequestBody interface", () => {
    it("should define complete evaluation request structure", () => {
      const mockTask = {
        id: "task-123",
        title: "Ethical Analysis Task",
        category: "analysis",
      } as any;

      const evaluateRequest: EvaluateRequestBody = {
        conversations: [
          {
            type: "user",
            content:
              "I believe we should consider all stakeholders when making AI decisions.",
            timestamp: "2024-01-01T12:00:00Z",
          },
          {
            type: "assistant",
            content:
              "Excellent point! Which stakeholders do you think are most important?",
            timestamp: "2024-01-01T12:00:30Z",
          },
          {
            type: "user",
            content:
              "End users, developers, and society at large should all be considered.",
            timestamp: "2024-01-01T12:01:00Z",
          },
        ],
        task: mockTask,
        targetDomains: ["engaging_with_ai", "designing_ai"],
        focusKSA: ["K1.1", "S2.3", "A1.2"],
        language: "en",
      };

      expect(evaluateRequest.conversations).toHaveLength(3);
      expect(evaluateRequest.conversations[0].type).toBe("user");
      expect(evaluateRequest.conversations[1].type).toBe("assistant");
      expect(evaluateRequest.task.id).toBe("task-123");
      expect(evaluateRequest.targetDomains).toContain("engaging_with_ai");
      expect(evaluateRequest.focusKSA).toContain("K1.1");
      expect(evaluateRequest.language).toBe("en");
    });

    it("should allow minimal evaluation request", () => {
      const minimalRequest: EvaluateRequestBody = {
        conversations: [
          { type: "user", content: "My analysis of the scenario..." },
        ],
        task: { id: "task-456", title: "Simple Task" } as any,
      };

      expect(minimalRequest.conversations).toHaveLength(1);
      expect(minimalRequest.task.id).toBe("task-456");
      expect(minimalRequest.targetDomains).toBeUndefined();
      expect(minimalRequest.focusKSA).toBeUndefined();
      expect(minimalRequest.language).toBeUndefined();
    });

    it("should handle empty conversations array", () => {
      const requestWithEmptyConversations: EvaluateRequestBody = {
        conversations: [],
        task: { id: "task-789", title: "Empty Task" } as any,
        language: "zh",
      };

      expect(requestWithEmptyConversations.conversations).toHaveLength(0);
      expect(requestWithEmptyConversations.task.id).toBe("task-789");
      expect(requestWithEmptyConversations.language).toBe("zh");
    });

    it("should handle various KSA codes", () => {
      const requestWithKSACodes: EvaluateRequestBody = {
        conversations: [{ type: "user", content: "Test conversation" }],
        task: { id: "task-999" } as any,
        focusKSA: [
          "K1.1",
          "K2.2",
          "K3.1", // Knowledge codes
          "S1.2",
          "S2.1",
          "S3.3", // Skills codes
          "A1.1",
          "A2.3",
          "A3.2", // Attitudes codes
        ],
      };

      expect(requestWithKSACodes.focusKSA).toHaveLength(9);
      expect(
        requestWithKSACodes.focusKSA?.filter((code) => code.startsWith("K")),
      ).toHaveLength(3);
      expect(
        requestWithKSACodes.focusKSA?.filter((code) => code.startsWith("S")),
      ).toHaveLength(3);
      expect(
        requestWithKSACodes.focusKSA?.filter((code) => code.startsWith("A")),
      ).toHaveLength(3);
    });
  });

  describe("EvaluationResult interface", () => {
    it("should define complete evaluation result structure", () => {
      const evaluationResult: EvaluationResult = {
        score: 85,
        feedback:
          "Your analysis demonstrates strong ethical reasoning and comprehensive stakeholder consideration.",
        detailedScores: {
          relevance: 88,
          depth: 82,
          criticalThinking: 90,
          ethicalConsideration: 85,
          practicalApplication: 80,
        },
        strengths: [
          "Comprehensive stakeholder analysis",
          "Clear ethical reasoning framework",
          "Practical implementation considerations",
        ],
        areasForImprovement: [
          "Could explore more diverse perspectives",
          "Consider long-term implications more deeply",
          "Provide more specific examples",
        ],
        nextSteps: [
          "Practice with more complex ethical dilemmas",
          "Study additional ethical frameworks",
          "Engage with diverse viewpoints on AI ethics",
        ],
        overallAssessment:
          "You have demonstrated strong analytical skills and ethical awareness throughout this task.",
      };

      expect(evaluationResult.score).toBe(85);
      expect(evaluationResult.feedback).toContain("ethical reasoning");
      expect(evaluationResult.detailedScores.relevance).toBe(88);
      expect(evaluationResult.detailedScores.criticalThinking).toBe(90);
      expect(evaluationResult.strengths).toHaveLength(3);
      expect(evaluationResult.areasForImprovement).toHaveLength(3);
      expect(evaluationResult.nextSteps).toHaveLength(3);
      expect(evaluationResult.overallAssessment).toContain("analytical skills");
    });

    it("should validate detailed scores structure", () => {
      const detailedScores = {
        relevance: 75,
        depth: 80,
        criticalThinking: 85,
        ethicalConsideration: 78,
        practicalApplication: 82,
      };

      const result: EvaluationResult = {
        score: 80,
        feedback: "Good work overall.",
        detailedScores,
        strengths: ["Strong reasoning"],
        areasForImprovement: ["More examples needed"],
        nextSteps: ["Continue practicing"],
        overallAssessment: "Solid performance with room for growth.",
      };

      expect(result.detailedScores).toHaveProperty("relevance");
      expect(result.detailedScores).toHaveProperty("depth");
      expect(result.detailedScores).toHaveProperty("criticalThinking");
      expect(result.detailedScores).toHaveProperty("ethicalConsideration");
      expect(result.detailedScores).toHaveProperty("practicalApplication");

      expect(result.detailedScores.relevance).toBe(75);
      expect(result.detailedScores.depth).toBe(80);
      expect(result.detailedScores.criticalThinking).toBe(85);
      expect(result.detailedScores.ethicalConsideration).toBe(78);
      expect(result.detailedScores.practicalApplication).toBe(82);
    });

    it("should handle evaluation with empty arrays", () => {
      const minimalResult: EvaluationResult = {
        score: 60,
        feedback: "Basic understanding demonstrated.",
        detailedScores: {
          relevance: 60,
          depth: 55,
          criticalThinking: 65,
          ethicalConsideration: 60,
          practicalApplication: 60,
        },
        strengths: [],
        areasForImprovement: [],
        nextSteps: [],
        overallAssessment: "Needs more development in all areas.",
      };

      expect(minimalResult.score).toBe(60);
      expect(minimalResult.strengths).toHaveLength(0);
      expect(minimalResult.areasForImprovement).toHaveLength(0);
      expect(minimalResult.nextSteps).toHaveLength(0);
      expect(minimalResult.overallAssessment).toContain("development");
    });
  });

  describe("EvaluateResponse interface", () => {
    it("should define successful evaluation response", () => {
      const successResponse: EvaluateResponse = {
        success: true,
        evaluation: {
          score: 88,
          feedback: "Excellent analysis with thoughtful considerations.",
          detailedScores: {
            relevance: 90,
            depth: 85,
            criticalThinking: 92,
            ethicalConsideration: 88,
            practicalApplication: 85,
          },
          strengths: [
            "Thorough stakeholder analysis",
            "Strong ethical framework application",
          ],
          areasForImprovement: ["Consider implementation challenges"],
          nextSteps: ["Explore real-world case studies"],
          overallAssessment:
            "Outstanding work demonstrating deep understanding.",
        },
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.evaluation).toBeDefined();
      expect(successResponse.evaluation?.score).toBe(88);
      expect(successResponse.evaluation?.strengths).toHaveLength(2);
      expect(successResponse.error).toBeUndefined();
    });

    it("should define error evaluation response", () => {
      const errorResponse: EvaluateResponse = {
        success: false,
        error: "Unable to evaluate: insufficient conversation data provided.",
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toContain("insufficient");
      expect(errorResponse.evaluation).toBeUndefined();
    });

    it("should handle successful response without evaluation", () => {
      const partialSuccessResponse: EvaluateResponse = {
        success: true,
      };

      expect(partialSuccessResponse.success).toBe(true);
      expect(partialSuccessResponse.evaluation).toBeUndefined();
      expect(partialSuccessResponse.error).toBeUndefined();
    });

    it("should handle response with both evaluation and error", () => {
      const mixedResponse: EvaluateResponse = {
        success: false,
        evaluation: {
          score: 0,
          feedback: "Evaluation failed",
          detailedScores: {
            relevance: 0,
            depth: 0,
            criticalThinking: 0,
            ethicalConsideration: 0,
            practicalApplication: 0,
          },
          strengths: [],
          areasForImprovement: ["Complete task properly"],
          nextSteps: ["Restart the task"],
          overallAssessment: "Task incomplete or invalid.",
        },
        error: "Evaluation completed with errors",
      };

      expect(mixedResponse.success).toBe(false);
      expect(mixedResponse.evaluation).toBeDefined();
      expect(mixedResponse.error).toContain("errors");
      expect(mixedResponse.evaluation?.score).toBe(0);
    });
  });

  describe("Type validation and edge cases", () => {
    it("should handle various conversation types", () => {
      const conversations: Conversation[] = [
        { type: "user", content: "Initial question" },
        { type: "assistant", content: "AI response" },
        { type: "user", content: "Follow-up question" },
        { type: "assistant", content: "Final response" },
      ];

      expect(conversations).toHaveLength(4);
      expect(conversations.filter((c) => c.type === "user")).toHaveLength(2);
      expect(conversations.filter((c) => c.type === "assistant")).toHaveLength(
        2,
      );
    });

    it("should validate score ranges in detailed scores", () => {
      const detailedScores = {
        relevance: 95, // High score
        depth: 45, // Low score
        criticalThinking: 100, // Maximum score
        ethicalConsideration: 0, // Minimum score
        practicalApplication: 72, // Average score
      };

      expect(detailedScores.relevance).toBeGreaterThan(90);
      expect(detailedScores.depth).toBeLessThan(50);
      expect(detailedScores.criticalThinking).toBe(100);
      expect(detailedScores.ethicalConsideration).toBe(0);
      expect(detailedScores.practicalApplication).toBeGreaterThan(70);
    });

    it("should handle multi-language evaluation contexts", () => {
      const multiLanguageRequest: EvaluateRequestBody = {
        conversations: [
          { type: "user", content: "English conversation" },
          { type: "assistant", content: "English response" },
        ],
        task: { id: "task-ml", title: "Multi-language Task" } as any,
        language: "es",
      };

      expect(multiLanguageRequest.language).toBe("es");
      expect(multiLanguageRequest.conversations[0].content).toContain(
        "English",
      );
    });
  });

  describe("Type exports validation", () => {
    it("should export all evaluation types", () => {
      // Type assertion tests to ensure all types are properly exported
      const evaluateRequestBody = {} as EvaluateRequestBody;
      const conversation = {} as Conversation;
      const evaluationResult = {} as EvaluationResult;
      const evaluateResponse = {} as EvaluateResponse;

      // If types are properly defined, these should not throw
      expect(evaluateRequestBody).toBeDefined();
      expect(conversation).toBeDefined();
      expect(evaluationResult).toBeDefined();
      expect(evaluateResponse).toBeDefined();
    });

    it("should validate type relationships", () => {
      // Test that types work together correctly
      const conversation: Conversation = { type: "user", content: "Test" };
      const evaluation: EvaluationResult = {
        score: 80,
        feedback: "Good",
        detailedScores: {
          relevance: 80,
          depth: 80,
          criticalThinking: 80,
          ethicalConsideration: 80,
          practicalApplication: 80,
        },
        strengths: [],
        areasForImprovement: [],
        nextSteps: [],
        overallAssessment: "Good work",
      };

      const request: EvaluateRequestBody = {
        conversations: [conversation],
        task: {} as any,
      };

      const response: EvaluateResponse = {
        success: true,
        evaluation,
      };

      expect(request.conversations).toContain(conversation);
      expect(response.evaluation).toBe(evaluation);
    });
  });
});
