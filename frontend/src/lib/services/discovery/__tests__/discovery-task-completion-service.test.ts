import { DiscoveryTaskCompletionService } from "../discovery-task-completion-service";
import { FeedbackGenerationService } from "../feedback-generation-service";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import { ITask, IInteraction } from "@/types/unified-learning";

// Helper to create test task
const createTestTask = (
  overrides: Partial<ITask> & { interactions?: IInteraction[] } = {},
): ITask & { interactions: IInteraction[] } => {
  const base = {
    id: "task-1",
    programId: "prog-1",
    status: "active",
    type: "interactive",
    title: { en: "Test Task" },
    content: {},
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    mode: "discovery",
    taskIndex: 0,
    interactions: [],
    interactionCount: 0,
    ...overrides,
  };
  return base as unknown as ITask & { interactions: IInteraction[] };
};

// Mock dependencies
jest.mock("../feedback-generation-service");
jest.mock("@/lib/repositories/base/repository-factory", () => ({
  repositoryFactory: {
    getEvaluationRepository: jest.fn(),
    getTaskRepository: jest.fn(),
  },
}));

describe("DiscoveryTaskCompletionService", () => {
  let mockEvaluationRepo: {
    create: jest.Mock;
  };

  let mockTaskRepo: {
    update: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockEvaluationRepo = {
      create: jest.fn(),
    };

    mockTaskRepo = {
      update: jest.fn(),
    };

    (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(
      mockEvaluationRepo,
    );
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(
      mockTaskRepo,
    );
  });

  describe("hasTaskPassed", () => {
    it("should return true when task has passing interaction", () => {
      const task = createTestTask({
        interactions: [
          { timestamp: "2024-01-01", type: "user_input", content: "response" },
          {
            timestamp: "2024-01-01",
            type: "ai_response",
            content: { completed: true },
          },
        ],
      });

      const result = DiscoveryTaskCompletionService.hasTaskPassed(task);
      expect(result).toBe(true);
    });

    it("should return false when no passing interaction exists", () => {
      const task = createTestTask({
        interactions: [
          { timestamp: "2024-01-01", type: "user_input", content: "response" },
          {
            timestamp: "2024-01-01",
            type: "ai_response",
            content: { completed: false },
          },
        ],
      });

      const result = DiscoveryTaskCompletionService.hasTaskPassed(task);
      expect(result).toBe(false);
    });

    it("should return false when interactions are empty", () => {
      const task = createTestTask({ interactions: [] });

      const result = DiscoveryTaskCompletionService.hasTaskPassed(task);
      expect(result).toBe(false);
    });
  });

  describe("completeTaskWithEvaluation", () => {
    it("should create evaluation and update task on successful completion", async () => {
      const task = createTestTask({
        metadata: {},
        interactions: [
          {
            timestamp: "2024-01-01",
            type: "user_input",
            content: "response 1",
          },
          {
            timestamp: "2024-01-01",
            type: "ai_response",
            content: { completed: true, xpEarned: 80 },
            metadata: { skillsImproved: ["skill1"] },
          },
          {
            timestamp: "2024-01-01",
            type: "user_input",
            content: "response 2",
          },
          {
            timestamp: "2024-01-01",
            type: "ai_response",
            content: { completed: false, xpEarned: 50 },
          },
        ],
      });

      const program = {
        scenarioId: "scenario-1",
        metadata: { language: "en" },
      };

      const userId = "user-1";
      const userLanguage = "en";
      const careerType = "software_engineer";

      const mockEvaluation = {
        id: "eval-1",
        score: 80,
        feedbackText: "Great job!",
        createdAt: "2024-01-01T12:00:00Z",
      };

      (
        FeedbackGenerationService.generateComprehensiveFeedback as jest.Mock
      ).mockResolvedValue({
        feedback: "Great job on all tasks!",
        bestXP: 80,
        passedAttempts: 1,
      });

      mockEvaluationRepo.create.mockResolvedValue(mockEvaluation);
      mockTaskRepo.update.mockResolvedValue(undefined);

      const result =
        await DiscoveryTaskCompletionService.completeTaskWithEvaluation(
          task,
          program,
          userId,
          userLanguage,
          careerType,
        );

      expect(result.evaluation).toEqual(mockEvaluation);
      expect(result.xpEarned).toBe(80);
      expect(result.feedback).toBe("Great job on all tasks!");

      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          programId: "prog-1",
          taskId: "task-1",
          mode: "discovery",
          evaluationType: "task",
          evaluationSubtype: "discovery_task",
          score: 80,
          maxScore: 100,
        }),
      );

      expect(mockTaskRepo.update).toHaveBeenCalledWith("task-1", {
        status: "completed",
        completedAt: expect.any(String),
        metadata: expect.objectContaining({
          evaluation: expect.objectContaining({
            id: "eval-1",
            score: 80,
            actualXP: 80,
          }),
        }),
      });
    });

    it("should use fallback feedback on error", async () => {
      const task = createTestTask({
        interactions: [
          {
            timestamp: "2024-01-01",
            type: "ai_response",
            content: { completed: true, xpEarned: 100 },
          },
        ],
      });

      (
        FeedbackGenerationService.generateComprehensiveFeedback as jest.Mock
      ).mockRejectedValue(new Error("AI service error"));
      (
        FeedbackGenerationService.getFallbackMessage as jest.Mock
      ).mockReturnValue("Task completed successfully!");

      mockEvaluationRepo.create.mockResolvedValue({
        id: "eval-1",
        score: 100,
        feedbackText: "Task completed successfully!",
        createdAt: "2024-01-01T12:00:00Z",
      });

      const result =
        await DiscoveryTaskCompletionService.completeTaskWithEvaluation(
          task,
          { scenarioId: "scenario-1", metadata: {} },
          "user-1",
          "en",
          "general",
        );

      expect(result.feedback).toBe("Task completed successfully!");
      expect(FeedbackGenerationService.getFallbackMessage).toHaveBeenCalledWith(
        "en",
      );
    });
  });

  describe("extractSkillsImproved", () => {
    it("should extract unique skills from interactions", () => {
      const task = createTestTask({
        interactions: [
          {
            timestamp: "2024-01-01",
            type: "ai_response",
            content: { skillsImproved: ["coding", "debugging"] },
          },
          {
            timestamp: "2024-01-01",
            type: "ai_response",
            content: { skillsImproved: ["debugging", "testing"] },
          },
          { timestamp: "2024-01-01", type: "user_input", content: "test" },
        ],
      });

      const skills = DiscoveryTaskCompletionService.extractSkillsImproved(task);

      expect(skills).toEqual(["coding", "debugging", "testing"]);
    });

    it("should handle empty interactions", () => {
      const task = createTestTask({
        interactions: [],
      });

      const skills = DiscoveryTaskCompletionService.extractSkillsImproved(task);
      expect(skills).toEqual([]);
    });
  });

  describe("findBestXPEarned", () => {
    it("should find maximum XP from passed attempts", () => {
      const task = createTestTask({
        interactions: [
          {
            timestamp: "2024-01-01",
            type: "ai_response",
            content: { completed: true, xpEarned: 60 },
          },
          {
            timestamp: "2024-01-01",
            type: "ai_response",
            content: { completed: true, xpEarned: 85 },
          },
          {
            timestamp: "2024-01-01",
            type: "ai_response",
            content: { completed: false, xpEarned: 95 },
          }, // Not passed, shouldn't count
          {
            timestamp: "2024-01-01",
            type: "ai_response",
            content: { completed: true, xpEarned: 70 },
          },
        ],
      });

      const bestXP = DiscoveryTaskCompletionService.findBestXPEarned(task);
      expect(bestXP).toBe(85);
    });

    it("should return default 100 when no passed attempts", () => {
      const task = createTestTask({
        interactions: [
          {
            timestamp: "2024-01-01",
            type: "ai_response",
            content: { completed: false, xpEarned: 50 },
          },
        ],
      });

      const bestXP = DiscoveryTaskCompletionService.findBestXPEarned(task);
      expect(bestXP).toBe(100);
    });
  });

  describe("countPassedAttempts", () => {
    it("should count number of passed attempts", () => {
      const task = createTestTask({
        interactions: [
          {
            timestamp: "2024-01-01",
            type: "ai_response",
            content: { completed: true },
          },
          {
            timestamp: "2024-01-01",
            type: "ai_response",
            content: { completed: false },
          },
          {
            timestamp: "2024-01-01",
            type: "ai_response",
            content: { completed: true },
          },
        ],
      });

      const count = DiscoveryTaskCompletionService.countPassedAttempts(task);
      expect(count).toBe(2);
    });
  });
});
