/**
 * PBL Evaluations API Tests
 * Tests for GET /api/pbl/evaluations
 */

import { NextRequest } from "next/server";
import { GET } from "../route";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import type { IEvaluation } from "@/types/unified-learning";
import { mockConsoleError as createMockConsoleError } from "@/test-utils/helpers/console";

// Mock dependencies
jest.mock("@/lib/repositories/base/repository-factory");

const mockRepositoryFactory = repositoryFactory as jest.Mocked<
  typeof repositoryFactory
>;

// Mock console methods
const mockConsoleError = createMockConsoleError();
const consoleSpy = {
  log: jest.spyOn(console, "log").mockImplementation(),
};

describe("GET /api/pbl/evaluations", () => {
  let mockEvaluationRepo: {
    findByTask: jest.Mock;
    findByProgram: jest.Mock;
  };

  const mockEvaluations: IEvaluation[] = [
    {
      id: "eval-1",
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
      timeTakenSeconds: 300,
      createdAt: "2024-01-01T00:00:00Z",
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: { targetType: "task" },
    },
    {
      id: "eval-2",
      userId: "user-123",
      programId: "program-123",
      taskId: "task-124",
      mode: "pbl",
      evaluationType: "summative",
      score: 90,
      maxScore: 100,
      domainScores: {},
      feedbackData: { text: "Excellent!" },
      aiAnalysis: {},
      timeTakenSeconds: 600,
      createdAt: "2024-01-01T01:00:00Z",
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: { targetType: "task" },
    },
    {
      id: "eval-3",
      userId: "user-123",
      programId: "program-123",
      mode: "pbl",
      evaluationType: "summative",
      score: 88,
      maxScore: 100,
      domainScores: {},
      feedbackData: { text: "Program completed!" },
      aiAnalysis: {},
      timeTakenSeconds: 1800,
      createdAt: "2024-01-01T02:00:00Z",
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: { targetType: "program" },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup repository mock
    mockEvaluationRepo = {
      findByTask: jest.fn().mockResolvedValue([mockEvaluations[0]]),
      findByProgram: jest.fn().mockResolvedValue(mockEvaluations),
    };

    mockRepositoryFactory.getEvaluationRepository.mockReturnValue(
      mockEvaluationRepo as any,
    );
  });

  afterEach(() => {
    consoleSpy.log.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    consoleSpy.log.mockRestore();
  });

  function createRequest(
    params: Record<string, string> = {},
    userEmail?: string,
  ) {
    const url = new URL("http://localhost:3000/api/pbl/evaluations");
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    // Mock the cookies.get method
    const mockCookies = {
      get: jest.fn((name: string) => {
        if (name === "user" && userEmail) {
          return { value: JSON.stringify({ email: userEmail }) };
        }
        return undefined;
      }),
    };

    const request = new NextRequest(url.toString(), {
      method: "GET",
    });

    // Override the cookies property
    Object.defineProperty(request, "cookies", {
      value: mockCookies,
      writable: true,
    });

    return request;
  }

  describe("Authentication", () => {
    it("should require user authentication", async () => {
      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("User authentication required");
    });

    it("should handle invalid user cookie", async () => {
      const request = createRequest({});
      // Mock invalid JSON in cookie
      const mockCookies = {
        get: jest.fn(() => ({ value: "invalid-json" })),
      };
      Object.defineProperty(request, "cookies", {
        value: mockCookies,
        writable: true,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(consoleSpy.log).toHaveBeenCalledWith("No user cookie found");
    });

    it("should accept valid user cookie", async () => {
      const request = createRequest(
        { programId: "program-123" },
        "test@example.com",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Parameter validation", () => {
    it("should return 400 if no parameters provided", async () => {
      const request = createRequest({}, "test@example.com");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Missing required parameters");
    });
  });

  describe("Task evaluations", () => {
    it("should get evaluations for a specific task", async () => {
      const request = createRequest(
        { taskId: "task-123", targetType: "task" },
        "test@example.com",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockEvaluationRepo.findByTask).toHaveBeenCalledWith("task-123");
      expect(data.data).toHaveLength(1);
      expect(data.data[0].id).toBe("eval-1");
    });
  });

  describe("Program evaluations", () => {
    it("should get program-level evaluations", async () => {
      const request = createRequest(
        { programId: "program-123", targetType: "program" },
        "test@example.com",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockEvaluationRepo.findByProgram).toHaveBeenCalledWith(
        "program-123",
      );
      expect(data.data).toHaveLength(3);
    });

    it("should get task evaluations for a program", async () => {
      const request = createRequest(
        { programId: "program-123", targetType: "task" },
        "test@example.com",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockEvaluationRepo.findByProgram).toHaveBeenCalledWith(
        "program-123",
      );
      expect(data.data).toHaveLength(2); // Only task evaluations
      expect(
        data.data.every(
          (e: IEvaluation) =>
            (e.metadata as Record<string, unknown>)?.targetType === "task",
        ),
      ).toBe(true);
    });

    it("should get all evaluations for a program when no targetType specified", async () => {
      const request = createRequest(
        { programId: "program-123" },
        "test@example.com",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockEvaluationRepo.findByProgram).toHaveBeenCalledWith(
        "program-123",
      );
      expect(data.data).toHaveLength(3); // All evaluations
    });
  });

  describe("Edge cases", () => {
    it("should handle empty evaluation results", async () => {
      mockEvaluationRepo.findByProgram.mockResolvedValueOnce([]);

      const request = createRequest(
        { programId: "program-123" },
        "test@example.com",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it("should handle evaluations without metadata", async () => {
      const evaluationsWithoutMetadata = [
        { ...mockEvaluations[0], metadata: undefined },
        { ...mockEvaluations[1], metadata: null },
        { ...mockEvaluations[2], metadata: {} },
      ];
      mockEvaluationRepo.findByProgram.mockResolvedValueOnce(
        evaluationsWithoutMetadata,
      );

      const request = createRequest(
        { programId: "program-123", targetType: "task" },
        "test@example.com",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(0); // No task-type evaluations found
    });

    it("should handle evaluations with non-object metadata", async () => {
      const evaluationsWithBadMetadata = [
        { ...mockEvaluations[0], metadata: "string" as any },
        { ...mockEvaluations[1], metadata: 123 as any },
        { ...mockEvaluations[2], metadata: { targetType: "task" } },
      ];
      mockEvaluationRepo.findByProgram.mockResolvedValueOnce(
        evaluationsWithBadMetadata,
      );

      const request = createRequest(
        { programId: "program-123", targetType: "task" },
        "test@example.com",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1); // Only valid task evaluation
    });
  });

  describe("Error handling", () => {
    it("should handle repository errors gracefully", async () => {
      mockEvaluationRepo.findByProgram.mockRejectedValueOnce(
        new Error("Database error"),
      );

      const request = createRequest(
        { programId: "program-123" },
        "test@example.com",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to get evaluations");
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Error getting evaluations:",
        expect.any(Error),
      );
    });
  });

  describe("Query combinations", () => {
    it("should prioritize taskId over programId when both provided", async () => {
      const request = createRequest(
        {
          taskId: "task-123",
          programId: "program-123",
          targetType: "task",
        },
        "test@example.com",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockEvaluationRepo.findByTask).toHaveBeenCalledWith("task-123");
      expect(mockEvaluationRepo.findByProgram).not.toHaveBeenCalled();
    });

    it("should handle special characters in parameters", async () => {
      const specialProgramId = "program-123!@#$%";
      const request = createRequest(
        { programId: specialProgramId },
        "test@example.com",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockEvaluationRepo.findByProgram).toHaveBeenCalledWith(
        specialProgramId,
      );
    });
  });
});
