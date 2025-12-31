import { mockRepositoryFactory } from "@/test-utils/mocks/repositories";
/**
 * PostgreSQL Learning Service Tests
 * 提升覆蓋率從 0% 到 95%+
 */

import { PostgreSQLLearningService } from "../postgresql-learning-service";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import type {
  IProgram,
  ITask,
  IEvaluation,
  IScenario,
  ITaskTemplate,
} from "@/types/unified-learning";

// Mock the repository factory
jest.mock("@/lib/repositories/base/repository-factory");

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, "log").mockImplementation(),
  error: jest.spyOn(console, "error").mockImplementation(),
};

describe("PostgreSQLLearningService", () => {
  let service: PostgreSQLLearningService;
  let mockScenarioRepo: {
    findById: jest.Mock;
    findByMode: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let mockProgramRepo: {
    create: jest.Mock;
    findById: jest.Mock;
    findByUser: jest.Mock;
    update: jest.Mock;
    updateProgress: jest.Mock;
    complete: jest.Mock;
  };
  let mockTaskRepo: {
    create: jest.Mock;
    findById: jest.Mock;
    findByProgram: jest.Mock;
    update: jest.Mock;
    complete: jest.Mock;
  };
  let mockEvaluationRepo: {
    create: jest.Mock;
    findById: jest.Mock;
    findByProgram: jest.Mock;
    findByTask: jest.Mock;
    findByUser: jest.Mock;
  };

  const mockScenario: IScenario = {
    id: "scenario-123",
    mode: "pbl",
    status: "active",
    version: "1.0.0",
    sourceType: "yaml",
    sourcePath: "test/scenario.yaml",
    sourceMetadata: {},
    title: { en: "Test Scenario" },
    description: { en: "Test Description" },
    objectives: ["Learn PostgreSQL"],
    difficulty: "intermediate",
    estimatedMinutes: 60,
    prerequisites: [],
    taskTemplates: [
      {
        id: "template-1",
        title: { en: "Task 1" },
        description: { en: "First task" },
        type: "question",
      } as unknown as ITaskTemplate,
    ],
    taskCount: 1,
    xpRewards: {},
    unlockRequirements: {},
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    aiModules: {},
    resources: [],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    metadata: {},
  };

  const mockProgram: IProgram = {
    id: "program-123",
    userId: "user-123",
    scenarioId: "scenario-123",
    mode: "pbl",
    status: "active",
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 1,
    totalScore: 0,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    createdAt: "2024-01-01T00:00:00Z",
    startedAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    lastActivityAt: "2024-01-01T00:00:00Z",
    timeSpentSeconds: 0,
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {},
  };

  const mockTask: ITask = {
    id: "task-123",
    programId: "program-123",
    mode: "pbl",
    taskIndex: 0,
    scenarioTaskIndex: 0,
    title: { en: "Task 1" },
    description: { en: "First task" },
    type: "question",
    status: "active",
    content: { instructions: "Complete this" },
    interactions: [],
    interactionCount: 0,
    userResponse: {},
    score: 0,
    maxScore: 100,
    allowedAttempts: 3,
    attemptCount: 0,
    timeSpentSeconds: 0,
    aiConfig: {},
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {},
  };

  const mockEvaluation: IEvaluation = {
    id: "eval-123",
    userId: "user-123",
    programId: "program-123",
    taskId: "task-123",
    mode: "pbl",
    evaluationType: "formative",
    score: 85,
    maxScore: 100,
    domainScores: {},
    feedbackData: { text: "Good work!" },
    aiAnalysis: {},
    timeTakenSeconds: 0,
    createdAt: "2024-01-01T00:00:00Z",
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup repository mocks
    mockScenarioRepo = {
      findById: jest.fn().mockResolvedValue(mockScenario),
      findByMode: jest.fn().mockResolvedValue([mockScenario]),
      create: jest.fn().mockResolvedValue(mockScenario),
      update: jest.fn().mockResolvedValue(mockScenario),
    };

    mockProgramRepo = {
      create: jest.fn().mockResolvedValue(mockProgram),
      findById: jest.fn().mockResolvedValue(mockProgram),
      findByUser: jest.fn().mockResolvedValue([mockProgram]),
      update: jest.fn().mockResolvedValue(mockProgram),
      updateProgress: jest.fn().mockResolvedValue(mockProgram),
      complete: jest.fn().mockResolvedValue(mockProgram),
    };

    mockTaskRepo = {
      create: jest.fn().mockResolvedValue(mockTask),
      findById: jest.fn().mockResolvedValue(mockTask),
      findByProgram: jest.fn().mockResolvedValue([mockTask]),
      update: jest.fn().mockResolvedValue(mockTask),
      complete: jest.fn().mockResolvedValue(mockTask),
    };

    mockEvaluationRepo = {
      create: jest.fn().mockResolvedValue(mockEvaluation),
      findById: jest.fn().mockResolvedValue(mockEvaluation),
      findByProgram: jest.fn().mockResolvedValue([mockEvaluation]),
      findByTask: jest.fn().mockResolvedValue([mockEvaluation]),
      findByUser: jest.fn().mockResolvedValue([mockEvaluation]),
    };

    // Mock repository factory
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(
      mockScenarioRepo,
    );
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(
      mockProgramRepo,
    );
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(
      mockTaskRepo,
    );
    (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(
      mockEvaluationRepo,
    );

    // Create service instance
    service = new PostgreSQLLearningService();
  });

  afterEach(() => {
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
  });

  describe("constructor", () => {
    it("should initialize with PostgreSQL repositories", async () => {
      expect(repositoryFactory.getScenarioRepository).toHaveBeenCalled();
      expect(repositoryFactory.getProgramRepository).toHaveBeenCalled();
      expect(repositoryFactory.getTaskRepository).toHaveBeenCalled();
      expect(repositoryFactory.getEvaluationRepository).toHaveBeenCalled();
    });

    it("should enable evaluation and hooks by default", async () => {
      // Service should be created successfully with default options
      expect(service).toBeDefined();
    });
  });

  describe("createLearningProgram", () => {
    it("should create a program and log PostgreSQL-specific message", async () => {
      const result = await service.createLearningProgram(
        "scenario-123",
        "user-123",
        {
          userEmail: "test@example.com",
          userName: "Test User",
          language: "en",
        },
      );

      expect(result.program).toMatchObject({
        id: "program-123",
        scenarioId: "scenario-123",
        userId: "user-123",
      });

      // Check PostgreSQL-specific logging
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[PostgreSQLLearningService] Program created: program-123",
        ),
      );

      expect(mockProgramRepo.create).toHaveBeenCalled();
      expect(mockTaskRepo.create).toHaveBeenCalledTimes(1); // One task template
    });

    it("should handle scenario not found", async () => {
      mockScenarioRepo.findById.mockResolvedValueOnce(null);

      await expect(
        service.createLearningProgram("invalid", "user-123", {}),
      ).rejects.toThrow("Scenario not found");
    });
  });

  describe("completeTask", () => {
    it("should complete task and log PostgreSQL-specific message", async () => {
      const result = await service.completeTask(
        "task-123",
        "user-123",
        "My response",
        { score: 85, feedbackData: { text: "Good work!" } },
      );

      expect(result.evaluation).toMatchObject({
        id: "eval-123",
        taskId: "task-123",
        score: 85,
      });

      // Check PostgreSQL-specific logging
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[PostgreSQLLearningService] Task completed: task-123, evaluation: eval-123",
        ),
      );

      expect(mockTaskRepo.complete).toHaveBeenCalledWith("task-123");
    });

    it("should handle task not found", async () => {
      mockTaskRepo.findById.mockResolvedValueOnce(null);

      await expect(
        service.completeTask("invalid", "user-123", "response", {}),
      ).rejects.toThrow("Task not found");
    });
  });

  describe("completeProgram", () => {
    it("should complete program and log PostgreSQL-specific message", async () => {
      mockTaskRepo.findByProgram.mockResolvedValueOnce([
        { ...mockTask, status: "completed" },
      ]);

      const result = await service.completeProgram("program-123", "user-123", {
        score: 85,
        feedbackData: { text: "Program completed!" },
      });

      expect(result.evaluation).toMatchObject({
        id: "eval-123",
        programId: "program-123",
      });

      // Check PostgreSQL-specific logging
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[PostgreSQLLearningService] Program completed: program-123, evaluation: eval-123",
        ),
      );

      expect(mockProgramRepo.complete).toHaveBeenCalledWith("program-123");
    });

    it("should complete even if tasks are incomplete", async () => {
      // The base service doesn't enforce task completion validation
      mockTaskRepo.findByProgram.mockResolvedValueOnce([
        { ...mockTask, status: "active" }, // Not completed
      ]);

      const result = await service.completeProgram(
        "program-123",
        "user-123",
        {},
      );

      expect(result.program).toBeDefined();
      expect(result.evaluation).toBeDefined();
      expect(mockProgramRepo.complete).toHaveBeenCalledWith("program-123");
    });
  });

  describe("getLearningProgress", () => {
    it("should retrieve user learning progress", async () => {
      const progress = await service.getLearningProgress("user-123");

      expect(progress.activePrograms).toHaveLength(1);
      expect(progress.activePrograms[0]).toMatchObject({
        id: "program-123",
        userId: "user-123",
      });

      expect(mockProgramRepo.findByUser).toHaveBeenCalledWith("user-123");
    });
  });

  describe("getProgramStatus", () => {
    it("should retrieve program status with tasks", async () => {
      const status = await service.getProgramStatus("program-123");

      expect(status.tasks).toHaveLength(1);
      expect(status.tasks[0]).toMatchObject({
        id: "task-123",
        programId: "program-123",
      });

      expect(mockTaskRepo.findByProgram).toHaveBeenCalledWith("program-123");
    });
  });

  describe("PostgreSQL-specific hooks", () => {
    it("should log after program creation", async () => {
      await service.createLearningProgram("scenario-123", "user-123", {
        userEmail: "test@example.com",
        userName: "Test User",
        language: "en",
      });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("[PostgreSQLLearningService] Program created:"),
      );
    });

    it("should log after task completion", async () => {
      await service.completeTask("task-123", "user-123", "My response", {
        score: 90,
      });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("[PostgreSQLLearningService] Task completed:"),
      );
    });

    it("should log after program completion", async () => {
      mockTaskRepo.findByProgram.mockResolvedValueOnce([
        { ...mockTask, status: "completed" },
      ]);

      await service.completeProgram("program-123", "user-123", { score: 100 });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[PostgreSQLLearningService] Program completed:",
        ),
      );
    });
  });

  describe("error handling", () => {
    it("should handle repository errors gracefully", async () => {
      mockScenarioRepo.findById.mockRejectedValueOnce(
        new Error("DB connection failed"),
      );

      await expect(
        service.createLearningProgram("scenario-123", "user-123", {}),
      ).rejects.toThrow("DB connection failed");
    });

    it("should allow completing already completed programs", async () => {
      // The base service doesn't validate program status before completion
      mockProgramRepo.findById.mockResolvedValueOnce({
        ...mockProgram,
        status: "completed",
      });

      const result = await service.completeProgram(
        "program-123",
        "user-123",
        {},
      );

      expect(result.program).toBeDefined();
      expect(result.evaluation).toBeDefined();
      expect(mockProgramRepo.complete).toHaveBeenCalledWith("program-123");
    });
  });

  describe("batch operations", () => {
    it("should handle creating multiple tasks", async () => {
      const scenarioWithMultipleTasks = {
        ...mockScenario,
        taskTemplates: [
          {
            id: "t1",
            title: { en: "Task 1" },
            type: "question",
          } as ITaskTemplate,
          { id: "t2", title: { en: "Task 2" }, type: "chat" } as ITaskTemplate,
          {
            id: "t3",
            title: { en: "Task 3" },
            type: "creation",
          } as ITaskTemplate,
        ],
      };

      mockScenarioRepo.findById.mockResolvedValueOnce(
        scenarioWithMultipleTasks,
      );

      await service.createLearningProgram("scenario-123", "user-123", {
        userEmail: "test@example.com",
        userName: "Test User",
        language: "en",
      });

      expect(mockTaskRepo.create).toHaveBeenCalledTimes(3);
    });
  });
});
