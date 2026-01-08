/**
 * Unit tests for PostgreSQLTaskRepository
 * Tests task database operations
 */

import { Pool } from "pg";
import { PostgreSQLTaskRepository } from "../task-repository";
import type { DBTask, TaskStatus, TaskType } from "@/types/database";
import type { ITask, IInteraction } from "@/types/unified-learning";
import type { AttemptData } from "@/lib/repositories/interfaces";

// Mock pg Pool
jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    connect: jest.fn().mockImplementation(() => ({
      query: jest.fn(),
      release: jest.fn(),
    })),
    end: jest.fn(),
  })),
}));

describe("PostgreSQLTaskRepository", () => {
  let repository: PostgreSQLTaskRepository;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<any>;

  const mockInteraction: IInteraction = {
    timestamp: "2024-01-01T12:00:00.000Z",
    type: "user_input",
    content: "Hello AI mentor",
    metadata: { source: "chat" } as Record<string, unknown>,
  };

  const mockDBTask: DBTask = {
    id: "task-123",
    program_id: "program-456",
    scenario_id: "scenario-789", // Add required scenario_id
    mode: "pbl",
    task_index: 1,
    scenario_task_index: 2,
    title: "Problem Analysis",
    description: "Analyze the given problem",
    type: "analysis",
    status: "active",
    content: {
      instructions: "Read the case study and identify key issues",
      materials: ["case-study.pdf"],
    },
    interactions: [mockInteraction as unknown as Record<string, unknown>],
    interaction_count: 1,
    user_response: {
      analysis: "The main issue is ethical conflict",
      reasoning: "Based on the evidence provided",
    },
    score: 85,
    max_score: 100,
    allowed_attempts: 3,
    attempt_count: 1,
    time_limit_seconds: 3600,
    time_spent_seconds: 1800,
    ai_config: {
      mentor: { enabled: true, personality: "supportive" },
      evaluator: { enabled: true, criteria: ["accuracy", "reasoning"] },
    },
    created_at: "2024-01-01T00:00:00.000Z",
    started_at: "2024-01-01T10:00:00.000Z",
    completed_at: null,
    updated_at: "2024-01-01T12:00:00.000Z",
    pbl_data: {
      ksaCodes: ["K1", "S2", "A1"],
      mentorGuidance: "Guide the student through analytical thinking",
    },
    discovery_data: {},
    assessment_data: {},
    metadata: { difficulty: "intermediate", estimatedTime: 30 },
  };

  const expectedTask: ITask = {
    id: "task-123",
    programId: "program-456",
    scenarioId: "scenario-789", // Add required scenarioId to expected task
    mode: "pbl",
    taskIndex: 1,
    scenarioTaskIndex: 2,
    title: { en: "Problem Analysis" },
    description: { en: "Analyze the given problem" },
    type: "analysis",
    status: "active",
    content: {
      instructions: "Read the case study and identify key issues",
      materials: ["case-study.pdf"],
    },
    interactions: [mockInteraction],
    interactionCount: 1,
    userResponse: {
      analysis: "The main issue is ethical conflict",
      reasoning: "Based on the evidence provided",
    },
    score: 85,
    maxScore: 100,
    allowedAttempts: 3,
    attemptCount: 1,
    timeLimitSeconds: 3600,
    timeSpentSeconds: 1800,
    aiConfig: {
      mentor: { enabled: true, personality: "supportive" },
      evaluator: { enabled: true, criteria: ["accuracy", "reasoning"] },
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    startedAt: "2024-01-01T10:00:00.000Z",
    completedAt: undefined,
    updatedAt: "2024-01-01T12:00:00.000Z",
    pblData: {
      ksaCodes: ["K1", "S2", "A1"],
      mentorGuidance: "Guide the student through analytical thinking",
    },
    discoveryData: {},
    assessmentData: {},
    metadata: { difficulty: "intermediate", estimatedTime: 30 },
  };

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient),
      end: jest.fn(),
    } as any;

    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool);
    repository = new PostgreSQLTaskRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findById", () => {
    it("should find task by ID", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBTask],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.findById("task-123");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM tasks WHERE id = $1"),
        ["task-123"],
      );
      expect(result).toEqual(expectedTask);
    });

    it("should return null if task not found", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: "SELECT",
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await repository.findById("non-existent");

      expect(result).toBeNull();
    });

    it("should handle database errors", async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(repository.findById("task-123")).rejects.toThrow(
        "Database error",
      );
    });

    it("should handle title conversion from string to multilingual", async () => {
      const taskWithStringTitle = {
        ...mockDBTask,
        title: "String Title",
        description: null,
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [taskWithStringTitle],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.findById("task-123");

      expect(result!.title).toEqual({ en: "String Title" });
      expect(result!.description).toBeUndefined();
    });
  });

  describe("findByProgram", () => {
    it("should find tasks by program ID", async () => {
      const tasks = [
        mockDBTask,
        { ...mockDBTask, id: "task-456", task_index: 2 },
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: tasks,
        command: "SELECT",
        rowCount: 2,
        oid: 0,
        fields: [],
      });

      const result = await repository.findByProgram("program-456");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE program_id = $1"),
        ["program-456"],
      );
      expect(result).toHaveLength(2);
      expect(result[0].taskIndex).toBe(1);
      expect(result[1].taskIndex).toBe(2);
    });

    it("should order by task index ascending", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBTask],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.findByProgram("program-456");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY task_index ASC"),
        ["program-456"],
      );
    });

    it("should return empty array if no tasks found", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: "SELECT",
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await repository.findByProgram("program-with-no-tasks");

      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("should create a new task", async () => {
      const newTask: Omit<ITask, "id"> = {
        programId: "program-789",
        scenarioId: "scenario-999",
        mode: "assessment",
        taskIndex: 0,
        title: { en: "New Assessment Task", zh: "新評估任務" },
        type: "question",
        status: "pending",
        content: { question: "What is AI?" },
        interactions: [],
        interactionCount: 0,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 3,
        attemptCount: 0,
        timeSpentSeconds: 0,
        aiConfig: {},
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        pblData: {},
        discoveryData: {},
        assessmentData: { correctAnswer: "Artificial Intelligence" },
        metadata: {},
      };

      const createdTask = {
        ...mockDBTask,
        id: "new-task-id",
        program_id: "program-789",
        mode: "assessment",
        type: "question",
        status: "pending",
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [createdTask],
        command: "INSERT",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.create(newTask);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO tasks"),
        expect.arrayContaining([
          "program-789",
          "assessment",
          0,
          null, // scenario_task_index
          expect.any(Object), // title object
          expect.any(Object), // description object
          "question",
          "pending",
        ]),
      );
      expect(result.programId).toBe("program-789");
      expect(result.mode).toBe("assessment");
    });

    it("should use default values for optional fields", async () => {
      const minimalTask: Omit<ITask, "id"> = {
        programId: "program-456",
        scenarioId: "scenario-789",
        mode: "discovery",
        taskIndex: 0,
        type: "exploration",
        status: "pending",
        content: {},
        interactions: [],
        interactionCount: 0,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 3,
        attemptCount: 0,
        timeSpentSeconds: 0,
        aiConfig: {},
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {},
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockDBTask, mode: "discovery", type: "exploration" }],
        command: "INSERT",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.create(minimalTask);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO tasks"),
        expect.arrayContaining([
          "program-456",
          "discovery",
          0,
          null, // scenario_task_index
          null, // title
          null, // description
          "exploration",
          "pending", // default status
        ]),
      );
    });

    it("should handle create errors", async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(
        new Error("Insert failed"),
      );

      const task: Omit<ITask, "id"> = {
        programId: "program-456",
        scenarioId: "scenario-789",
        mode: "pbl",
        taskIndex: 0,
        type: "chat",
        status: "pending",
        content: {},
        interactions: [],
        interactionCount: 0,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 3,
        attemptCount: 0,
        timeSpentSeconds: 0,
        aiConfig: {},
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {},
      };

      await expect(repository.create(task)).rejects.toThrow("Insert failed");
    });
  });

  describe("createBatch", () => {
    it("should create multiple tasks in a transaction", async () => {
      const tasks: Omit<ITask, "id">[] = [
        {
          programId: "program-456",
          scenarioId: "scenario-789",
          mode: "pbl",
          taskIndex: 0,
          type: "chat",
          status: "pending",
          content: { instructions: "Chat task" },
          interactions: [],
          interactionCount: 0,
          userResponse: {},
          score: 0,
          maxScore: 100,
          allowedAttempts: 3,
          attemptCount: 0,
          timeSpentSeconds: 0,
          aiConfig: {},
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          pblData: {},
          discoveryData: {},
          assessmentData: {},
          metadata: {},
        },
        {
          programId: "program-456",
          scenarioId: "scenario-789",
          mode: "pbl",
          taskIndex: 1,
          type: "analysis",
          status: "pending",
          content: { instructions: "Analysis task" },
          interactions: [],
          interactionCount: 0,
          userResponse: {},
          score: 0,
          maxScore: 100,
          allowedAttempts: 3,
          attemptCount: 0,
          timeSpentSeconds: 0,
          aiConfig: {},
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          pblData: {},
          discoveryData: {},
          assessmentData: {},
          metadata: {},
        },
      ];

      const createdTasks = [
        { ...mockDBTask, id: "task-1", type: "chat" },
        { ...mockDBTask, id: "task-2", type: "analysis" },
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [], command: "BEGIN" })
        .mockResolvedValueOnce({ rows: [createdTasks[0]], command: "INSERT" })
        .mockResolvedValueOnce({ rows: [createdTasks[1]], command: "INSERT" })
        .mockResolvedValueOnce({ rows: [], command: "COMMIT" });

      const result = await repository.createBatch(tasks);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("chat");
      expect(result[1].type).toBe("analysis");
    });

    it("should rollback transaction on error", async () => {
      const tasks: Omit<ITask, "id">[] = [
        {
          programId: "program-456",
          scenarioId: "scenario-789",
          mode: "pbl",
          taskIndex: 0,
          type: "chat",
          status: "pending",
          content: {},
          interactions: [],
          interactionCount: 0,
          userResponse: {},
          score: 0,
          maxScore: 100,
          allowedAttempts: 3,
          attemptCount: 0,
          timeSpentSeconds: 0,
          aiConfig: {},
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          pblData: {},
          discoveryData: {},
          assessmentData: {},
          metadata: {},
        },
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [], command: "BEGIN" })
        .mockRejectedValueOnce(new Error("Insert failed"))
        .mockResolvedValueOnce({ rows: [], command: "ROLLBACK" });

      await expect(repository.createBatch(tasks)).rejects.toThrow(
        "Insert failed",
      );

      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update task with single field", async () => {
      const updates = {
        status: "completed" as TaskStatus,
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            ...mockDBTask,
            status: "completed",
            completed_at: new Date().toISOString(),
          },
        ],
        command: "UPDATE",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.update("task-123", updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE tasks"),
        expect.arrayContaining(["completed", "task-123"]),
      );
      expect(result.status).toBe("completed");
    });

    it("should update task with multiple fields", async () => {
      const updates = {
        score: 95,
        attemptCount: 2,
        timeSpentSeconds: 2400,
        userResponse: { answer: "Updated answer", confidence: "high" },
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            ...mockDBTask,
            score: 95,
            attempt_count: 2,
            time_spent_seconds: 2400,
            user_response: { answer: "Updated answer", confidence: "high" },
          },
        ],
        command: "UPDATE",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.update("task-123", updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE tasks"),
        expect.arrayContaining([
          95,
          2,
          2400,
          JSON.stringify({ answer: "Updated answer", confidence: "high" }),
          "task-123",
        ]),
      );
      expect(result.score).toBe(95);
      expect(result.attemptCount).toBe(2);
    });

    it("should update mode-specific data", async () => {
      const updates = {
        pblData: { ksaCodes: ["K2", "S1"], feedback: "Good progress" },
        aiConfig: { mentor: { enabled: false } },
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ ...mockDBTask, ...updates }],
        command: "UPDATE",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.update("task-123", updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("pbl_data = $2"),
        expect.arrayContaining([
          JSON.stringify({ mentor: { enabled: false } }),
          JSON.stringify({ ksaCodes: ["K2", "S1"], feedback: "Good progress" }),
          "task-123",
        ]),
      );
    });

    it("should handle empty updates", async () => {
      const updates = {};

      await expect(repository.update("task-123", updates)).rejects.toThrow(
        "No fields to update",
      );
    });

    it("should handle update when task not found", async () => {
      const updates = { status: "completed" as TaskStatus };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: "UPDATE",
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      await expect(repository.update("non-existent", updates)).rejects.toThrow(
        "Task not found",
      );
    });

    it("should set started_at when status becomes active", async () => {
      const updates = { status: "active" as TaskStatus };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            ...mockDBTask,
            status: "active",
            started_at: "2024-01-02T00:00:00.000Z",
          },
        ],
        command: "UPDATE",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.update("task-123", updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "started_at = COALESCE(started_at, CURRENT_TIMESTAMP)",
        ),
        expect.arrayContaining(["active", "task-123"]),
      );
    });

    it("should set completed_at when status becomes completed", async () => {
      const updates = { status: "completed" as TaskStatus };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            ...mockDBTask,
            status: "completed",
            completed_at: "2024-01-02T00:00:00.000Z",
          },
        ],
        command: "UPDATE",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.update("task-123", updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("completed_at = CURRENT_TIMESTAMP"),
        expect.arrayContaining(["completed", "task-123"]),
      );
    });
  });

  describe("updateInteractions", () => {
    it("should update task interactions", async () => {
      const newInteractions: IInteraction[] = [
        mockInteraction,
        {
          timestamp: "2024-01-01T13:00:00.000Z",
          type: "ai_response",
          content: "Good analysis! Consider these additional factors...",
          metadata: { source: "mentor" },
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            ...mockDBTask,
            interactions: newInteractions,
          },
        ],
        command: "UPDATE",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.updateInteractions(
        "task-123",
        newInteractions,
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE tasks"),
        expect.arrayContaining([JSON.stringify(newInteractions), "task-123"]),
      );
      expect(result.interactions).toHaveLength(2);
    });

    it("should handle update interactions when task not found", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: "UPDATE",
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      await expect(
        repository.updateInteractions("non-existent", []),
      ).rejects.toThrow("Task not found");
    });
  });

  describe("complete", () => {
    it("should mark task as completed", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            ...mockDBTask,
            status: "completed",
            completed_at: "2024-01-02T00:00:00.000Z",
          },
        ],
        command: "UPDATE",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.complete("task-123");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'completed'"),
        ["task-123"],
      );
      expect(result.status).toBe("completed");
    });

    it("should handle complete when task not found", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: "UPDATE",
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      await expect(repository.complete("non-existent")).rejects.toThrow(
        "Task not found",
      );
    });
  });

  describe("updateStatus", () => {
    it("should update status to active and set started_at", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: "UPDATE",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.updateStatus("task-123", "active");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "started_at = COALESCE(started_at, CURRENT_TIMESTAMP)",
        ),
        ["active", "task-123"],
      );
    });

    it("should update status to completed and set completed_at", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: "UPDATE",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.updateStatus("task-123", "completed");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("completed_at = CURRENT_TIMESTAMP"),
        ["completed", "task-123"],
      );
    });

    it("should update status to pending without additional timestamps", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: "UPDATE",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.updateStatus("task-123", "pending");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE tasks"),
        ["pending", "task-123"],
      );
    });
  });

  describe("addInteraction", () => {
    it("should add interaction to existing task", async () => {
      const newInteraction: IInteraction = {
        timestamp: "2024-01-01T14:00:00.000Z",
        type: "system_event",
        content: "Task auto-saved",
        metadata: { auto: true },
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ interactions: [mockInteraction] }],
          command: "SELECT",
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [],
          command: "UPDATE",
          rowCount: 1,
        });

      await repository.addInteraction("task-123", newInteraction);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("SELECT interactions FROM tasks WHERE id = $1"),
        ["task-123"],
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("UPDATE tasks"),
        expect.arrayContaining([
          JSON.stringify([mockInteraction, newInteraction]),
          "task-123",
        ]),
      );
    });

    it("should handle add interaction when task not found", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: "SELECT",
        rowCount: 0,
      });

      const newInteraction: IInteraction = {
        timestamp: "2024-01-01T14:00:00.000Z",
        type: "user_input",
        content: "Test interaction",
      };

      await expect(
        repository.addInteraction("non-existent", newInteraction),
      ).rejects.toThrow("Task not found");
    });
  });

  describe("recordAttempt", () => {
    it("should record attempt with score and response", async () => {
      const attemptData: AttemptData = {
        score: 90,
        response: { answer: "Final answer", reasoning: "Based on analysis" },
        timeSpent: 1200,
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: "UPDATE",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.recordAttempt("task-123", attemptData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("attempt_count = attempt_count + 1"),
        expect.arrayContaining([
          90,
          JSON.stringify({
            answer: "Final answer",
            reasoning: "Based on analysis",
          }),
          1200,
          "task-123",
        ]),
      );
    });

    it("should use GREATEST to keep highest score", async () => {
      const attemptData: AttemptData = {
        score: 75,
        response: { answer: "Another attempt" },
        timeSpent: 900,
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: "UPDATE",
        rowCount: 1,
      });

      await repository.recordAttempt("task-123", attemptData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("score = GREATEST(score, $1)"),
        expect.arrayContaining([75]),
      );
    });

    it("should handle attempt without score", async () => {
      const attemptData: AttemptData = {
        response: { answer: "Incomplete answer" },
        timeSpent: 600,
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: "UPDATE",
        rowCount: 1,
      });

      await repository.recordAttempt("task-123", attemptData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("score = GREATEST(score, $1)"),
        expect.arrayContaining([0]), // Default score
      );
    });
  });

  describe("updateTimeSpent", () => {
    it("should update time spent for task", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: "UPDATE",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.updateTimeSpent("task-123", 300);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("time_spent_seconds = time_spent_seconds + $1"),
        [300, "task-123"],
      );
    });

    it("should handle negative time values", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: "UPDATE",
        rowCount: 1,
      });

      await repository.updateTimeSpent("task-123", -100);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("time_spent_seconds = time_spent_seconds + $1"),
        [-100, "task-123"],
      );
    });
  });

  describe("getCurrentTask", () => {
    it("should get current active task for program", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBTask],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.getCurrentTask("program-456");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("JOIN programs p ON t.program_id = p.id"),
        ["program-456"],
      );
      expect(result).toEqual(expectedTask);
    });

    it("should return null if no current task", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: "SELECT",
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await repository.getCurrentTask("program-789");

      expect(result).toBeNull();
    });
  });

  describe("findByType", () => {
    it("should find tasks by type", async () => {
      const chatTasks = [
        { ...mockDBTask, type: "chat", id: "task-1" },
        { ...mockDBTask, type: "chat", id: "task-2" },
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: chatTasks,
        command: "SELECT",
        rowCount: 2,
        oid: 0,
        fields: [],
      });

      const result = await repository.findByType("chat");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE type = $1"),
        ["chat"],
      );
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("chat");
      expect(result[1].type).toBe("chat");
    });

    it("should find tasks by type and program", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBTask],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.findByType("analysis", "program-456");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("type = $1"),
        ["analysis", "program-456"],
      );
    });

    it("should order by task index", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: "SELECT",
        rowCount: 0,
      });

      await repository.findByType("question");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY task_index ASC"),
        ["question"],
      );
    });
  });

  describe("findByStatus", () => {
    it("should find tasks by status", async () => {
      const activeTasks = [
        { ...mockDBTask, status: "active", id: "task-1" },
        { ...mockDBTask, status: "active", id: "task-2" },
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: activeTasks,
        command: "SELECT",
        rowCount: 2,
        oid: 0,
        fields: [],
      });

      const result = await repository.findByStatus("active");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE status = $1"),
        ["active"],
      );
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("active");
      expect(result[1].status).toBe("active");
    });

    it("should find tasks by status and program", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBTask],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.findByStatus("completed", "program-456");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = $1"),
        ["completed", "program-456"],
      );
    });
  });

  describe("getTaskWithInteractions", () => {
    it("should get task with interactions (same as findById)", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDBTask],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.getTaskWithInteractions("task-123");

      expect(result).toEqual(expectedTask);
      expect(result!.interactions).toEqual([mockInteraction]);
    });
  });

  describe("Data conversion edge cases", () => {
    it("should handle tasks with null optional fields", async () => {
      const dbTaskWithNulls = {
        ...mockDBTask,
        title: null,
        description: null,
        scenario_task_index: null,
        started_at: null,
        completed_at: null,
        time_limit_seconds: null,
        user_response: null,
        ai_config: null,
        pbl_data: null,
        discovery_data: null,
        assessment_data: null,
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [dbTaskWithNulls],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.findById("task-123");

      expect(result).toBeDefined();
      expect(result!.title).toBeUndefined();
      expect(result!.description).toBeUndefined();
      expect(result!.scenarioTaskIndex).toBeUndefined();
      expect(result!.startedAt).toBeUndefined();
      expect(result!.completedAt).toBeUndefined();
      expect(result!.timeLimitSeconds).toBeUndefined();
    });

    it("should convert JSON string title to multilingual object", async () => {
      const dbTaskWithJsonTitle = {
        ...mockDBTask,
        title: { en: "JSON Title", zh: "JSON標題" },
        description: { en: "JSON Description" },
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [dbTaskWithJsonTitle],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.findById("task-123");

      expect(result!.title).toEqual({ en: "JSON Title", zh: "JSON標題" });
      expect(result!.description).toEqual({ en: "JSON Description" });
    });

    it("should handle complex nested data structures", async () => {
      const complexTask = {
        ...mockDBTask,
        content: {
          instructions: "Complex instructions",
          materials: [
            { type: "document", url: "/doc1.pdf", metadata: { pages: 10 } },
            { type: "video", url: "/video1.mp4", metadata: { duration: 300 } },
          ],
          rubric: {
            criteria: [
              {
                name: "Accuracy",
                weight: 0.4,
                description: "Correctness of answer",
              },
              {
                name: "Reasoning",
                weight: 0.6,
                description: "Quality of reasoning",
              },
            ],
          },
        },
        ai_config: {
          mentor: {
            enabled: true,
            personality: "encouraging",
            guidelines: ["Be supportive", "Ask probing questions"],
            triggers: {
              struggle: "Provide hints",
              success: "Celebrate achievement",
            },
          },
          evaluator: {
            enabled: true,
            criteria: ["accuracy", "reasoning", "creativity"],
            weights: { accuracy: 0.4, reasoning: 0.4, creativity: 0.2 },
          },
        },
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [complexTask],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.findById("task-123");

      expect(result!.content).toEqual(complexTask.content);
      expect(result!.aiConfig).toEqual(complexTask.ai_config);
    });
  });

  describe("Error handling and edge cases", () => {
    it("should handle database connection errors gracefully", async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(
        new Error("Connection refused"),
      );

      await expect(repository.findByProgram("program-456")).rejects.toThrow(
        "Connection refused",
      );
    });

    it("should handle invalid JSON in database gracefully", async () => {
      const taskWithInvalidJson = {
        ...mockDBTask,
        content: "invalid json string",
        interactions: "not an array",
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [taskWithInvalidJson],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // The actual behavior depends on how PostgreSQL handles invalid JSON
      // This test documents the expected behavior
      const result = await repository.findById("task-123");
      expect(result).toBeDefined();
    });

    it("should handle tasks with different modes correctly", async () => {
      const pblTask = { ...mockDBTask, mode: "pbl", id: "task-pbl" };
      const assessmentTask = {
        ...mockDBTask,
        mode: "assessment",
        id: "task-assess",
        type: "question",
      };
      const discoveryTask = {
        ...mockDBTask,
        mode: "discovery",
        id: "task-discover",
        type: "exploration",
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [pblTask, assessmentTask, discoveryTask],
        command: "SELECT",
        rowCount: 3,
        oid: 0,
        fields: [],
      });

      const result = await repository.findByProgram("program-456");

      expect(result).toHaveLength(3);
      expect(result[0].mode).toBe("pbl");
      expect(result[1].mode).toBe("assessment");
      expect(result[1].type).toBe("question");
      expect(result[2].mode).toBe("discovery");
      expect(result[2].type).toBe("exploration");
    });
  });
});
