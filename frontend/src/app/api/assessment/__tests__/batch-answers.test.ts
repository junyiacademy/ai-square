import { mockRepositoryFactory } from "@/test-utils/mocks/repositories";
import { NextRequest } from "next/server";
import { getUnifiedAuth } from "@/lib/auth/unified-auth";

// Mock dependencies before imports
jest.mock("@/lib/repositories/base/repository-factory");
jest.mock("@/lib/auth/unified-auth", () => ({
  getUnifiedAuth: jest.fn(),
  createUnauthorizedResponse: jest.fn(() => ({
    status: 401,
    json: jest.fn().mockResolvedValue({ error: "Authentication required" }),
    text: jest.fn().mockResolvedValue('{"error":"Authentication required"}'),
  })),
}));

// Import after mocking to ensure mocks are applied
import { POST } from "../programs/[programId]/batch-answers/route";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";

describe("POST /api/assessment/programs/[programId]/batch-answers", () => {
  const mockTaskRepo = {
    findById: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(
      mockTaskRepo,
    );
    (getUnifiedAuth as jest.Mock).mockResolvedValue({
      user: { email: "test@example.com" },
    });
  });

  it("should submit batch answers successfully", async () => {
    const mockTask = {
      id: "task-123",
      status: "pending",
      interactions: [],
      content: {
        questions: [
          {
            id: "q1",
            correct_answer: "A",
            ksa_mapping: { knowledge: ["K1"] },
          },
          {
            id: "q2",
            correct_answer: "B",
          },
        ],
      },
      metadata: {},
    };

    mockTaskRepo.findById.mockResolvedValue(mockTask);
    mockTaskRepo.update.mockResolvedValue({ ...mockTask, interactions: [] });

    const request = new NextRequest(
      "http://localhost/api/assessment/programs/123/batch-answers",
      {
        method: "POST",
        body: JSON.stringify({
          taskId: "task-123",
          answers: [
            { questionId: "q1", answer: "A", timeSpent: 30 },
            { questionId: "q2", answer: "C", timeSpent: 45 },
          ],
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ programId: "123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.submitted).toBe(2);

    // Verify interactions were created correctly
    expect(mockTaskRepo.update).toHaveBeenCalledWith(
      "task-123",
      expect.objectContaining({
        interactions: expect.arrayContaining([
          expect.objectContaining({
            type: "system_event",
            content: expect.objectContaining({
              eventType: "assessment_answer",
              questionId: "q1",
              selectedAnswer: "A",
              isCorrect: true,
            }),
          }),
          expect.objectContaining({
            type: "system_event",
            content: expect.objectContaining({
              eventType: "assessment_answer",
              questionId: "q2",
              selectedAnswer: "C",
              isCorrect: false,
            }),
          }),
        ]),
      }),
    );
  });

  it("should handle authentication via query params", async () => {
    (getUnifiedAuth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/assessment/programs/123/batch-answers?userEmail=test@example.com",
      {
        method: "POST",
        body: JSON.stringify({
          taskId: "task-123",
          answers: [],
        }),
      },
    );

    mockTaskRepo.findById.mockResolvedValue({
      id: "task-123",
      interactions: [],
      content: { questions: [] },
      metadata: {},
    });

    const response = await POST(request, {
      params: Promise.resolve({ programId: "123" }),
    });

    expect(response.status).toBe(200);
  });

  it("should return 401 when no authentication", async () => {
    (getUnifiedAuth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/assessment/programs/123/batch-answers",
      {
        method: "POST",
        body: JSON.stringify({
          taskId: "task-123",
          answers: [],
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ programId: "123" }),
    });

    expect(response.status).toBe(401);

    // Handle both Response and NextResponse objects
    const data = await response.json();
    expect(data.error).toBe("Authentication required");
  });

  it("should handle missing required fields", async () => {
    const request = new NextRequest(
      "http://localhost/api/assessment/programs/123/batch-answers",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ programId: "123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required fields");
  });

  it("should update task status from pending to active", async () => {
    mockTaskRepo.findById.mockResolvedValue({
      id: "task-123",
      status: "pending",
      interactions: [],
      content: { questions: [] },
      metadata: {},
    });

    const request = new NextRequest(
      "http://localhost/api/assessment/programs/123/batch-answers",
      {
        method: "POST",
        body: JSON.stringify({
          taskId: "task-123",
          answers: [],
        }),
      },
    );

    await POST(request, { params: Promise.resolve({ programId: "123" }) });

    expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith(
      "task-123",
      "active",
    );
  });
});
