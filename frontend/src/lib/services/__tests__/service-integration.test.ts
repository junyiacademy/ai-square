/**
 * Integration test for all three learning services
 * Following TDD approach
 */

import { learningServiceFactory } from "../learning-service-factory";

describe("Learning Service Integration", () => {
  describe("Service Factory", () => {
    it("should provide Assessment service", () => {
      const service = learningServiceFactory.getService("assessment");
      expect(service).toBeDefined();
      expect(typeof service.startLearning).toBe("function");
      expect(typeof service.submitResponse).toBe("function");
      expect(typeof service.completeLearning).toBe("function");
    });

    it("should provide PBL service", () => {
      const service = learningServiceFactory.getService("pbl");
      expect(service).toBeDefined();
      expect(typeof service.startLearning).toBe("function");
      expect(typeof service.submitResponse).toBe("function");
      expect(typeof service.completeLearning).toBe("function");
    });

    it("should provide Discovery service", () => {
      const service = learningServiceFactory.getService("discovery");
      expect(service).toBeDefined();
      expect(typeof service.startLearning).toBe("function");
      expect(typeof service.submitResponse).toBe("function");
      expect(typeof service.completeLearning).toBe("function");
    });

    it("should throw error for unsupported mode", () => {
      expect(() => {
        learningServiceFactory.getService("invalid" as any);
      }).toThrow("Learning service for mode 'invalid' not found");
    });
  });

  describe("Unified Interface", () => {
    const modes = ["assessment", "pbl", "discovery"] as const;

    modes.forEach((mode) => {
      describe(`${mode} service`, () => {
        let service: any;

        beforeEach(() => {
          service = learningServiceFactory.getService(mode);
        });

        it("should implement BaseLearningService interface", () => {
          expect(service).toHaveProperty("startLearning");
          expect(service).toHaveProperty("getProgress");
          expect(service).toHaveProperty("submitResponse");
          expect(service).toHaveProperty("completeLearning");
          expect(service).toHaveProperty("getNextTask");
          expect(service).toHaveProperty("evaluateTask");
          expect(service).toHaveProperty("generateFeedback");
        });

        it("should have correct method signatures", () => {
          expect(typeof service.startLearning).toBe("function");
          expect(service.startLearning.length).toBeGreaterThanOrEqual(2); // userId, scenarioId, options?

          expect(typeof service.getProgress).toBe("function");
          expect(service.getProgress.length).toBe(1); // programId

          expect(typeof service.submitResponse).toBe("function");
          expect(service.submitResponse.length).toBe(3); // programId, taskId, response

          expect(typeof service.completeLearning).toBe("function");
          expect(service.completeLearning.length).toBe(1); // programId

          expect(typeof service.getNextTask).toBe("function");
          expect(service.getNextTask.length).toBe(1); // programId

          expect(typeof service.evaluateTask).toBe("function");
          expect(service.evaluateTask.length).toBe(1); // taskId

          expect(typeof service.generateFeedback).toBe("function");
          expect(service.generateFeedback.length).toBe(2); // evaluationId, language
        });
      });
    });
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const factory1 = learningServiceFactory;
      const factory2 = learningServiceFactory;
      expect(factory1).toBe(factory2);
    });

    it("should return the same service instances", () => {
      const service1 = learningServiceFactory.getService("assessment");
      const service2 = learningServiceFactory.getService("assessment");
      expect(service1).toBe(service2);
    });
  });
});
