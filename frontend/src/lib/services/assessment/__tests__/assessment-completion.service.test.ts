/**
 * Tests for AssessmentCompletionService
 * Orchestrates assessment completion workflow
 */

import {
  AssessmentCompletionService,
  type EvaluationData,
} from "../assessment-completion.service";
import type { ITask, IProgram, IEvaluation } from "@/types/unified-learning";
import type { AssessmentQuestion, DomainScore } from "@/types/assessment-types";

// Mock repositories
const mockTaskRepo = {
  findByProgram: jest.fn(),
  updateStatus: jest.fn(),
};

const mockProgramRepo = {
  findById: jest.fn(),
  update: jest.fn(),
};

const mockEvaluationRepo = {
  findByProgram: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
};

const mockUserRepo = {
  findByEmail: jest.fn(),
};

describe("AssessmentCompletionService", () => {
  let service: AssessmentCompletionService;

  beforeEach(() => {
    service = new AssessmentCompletionService(
      mockTaskRepo as never,
      mockProgramRepo as never,
      mockEvaluationRepo as never,
      mockUserRepo as never,
    );
    jest.clearAllMocks();
  });

  describe("validateCompletion", () => {
    it("should return existing evaluation if program already completed", async () => {
      const program: Partial<IProgram> = {
        id: "prog1",
        status: "completed",
        metadata: { evaluationId: "eval1" },
      };

      const existingEval: Partial<IEvaluation> = {
        id: "eval1",
        score: 85,
      };

      mockEvaluationRepo.findById = jest.fn().mockResolvedValue(existingEval);

      const result = await service.validateCompletion(program as IProgram);

      expect(result).not.toBeNull();
      expect(result?.alreadyCompleted).toBe(true);
      expect(result?.evaluationId).toBe("eval1");
      expect(result?.score).toBe(85);
    });

    it("should find existing assessment evaluation", async () => {
      const program: Partial<IProgram> = {
        id: "prog1",
        status: "active" as const,
      };

      const existingEvals = [
        { id: "eval1", evaluationType: "assessment_complete", score: 90 },
      ];

      mockEvaluationRepo.findByProgram = jest
        .fn()
        .mockResolvedValue(existingEvals);
      mockProgramRepo.update = jest.fn().mockResolvedValue(undefined);

      const result = await service.validateCompletion(program as IProgram);

      expect(result).not.toBeNull();
      expect(result?.alreadyCompleted).toBe(true);
      expect(result?.evaluationId).toBe("eval1");
      expect(mockProgramRepo.update).toHaveBeenCalled();
    });

    it("should return null if no existing evaluation", async () => {
      const program: Partial<IProgram> = {
        id: "prog1",
        status: "active" as const,
      };

      mockEvaluationRepo.findByProgram = jest.fn().mockResolvedValue([]);

      const result = await service.validateCompletion(program as IProgram);

      expect(result).toBeNull();
    });
  });

  describe("checkAssessmentCompletion", () => {
    it("should validate all questions answered", async () => {
      const tasks: Partial<ITask>[] = [
        {
          id: "task1",
          content: {
            questions: [
              { id: "q1", question: "Q1" },
              { id: "q2", question: "Q2" },
            ] as AssessmentQuestion[],
          },
          interactions: [
            {
              timestamp: "2024-01-01T00:00:00Z",
              type: "system_event",
              content: {
                eventType: "assessment_answer",
                questionId: "q1",
              },
            },
            {
              timestamp: "2024-01-01T00:01:00Z",
              type: "system_event",
              content: {
                eventType: "assessment_answer",
                questionId: "q2",
              },
            },
          ],
        },
      ];

      const result = await service.checkAssessmentCompletion(tasks as ITask[]);

      expect(result.isComplete).toBe(true);
      expect(result.totalQuestions).toBe(2);
      expect(result.answeredQuestions).toBe(2);
    });

    it("should detect incomplete assessment", async () => {
      const tasks: Partial<ITask>[] = [
        {
          id: "task1",
          content: {
            questions: [
              { id: "q1", question: "Q1" },
              { id: "q2", question: "Q2" },
            ] as AssessmentQuestion[],
          },
          interactions: [
            {
              timestamp: "2024-01-01T00:00:00Z",
              type: "system_event",
              content: {
                eventType: "assessment_answer",
                questionId: "q1",
              },
            },
          ],
        },
      ];

      const result = await service.checkAssessmentCompletion(tasks as ITask[]);

      expect(result.isComplete).toBe(false);
      expect(result.totalQuestions).toBe(2);
      expect(result.answeredQuestions).toBe(1);
      expect(result.missingQuestions).toBe(1);
    });

    it("should handle tasks without interactions", async () => {
      const tasks: Partial<ITask>[] = [
        {
          id: "task1",
          content: {
            questions: [{ id: "q1", question: "Q1" }] as AssessmentQuestion[],
          },
          interactions: undefined,
        },
      ];

      const result = await service.checkAssessmentCompletion(tasks as ITask[]);

      expect(result.isComplete).toBe(false);
      expect(result.answeredQuestions).toBe(0);
    });
  });

  describe("collectQuestionsAndAnswers", () => {
    it("should collect from task content and metadata", async () => {
      const tasks: Partial<ITask>[] = [
        {
          id: "task1",
          content: {
            questions: [
              {
                id: "q1",
                domainId: "engaging_with_ai",
                question: "Q1",
                options: { a: "A" },
                difficulty: "easy",
                correct_answer: "a",
                explanation: "Exp",
              },
            ],
          },
          interactions: [
            {
              timestamp: "2024-01-01T00:00:00Z",
              type: "system_event",
              content: {
                eventType: "assessment_answer",
                questionId: "q1",
                isCorrect: true,
              },
            },
          ],
        },
        {
          id: "task2",
          metadata: {
            questions: [
              {
                id: "q2",
                domain: "creating_with_ai",
                question: "Q2",
                options: { a: "A" },
                difficulty: "easy",
                correct_answer: "a",
                explanation: "Exp",
              },
            ],
          },
          interactions: [
            {
              timestamp: "2024-01-01T00:01:00Z",
              type: "system_event",
              content: {
                eventType: "assessment_answer",
                questionId: "q2",
                isCorrect: false,
                selectedAnswer: "b",
                timeSpent: 10,
              },
            },
          ],
        },
      ];

      const result = await service.collectQuestionsAndAnswers(tasks as ITask[]);

      expect(result.questions.length).toBe(2);
      expect(result.answers.length).toBe(2);
      expect(result.questions[0].domain).toBe("engaging_with_ai"); // domainId mapped to domain
      expect(result.questions[1].domain).toBe("creating_with_ai");
    });

    it("should handle empty tasks", async () => {
      const result = await service.collectQuestionsAndAnswers([]);

      expect(result.questions).toEqual([]);
      expect(result.answers).toEqual([]);
    });
  });

  describe("completeAllTasks", () => {
    it("should update status for incomplete tasks", async () => {
      const tasks: Partial<ITask>[] = [
        { id: "task1", status: "active" as const },
        { id: "task2", status: "completed" as const },
        { id: "task3", status: "pending" as const },
      ];

      await service.completeAllTasks(tasks as ITask[]);

      expect(mockTaskRepo.updateStatus).toHaveBeenCalledTimes(2);
      expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith(
        "task1",
        "completed",
      );
      expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith(
        "task3",
        "completed",
      );
    });

    it("should handle empty task list", async () => {
      await service.completeAllTasks([]);
      expect(mockTaskRepo.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe("createEvaluation", () => {
    it("should create evaluation with correct structure", async () => {
      const mockEval = { id: "eval1", score: 85 };
      mockEvaluationRepo.create = jest.fn().mockResolvedValue(mockEval);

      const evaluationData: EvaluationData = {
        userId: "user1",
        programId: "prog1",
        score: 85,
        totalQuestions: 10,
        correctAnswers: 8,
        level: "advanced",
        completionTime: 300,
        recommendations: ["rec1", "rec2"],
        domainScores: new Map([
          [
            "engaging_with_ai",
            {
              domain: "engaging_with_ai",
              totalQuestions: 10,
              correctAnswers: 8,
              score: 80,
              competencies: new Set(),
              ksa: {
                knowledge: new Set(),
                skills: new Set(),
                attitudes: new Set(),
              },
            },
          ],
        ]),
        ksaAnalysis: {
          knowledge: { score: 85, strong: ["k1"], weak: ["k2"] },
          skills: { score: 80, strong: ["s1"], weak: ["s2"] },
          attitudes: { score: 90, strong: ["a1"], weak: ["a2"] },
        },
        feedbackText: "Great job!",
      };

      const result = await service.createEvaluation(evaluationData);

      expect(result.id).toBe("eval1");
      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user1",
          programId: "prog1",
          score: 85,
          mode: "assessment",
          evaluationType: "assessment_complete",
        }),
      );
    });
  });

  describe("updateProgramCompletion", () => {
    it("should update program with evaluation metadata", async () => {
      const program: Partial<IProgram> = {
        id: "prog1",
        metadata: { someKey: "someValue" },
      };

      await service.updateProgramCompletion(
        program as IProgram,
        "eval1",
        85,
        300,
      );

      expect(mockProgramRepo.update).toHaveBeenCalledWith("prog1", {
        metadata: expect.objectContaining({
          someKey: "someValue",
          score: 85,
          completionTime: 300,
          evaluationId: "eval1",
        }),
      });

      expect(mockProgramRepo.update).toHaveBeenCalledWith("prog1", {
        status: "completed",
      });
    });
  });

  describe("calculateCompletionTime", () => {
    it("should calculate time from metadata.createdAt", () => {
      const program: Partial<IProgram> = {
        metadata: { createdAt: Date.now() - 60000 }, // 60 seconds ago
      };

      const time = service.calculateCompletionTime(program as IProgram);

      expect(time).toBeGreaterThanOrEqual(60);
      expect(time).toBeLessThan(65); // Allow small variance
    });

    it("should fallback to startedAt", () => {
      const program: Partial<IProgram> = {
        startedAt: new Date(Date.now() - 120000).toISOString(), // 120 seconds ago
      };

      const time = service.calculateCompletionTime(program as IProgram);

      expect(time).toBeGreaterThanOrEqual(120);
      expect(time).toBeLessThan(125);
    });

    it("should fallback to createdAt", () => {
      const program: Partial<IProgram> = {
        createdAt: new Date(Date.now() - 180000).toISOString(),
      };

      const time = service.calculateCompletionTime(program as IProgram);

      expect(time).toBeGreaterThanOrEqual(180);
    });

    it("should use Date.now() as fallback if no timestamp available", () => {
      const program: Partial<IProgram> = {};

      const time = service.calculateCompletionTime(program as IProgram);

      // Should be very close to 0 since it uses Date.now() as start time
      expect(time).toBeGreaterThanOrEqual(0);
      expect(time).toBeLessThan(5); // Should complete within 5 seconds
    });
  });
});
