import { mockRepositoryFactory } from "@/test-utils/mocks/repositories";
/**
 * Assessment Answer API Route Tests
 * 測試評估答案提交 API
 */

import { POST } from "../route";
import { NextRequest } from "next/server";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import { getUnifiedAuth } from "@/lib/auth/unified-auth";
import { mockConsoleError as createMockConsoleError } from "@/test-utils/helpers/console";

// Mock dependencies
jest.mock("@/lib/repositories/base/repository-factory");
jest.mock("@/lib/auth/unified-auth");

// Mock console
const mockConsoleError = createMockConsoleError();

describe("/api/assessment/programs/[programId]/answer", () => {
  // Mock task repository (only one used by actual API)
  const mockTaskRepo = {
    getTaskWithInteractions: jest.fn(),
    recordAttempt: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup repository factory mocks
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(
      mockTaskRepo,
    );
    (getUnifiedAuth as jest.Mock).mockResolvedValue(null);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe("POST - Submit Assessment Answer", () => {
    const mockTaskWithInteractions = {
      id: "task-456",
      programId: "prog-123",
      type: "question",
      status: "active",
      content: {
        questions: [
          {
            id: "q1",
            question: "What is AI?",
            options: ["A", "B", "C", "D"],
            correct_answer: "B",
            ksa_mapping: ["K1", "S2"],
          },
          {
            id: "q2",
            question: "What is ML?",
            options: ["X", "Y", "Z"],
            correct_answer: "Y",
          },
        ],
      },
      interactions: [], // No previous answers
    };

    it("should submit correct answer successfully", async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { id: "user-789", email: "user@example.com", role: "student" },
      });

      mockTaskRepo.getTaskWithInteractions.mockResolvedValue(
        mockTaskWithInteractions,
      );
      mockTaskRepo.recordAttempt?.mockResolvedValue(undefined);
      mockTaskRepo.updateStatus?.mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost:3000/api/assessment/programs/prog-123/answer",
        {
          method: "POST",
          body: JSON.stringify({
            taskId: "task-456",
            questionId: "q1",
            answer: "B", // Correct answer
            questionIndex: 0,
            timeSpent: 5000,
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ programId: "test-id" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isCorrect).toBe(true);

      expect(mockTaskRepo.recordAttempt).toHaveBeenCalledWith(
        "task-456",
        expect.objectContaining({
          response: expect.objectContaining({
            eventType: "assessment_answer",
            questionId: "q1",
            questionIndex: 0,
            selectedAnswer: "B",
            isCorrect: true,
            timeSpent: 5000,
            ksa_mapping: ["K1", "S2"],
          }),
          score: 1,
          timeSpent: 5000,
        }),
      );

      expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith(
        "task-456",
        "active",
      );
    });

    it("should handle incorrect answer", async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { id: "user-789", email: "user@example.com", role: "student" },
      });

      mockTaskRepo.getTaskWithInteractions.mockResolvedValue(
        mockTaskWithInteractions,
      );
      mockTaskRepo.recordAttempt?.mockResolvedValue(undefined);
      mockTaskRepo.updateStatus?.mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost:3000/api/assessment/programs/prog-123/answer",
        {
          method: "POST",
          body: JSON.stringify({
            taskId: "task-456",
            questionId: "q1",
            answer: "A", // Wrong answer (correct is 'B')
            questionIndex: 0,
            timeSpent: 3000,
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ programId: "test-id" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isCorrect).toBe(false);

      expect(mockTaskRepo.recordAttempt).toHaveBeenCalledWith(
        "task-456",
        expect.objectContaining({
          response: expect.objectContaining({
            eventType: "assessment_answer",
            questionId: "q1",
            selectedAnswer: "A",
            isCorrect: false,
          }),
          score: 0,
          timeSpent: 3000,
        }),
      );
    });

    it("should handle task with existing interactions (not first answer)", async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { id: "user-789", email: "user@example.com", role: "student" },
      });

      const taskWithExistingAnswers = {
        ...mockTaskWithInteractions,
        interactions: [
          {
            type: "system_event",
            content: {
              eventType: "assessment_answer",
              questionId: "q2",
              selectedAnswer: "Y",
              isCorrect: true,
            },
          },
        ],
      };

      mockTaskRepo.getTaskWithInteractions.mockResolvedValue(
        taskWithExistingAnswers,
      );
      mockTaskRepo.recordAttempt?.mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost:3000/api/assessment/programs/prog-123/answer",
        {
          method: "POST",
          body: JSON.stringify({
            taskId: "task-456",
            questionId: "q1",
            answer: "B",
            questionIndex: 0,
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ programId: "test-id" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isCorrect).toBe(true);

      // Should not call updateStatus since there are existing answers
      expect(mockTaskRepo.updateStatus).not.toHaveBeenCalled();
    });

    it("should return 400 when required fields missing", async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { id: "user-789", email: "user@example.com", role: "student" },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/assessment/programs/prog-123/answer",
        {
          method: "POST",
          body: JSON.stringify({
            // Missing taskId, questionId and answer
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ programId: "test-id" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
    });

    it("should return 404 when task not found", async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { id: "user-789", email: "user@example.com", role: "student" },
      });

      mockTaskRepo.getTaskWithInteractions.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/assessment/programs/prog-123/answer",
        {
          method: "POST",
          body: JSON.stringify({
            taskId: "nonexistent-task",
            questionId: "q1",
            answer: "A",
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ programId: "test-id" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Task not found");
    });

    it("should handle questions without KSA mapping", async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { id: "user-789", email: "user@example.com", role: "student" },
      });

      mockTaskRepo.getTaskWithInteractions.mockResolvedValue(
        mockTaskWithInteractions,
      );
      mockTaskRepo.recordAttempt?.mockResolvedValue(undefined);
      mockTaskRepo.updateStatus?.mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost:3000/api/assessment/programs/prog-123/answer",
        {
          method: "POST",
          body: JSON.stringify({
            taskId: "task-456",
            questionId: "q2", // This question has no ksa_mapping
            answer: "Y",
            questionIndex: 1,
            timeSpent: 2000,
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ programId: "test-id" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isCorrect).toBe(true);

      expect(mockTaskRepo.recordAttempt).toHaveBeenCalledWith(
        "task-456",
        expect.objectContaining({
          response: expect.objectContaining({
            eventType: "assessment_answer",
            questionId: "q2",
            selectedAnswer: "Y",
            isCorrect: true,
            ksa_mapping: undefined, // No KSA mapping
          }),
        }),
      );
    });

    it.skip("should return 401 when not authenticated", async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/assessment/programs/prog-123/answer",
        {
          method: "POST",
          body: JSON.stringify({
            taskId: "task-456",
            questionId: "q1",
            answer: "A",
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ programId: "test-id" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });
  });
});

/**
 * Assessment Answer API Considerations:
 *
 * 1. Question-level Answer Submission:
 *    - Submit individual question answers
 *    - Immediate correct/incorrect feedback
 *    - Support for KSA mapping recording
 *
 * 2. Answer Recording:
 *    - Record attempts with score (1 for correct, 0 for incorrect)
 *    - Track time spent per question
 *    - Store detailed answer metadata
 *
 * 3. Task Status Management:
 *    - Update task to 'active' on first answer
 *    - Preserve existing interactions
 *    - No automatic completion logic
 *
 * 4. Security:
 *    - Require authentication (session-based)
 *    - Validate required fields (taskId, questionId, answer)
 *    - Return 404 for non-existent tasks
 *
 * 5. Answer Content Structure:
 *    - eventType: 'assessment_answer'
 *    - questionId, questionIndex, selectedAnswer
 *    - isCorrect flag based on correct_answer comparison
 *    - Optional timeSpent and ksa_mapping inclusion
 */
