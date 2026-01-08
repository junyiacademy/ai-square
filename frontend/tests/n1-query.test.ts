/**
 * N+1 Query Detection Tests
 * 偵測和防止 N+1 查詢問題
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  createUsers,
  createProgram,
  createScenario,
  createLearningPath,
  QueryCounter,
  createProgramWithRelations,
} from "./factories";

describe("N+1 Query Detection", () => {
  let queryCounter: QueryCounter;

  beforeEach(() => {
    queryCounter = new QueryCounter();
  });

  describe("API Route: /api/assessment/results", () => {
    it("should detect N+1 problem when fetching programs with scenarios", async () => {
      // Arrange - 建立測試資料
      const programCount = 10;
      const users = createUsers(3);
      const programs: ReturnType<typeof createProgram>[] = [];
      const scenarios: ReturnType<typeof createScenario>[] = [];

      // 為每個 program 建立對應的 scenario
      for (let i = 0; i < programCount; i++) {
        const scenario = createScenario({
          id: `scenario-${i}`,
          title: { en: `Scenario ${i}` },
        });
        scenarios.push(scenario);

        const program = createProgram({
          id: `program-${i}`,
          userId: users[i % 3].id,
          scenarioId: scenario.id,
        });
        programs.push(program);
      }

      // Mock repository
      const mockProgramRepo = {
        findByUser: jest.fn(() => Promise.resolve(programs)),
        findAll: jest.fn(() => Promise.resolve(programs)),
      };

      const mockScenarioRepo = {
        findById: jest.fn((id: string) => {
          queryCounter.increment(`SELECT * FROM scenarios WHERE id = '${id}'`);
          return Promise.resolve(scenarios.find((s) => s.id === id));
        }),
      };

      // Act - 模擬 API route 的邏輯 (現有的 N+1 問題)
      const enrichedPrograms = await Promise.all(
        programs.map(async (program) => {
          const scenario = await mockScenarioRepo.findById(program.scenarioId);
          return {
            ...program,
            scenario,
          };
        }),
      );

      // Assert - 偵測 N+1 問題
      expect(queryCounter.getCount()).toBe(programCount); // 10 次查詢！
      expect(() => queryCounter.assertNoN1(3)).toThrow(/N\+1 query detected/);
    });

    it("should avoid N+1 with batch loading", async () => {
      // Arrange
      const programCount = 10;
      const programs: ReturnType<typeof createProgram>[] = [];
      const scenarios: ReturnType<typeof createScenario>[] = [];
      const scenarioMap = new Map();

      for (let i = 0; i < programCount; i++) {
        const scenario = createScenario({
          id: `scenario-${i}`,
          title: { en: `Scenario ${i}` },
        });
        scenarios.push(scenario);
        scenarioMap.set(scenario.id, scenario);

        const program = createProgram({
          id: `program-${i}`,
          scenarioId: scenario.id,
        });
        programs.push(program);
      }

      // Mock optimized repository with batch loading
      const mockScenarioRepo = {
        findByIds: jest.fn((ids: string[]) => {
          queryCounter.increment(
            `SELECT * FROM scenarios WHERE id IN (${ids.join(",")})`,
          );
          return Promise.resolve(
            ids.map((id) => scenarioMap.get(id)).filter(Boolean),
          );
        }),
      };

      // Act - 優化後的邏輯 (批次載入)
      const scenarioIds = [...new Set(programs.map((p) => p.scenarioId))];
      const scenariosResult = await mockScenarioRepo.findByIds(scenarioIds);
      const scenarioMapResult = new Map(scenariosResult.map((s) => [s.id, s]));

      const enrichedPrograms = programs.map((program) => ({
        ...program,
        scenario: scenarioMapResult.get(program.scenarioId),
      }));

      // Assert - 只有 1 次查詢！
      expect(queryCounter.getCount()).toBe(1);
      queryCounter.assertNoN1(3); // 不會拋出錯誤
      expect(enrichedPrograms).toHaveLength(programCount);
      expect(enrichedPrograms[0].scenario).toBeDefined();
    });
  });

  describe("Program-User-Scenario Relationships", () => {
    it("should detect N+1 when loading users for programs", async () => {
      // Arrange
      const programsWithRelations = Array.from({ length: 15 }, (_, i) =>
        createProgramWithRelations({
          program: { id: `prog-${i}` },
          user: { id: `user-${i}`, name: `User ${i}` },
          scenario: { id: `scenario-${i}` },
        }),
      );

      const programs = programsWithRelations.map((p) => p.program);
      const users = programsWithRelations.map((p) => p.user);

      // Mock repositories
      const mockUserRepo = {
        findById: jest.fn((id: string) => {
          queryCounter.increment(`SELECT * FROM users WHERE id = '${id}'`);
          return Promise.resolve(users.find((u) => u.id === id));
        }),
      };

      // Act - N+1 問題
      const programsWithUsers = await Promise.all(
        programs.map(async (program) => {
          const user = await mockUserRepo.findById(program.userId);
          return { ...program, user };
        }),
      );

      // Assert
      expect(queryCounter.getCount()).toBe(15); // N+1 detected!
      expect(() => queryCounter.assertNoN1(3)).toThrow();
    });

    it("should use include/join to avoid N+1", async () => {
      // Arrange
      const programsWithRelations = Array.from({ length: 15 }, (_, i) =>
        createProgramWithRelations({
          program: { id: `prog-${i}` },
          user: { id: `user-${i}`, name: `User ${i}` },
          scenario: { id: `scenario-${i}` },
        }),
      );

      // Mock optimized repository with JOIN
      const mockProgramRepo = {
        findAllWithRelations: jest.fn(() => {
          queryCounter.increment(
            `SELECT p.*, u.*, s.* FROM programs p
             LEFT JOIN users u ON p.user_id = u.id
             LEFT JOIN scenarios s ON p.scenario_id = s.id`,
          );
          return Promise.resolve(programsWithRelations);
        }),
      };

      // Act - 使用 JOIN 優化
      const result = await mockProgramRepo.findAllWithRelations();

      // Assert - 只有 1 次查詢！
      expect(queryCounter.getCount()).toBe(1);
      queryCounter.assertNoN1(3);
      expect(result).toHaveLength(15);
      expect(result[0].user).toBeDefined();
      expect(result[0].scenario).toBeDefined();
    });
  });

  describe("Task-Evaluation Relationships", () => {
    it("should detect N+1 when loading evaluations for tasks", async () => {
      // Arrange
      const learningPath = createLearningPath(20); // 20 tasks
      const { tasks, evaluations } = learningPath;

      const mockEvaluationRepo = {
        findByTaskId: jest.fn((taskId: string) => {
          queryCounter.increment(
            `SELECT * FROM evaluations WHERE task_id = '${taskId}'`,
          );
          return Promise.resolve(
            evaluations.filter((e) => e.taskId === taskId),
          );
        }),
      };

      // Act - N+1 問題
      const tasksWithEvaluations = await Promise.all(
        tasks.map(async (task) => {
          const taskEvaluations = await mockEvaluationRepo.findByTaskId(
            task.id,
          );
          return { ...task, evaluations: taskEvaluations };
        }),
      );

      // Assert
      expect(queryCounter.getCount()).toBe(20); // N+1!
      expect(() => queryCounter.assertNoN1(3)).toThrow(/N\+1 query detected/);
    });

    it("should batch load evaluations to avoid N+1", async () => {
      // Arrange
      const learningPath = createLearningPath(20);
      const { tasks, evaluations } = learningPath;

      const mockEvaluationRepo = {
        findByTaskIds: jest.fn((taskIds: string[]) => {
          queryCounter.increment(
            `SELECT * FROM evaluations WHERE task_id IN (${taskIds.join(",")})`,
          );
          return Promise.resolve(
            evaluations.filter((e) => taskIds.includes(e.taskId)),
          );
        }),
      };

      // Act - 批次載入優化
      const taskIds = tasks.map((t) => t.id);
      const allEvaluations = await mockEvaluationRepo.findByTaskIds(taskIds);

      // Group evaluations by task
      const evaluationsByTask = allEvaluations.reduce(
        (acc, evaluation) => {
          if (!acc[evaluation.taskId]) acc[evaluation.taskId] = [];
          acc[evaluation.taskId].push(evaluation);
          return acc;
        },
        {} as Record<string, typeof evaluations>,
      );

      const tasksWithEvaluations = tasks.map((task) => ({
        ...task,
        evaluations: evaluationsByTask[task.id] || [],
      }));

      // Assert
      expect(queryCounter.getCount()).toBe(1); // 只有 1 次查詢！
      queryCounter.assertNoN1(3);
      expect(tasksWithEvaluations).toHaveLength(20);
    });
  });
});

// Helper function to create mock Prisma with query counting
export function createMockPrismaWithQueryCounter(queryCounter: QueryCounter) {
  return {
    program: {
      findMany: jest.fn(({ include }: any) => {
        if (include?.user && include?.scenario) {
          // Good: Single query with JOIN
          queryCounter.increment("SELECT with JOIN on users and scenarios");
        } else {
          // Bad: Will need additional queries
          queryCounter.increment("SELECT from programs only");
        }
        return Promise.resolve([]);
      }),
    },
    scenario: {
      findMany: jest.fn(({ where }: any) => {
        if (where?.id?.in) {
          // Good: Batch query
          queryCounter.increment(
            `SELECT with IN clause: ${where.id.in.length} ids`,
          );
        } else {
          // Bad: Individual query
          queryCounter.increment("SELECT single scenario");
        }
        return Promise.resolve([]);
      }),
    },
  };
}
