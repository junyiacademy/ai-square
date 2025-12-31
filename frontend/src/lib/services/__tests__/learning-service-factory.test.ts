import { describe, it, expect, jest } from "@jest/globals";

// 使用 isolateModules 確保每個測試用例重置單例與模組快取

describe("LearningServiceFactory", () => {
  it("getService('pbl'|'discovery') returns instances", async () => {
    jest.isolateModules(() => {
      // Mock PBL/Discovery 類別，暴露識別旗標
      jest.doMock("../pbl-learning-service", () => ({
        PBLLearningService: jest
          .fn()
          .mockImplementation(() => ({ __kind: "pbl" })),
      }));
      jest.doMock("../discovery-learning-service", () => ({
        DiscoveryLearningService: jest
          .fn()
          .mockImplementation(() => ({ __kind: "discovery" })),
      }));
      // Assessment 使用預設空 mock，避免影響本用例
      jest.doMock("../assessment-learning-service", () => ({
        AssessmentLearningService: jest.fn().mockImplementation(() => ({})),
      }));

      const { LearningServiceFactory } =
        require("../learning-service-factory") as typeof import("../learning-service-factory");
      const factory = LearningServiceFactory.getInstance();
      const pbl = factory.getService("pbl") as unknown as Record<
        string,
        unknown
      >;
      const discovery = factory.getService("discovery") as unknown as Record<
        string,
        unknown
      >;

      expect(pbl.__kind).toBe("pbl");
      expect(discovery.__kind).toBe("discovery");
    });
  });

  it("getService('unknown') throws", async () => {
    jest.isolateModules(() => {
      jest.doMock("../pbl-learning-service", () => ({
        PBLLearningService: jest.fn().mockImplementation(() => ({})),
      }));
      jest.doMock("../discovery-learning-service", () => ({
        DiscoveryLearningService: jest.fn().mockImplementation(() => ({})),
      }));
      jest.doMock("../assessment-learning-service", () => ({
        AssessmentLearningService: jest.fn().mockImplementation(() => ({})),
      }));

      const { LearningServiceFactory } =
        require("../learning-service-factory") as typeof import("../learning-service-factory");
      const factory = LearningServiceFactory.getInstance();

      expect(() => factory.getService("unknown" as unknown as "pbl")).toThrow(
        "Learning service for mode 'unknown' not found",
      );
    });
  });

  describe("assessment adapter behavior", () => {
    it("startLearning delegates to startAssessment with language", async () => {
      const startAssessmentMock = jest
        .fn()
        .mockImplementation(async () => ({ id: "program-1" }));

      jest.isolateModules(async () => {
        jest.doMock("../assessment-learning-service", () => ({
          AssessmentLearningService: jest.fn().mockImplementation(() => ({
            startAssessment: startAssessmentMock,
          })),
        }));
        jest.doMock("../pbl-learning-service", () => ({
          PBLLearningService: jest.fn().mockImplementation(() => ({})),
        }));
        jest.doMock("../discovery-learning-service", () => ({
          DiscoveryLearningService: jest.fn().mockImplementation(() => ({})),
        }));

        const { LearningServiceFactory } =
          require("../learning-service-factory") as typeof import("../learning-service-factory");
        const factory = LearningServiceFactory.getInstance();
        const svc = factory.getService("assessment");

        const program = await svc.startLearning("u1", "s1", {
          language: "zhTW",
        });
        expect(startAssessmentMock).toHaveBeenCalledWith("u1", "s1", "zhTW");
        expect(program).toEqual({ id: "program-1" });
      });
    });

    it("getProgress transforms fields (completedTasks/score/timeSpent/metadata)", async () => {
      const mockProgress = {
        programId: "p1",
        status: "active",
        timeSpent: 12,
        metadata: {
          answeredQuestions: 3,
          totalQuestions: 5,
          currentScore: 80,
          timeRemaining: 34,
        },
      };
      const getProgressMock = jest
        .fn()
        .mockImplementation(async () => mockProgress);

      jest.isolateModules(async () => {
        jest.doMock("../assessment-learning-service", () => ({
          AssessmentLearningService: jest.fn().mockImplementation(() => ({
            getProgress: getProgressMock,
          })),
        }));
        jest.doMock("../pbl-learning-service", () => ({
          PBLLearningService: jest.fn().mockImplementation(() => ({})),
        }));
        jest.doMock("../discovery-learning-service", () => ({
          DiscoveryLearningService: jest.fn().mockImplementation(() => ({})),
        }));

        const { LearningServiceFactory } =
          require("../learning-service-factory") as typeof import("../learning-service-factory");
        const svc =
          LearningServiceFactory.getInstance().getService("assessment");
        const res = await svc.getProgress("p1");

        expect(getProgressMock).toHaveBeenCalledWith("p1");
        expect(res).toMatchObject({
          programId: "p1",
          status: "active",
          currentTaskIndex: 0,
          totalTasks: 1,
          completedTasks: 0,
          score: 80,
          timeSpent: 12,
          estimatedTimeRemaining: 34,
          metadata: { answeredQuestions: 3, totalQuestions: 5 },
        });
      });
    });

    it("submitResponse returns success/score/feedback/nextTaskAvailable from isCorrect", async () => {
      const submitAnswerMock = jest
        .fn()
        .mockImplementation(async () => ({
          isCorrect: false,
          correctAnswer: "B",
        }));

      jest.isolateModules(async () => {
        jest.doMock("../assessment-learning-service", () => ({
          AssessmentLearningService: jest.fn().mockImplementation(() => ({
            submitAnswer: submitAnswerMock,
          })),
        }));
        jest.doMock("../pbl-learning-service", () => ({
          PBLLearningService: jest.fn().mockImplementation(() => ({})),
        }));
        jest.doMock("../discovery-learning-service", () => ({
          DiscoveryLearningService: jest.fn().mockImplementation(() => ({})),
        }));

        const { LearningServiceFactory } =
          require("../learning-service-factory") as typeof import("../learning-service-factory");
        const svc =
          LearningServiceFactory.getInstance().getService("assessment");
        const result = await svc.submitResponse("p1", "t1", {
          questionId: "q1",
          answer: "A",
        });

        expect(submitAnswerMock).toHaveBeenCalledWith("p1", "q1", "A");
        expect(result).toMatchObject({
          taskId: "t1",
          success: true,
          score: 0,
          feedback: "Incorrect. The correct answer is B",
          nextTaskAvailable: false,
        });
      });
    });

    it("completeLearning aggregates program and evaluation results", async () => {
      const completeAssessmentMock = jest.fn().mockImplementation(async () => ({
        program: { id: "p1" },
        evaluation: { id: "e1" },
        passed: true,
        score: 92,
        domainScores: { domainA: 80 },
      }));

      jest.isolateModules(async () => {
        jest.doMock("../assessment-learning-service", () => ({
          AssessmentLearningService: jest.fn().mockImplementation(() => ({
            completeAssessment: completeAssessmentMock,
          })),
        }));
        jest.doMock("../pbl-learning-service", () => ({
          PBLLearningService: jest.fn().mockImplementation(() => ({})),
        }));
        jest.doMock("../discovery-learning-service", () => ({
          DiscoveryLearningService: jest.fn().mockImplementation(() => ({})),
        }));

        const { LearningServiceFactory } =
          require("../learning-service-factory") as typeof import("../learning-service-factory");
        const svc =
          LearningServiceFactory.getInstance().getService("assessment");
        const result = await svc.completeLearning("p1");

        expect(completeAssessmentMock).toHaveBeenCalledWith("p1");
        expect(result).toMatchObject({
          program: { id: "p1" },
          evaluation: { id: "e1" },
          passed: true,
          finalScore: 92,
          metadata: { domainScores: { domainA: 80 } },
        });
      });
    });

    it("getNextTask returns null; evaluateTask throws; generateFeedback returns fixed string", async () => {
      jest.isolateModules(async () => {
        jest.doMock("../assessment-learning-service", () => ({
          AssessmentLearningService: jest.fn().mockImplementation(() => ({})),
        }));
        jest.doMock("../pbl-learning-service", () => ({
          PBLLearningService: jest.fn().mockImplementation(() => ({})),
        }));
        jest.doMock("../discovery-learning-service", () => ({
          DiscoveryLearningService: jest.fn().mockImplementation(() => ({})),
        }));

        const { LearningServiceFactory } =
          require("../learning-service-factory") as typeof import("../learning-service-factory");
        const svc =
          LearningServiceFactory.getInstance().getService("assessment");

        const next = await svc.getNextTask("p1");
        expect(next).toBeNull();

        await expect(svc.evaluateTask("t1")).rejects.toThrow(
          "Not implemented for assessment mode",
        );

        const feedback = await svc.generateFeedback("e1", "en");
        expect(feedback).toBe("Thank you for completing the assessment.");
      });
    });
  });
});
