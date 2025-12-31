import { mockRepositoryFactory } from "@/test-utils/mocks/repositories";
import { POST } from "../programs/[programId]/complete/route";
import { NextRequest } from "next/server";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import { getUnifiedAuth } from "@/lib/auth/unified-auth";

// Mock dependencies
jest.mock("@/lib/repositories/base/repository-factory");
jest.mock("@/lib/auth/unified-auth");

describe("POST /api/assessment/programs/[programId]/complete", () => {
  const mockProgramRepo = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockTaskRepo = {
    findByProgram: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockEvaluationRepo = {
    findById: jest.fn(),
    findByProgram: jest.fn(),
    create: jest.fn(),
  };

  const mockUserRepo = {
    findByEmail: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(
      mockProgramRepo,
    );
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(
      mockTaskRepo,
    );
    (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(
      mockEvaluationRepo,
    );
    (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(
      mockUserRepo,
    );
    (getUnifiedAuth as jest.Mock).mockResolvedValue({
      user: { email: "test@example.com" },
    });
  });

  it("should complete assessment and create evaluation", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockProgram = {
      id: "program-123",
      userId: "user-123",
      status: "active",
      metadata: {},
    };

    const mockTasks = [
      {
        id: "task-1",
        content: {
          questions: [
            {
              id: "q1",
              domain: "engaging_with_ai",
              correct_answer: "A",
              ksa_mapping: { knowledge: ["K1"] },
            },
          ],
        },
        interactions: [
          {
            type: "system_event",
            content: {
              eventType: "assessment_answer",
              questionId: "q1",
              selectedAnswer: "A",
              isCorrect: true,
              timeSpent: 30,
            },
          },
        ],
      },
    ];

    const mockEvaluation = {
      id: "eval-123",
      score: 100,
      programId: "program-123",
    };

    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);
    mockEvaluationRepo.findByProgram.mockResolvedValue([]);
    mockEvaluationRepo.create.mockResolvedValue(mockEvaluation);

    const request = new NextRequest(
      "http://localhost/api/assessment/programs/program-123/complete",
      {
        method: "POST",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ programId: "program-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.evaluationId).toBe("eval-123");
    expect(data.score).toBe(100);

    // Verify evaluation was created with correct data
    expect(mockEvaluationRepo.create).toHaveBeenCalled();
    const evaluationCall = mockEvaluationRepo.create.mock.calls[0][0];
    expect(evaluationCall).toMatchObject({
      userId: "user-123",
      programId: "program-123",
      mode: "assessment",
      evaluationType: "assessment_complete", // Updated to match fix
      // evaluationSubtype not checked due to staging compatibility
      score: 100,
    });
    expect(evaluationCall.metadata).toMatchObject({
      totalQuestions: 1,
      correctAnswers: 1,
    });

    // Verify program was updated
    expect(mockProgramRepo.update).toHaveBeenCalledWith(
      "program-123",
      expect.objectContaining({
        status: "completed",
      }),
    );
  });

  it("should return existing evaluation if already completed", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockProgram = {
      id: "program-123",
      userId: "user-123",
      status: "completed",
      metadata: { evaluationId: "eval-existing" },
    };

    const mockExistingEvaluation = {
      id: "eval-existing",
      score: 85,
    };

    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    mockEvaluationRepo.findById.mockResolvedValue(mockExistingEvaluation);

    const request = new NextRequest(
      "http://localhost/api/assessment/programs/program-123/complete",
      {
        method: "POST",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ programId: "program-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.evaluationId).toBe("eval-existing");
    expect(data.score).toBe(85);
    expect(data.alreadyCompleted).toBe(true);
  });

  it("should handle incomplete assessment", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockProgram = {
      id: "program-123",
      userId: "user-123",
      status: "active",
      metadata: {},
    };

    const mockTasks = [
      {
        id: "task-1",
        content: {
          questions: [{ id: "q1" }, { id: "q2" }],
        },
        interactions: [
          {
            type: "system_event",
            content: {
              eventType: "assessment_answer",
              questionId: "q1",
              selectedAnswer: "A",
            },
          },
        ],
      },
    ];

    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);
    mockEvaluationRepo.findByProgram.mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost/api/assessment/programs/program-123/complete",
      {
        method: "POST",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ programId: "program-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Assessment incomplete");
    expect(data.details).toEqual({
      totalQuestions: 2,
      answeredQuestions: 1,
      missingQuestions: 1,
    });
  });

  it("should calculate domain scores correctly", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockProgram = {
      id: "program-123",
      userId: "user-123",
      status: "active",
      metadata: {},
      createdAt: new Date().toISOString(),
    };

    const mockTasks = [
      {
        id: "task-1",
        content: {
          questions: [
            {
              id: "q1",
              domain: "engaging_with_ai",
              correct_answer: "A",
              ksa_mapping: { knowledge: ["K1"], skills: ["S1"] },
            },
            {
              id: "q2",
              domain: "engaging_with_ai",
              correct_answer: "B",
              ksa_mapping: { knowledge: ["K2"] },
            },
            {
              id: "q3",
              domain: "creating_with_ai",
              correct_answer: "C",
              ksa_mapping: { skills: ["S2"] },
            },
          ],
        },
        interactions: [
          {
            type: "system_event",
            content: {
              eventType: "assessment_answer",
              questionId: "q1",
              selectedAnswer: "A",
              isCorrect: true,
            },
          },
          {
            type: "system_event",
            content: {
              eventType: "assessment_answer",
              questionId: "q2",
              selectedAnswer: "D",
              isCorrect: false,
            },
          },
          {
            type: "system_event",
            content: {
              eventType: "assessment_answer",
              questionId: "q3",
              selectedAnswer: "C",
              isCorrect: true,
            },
          },
        ],
      },
    ];

    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);
    mockEvaluationRepo.findByProgram.mockResolvedValue([]);
    mockEvaluationRepo.create.mockResolvedValue({ id: "eval-123", score: 67 });

    const request = new NextRequest(
      "http://localhost/api/assessment/programs/program-123/complete",
      {
        method: "POST",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ programId: "program-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.score).toBe(67); // 2 out of 3 correct

    const createCall = mockEvaluationRepo.create.mock.calls[0][0];
    expect(createCall.domainScores).toEqual({
      engaging_with_ai: 50, // 1 out of 2
      creating_with_ai: 100, // 1 out of 1
      managing_with_ai: 0, // No questions
      designing_with_ai: 0, // No questions
    });
  });
});
